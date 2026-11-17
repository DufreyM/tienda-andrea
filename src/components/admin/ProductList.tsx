import { useEffect, useMemo, useState } from 'preact/hooks';
import { publicImageUrl } from '../../lib/config';
import { formatPrice } from '../../lib/format';
import { friendlyError } from '../../lib/browser/errors';
import { removeFiles, sb } from '../../lib/browser/supabase';
import type { Availability, Status } from '../../lib/types';
import Icon from '../Icon';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toasts';

interface Row {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  presentation: string | null;
  status: Status;
  availability: Availability;
  featured: boolean;
  price: number | null;
  currency: string | null;
  review_notes: string | null;
  updated_at: string;
  category: { name: string } | null;
  images: { thumb_path: string; alt: string; position: number }[];
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FILTER_KEY = 'admin-productos-filtro';

export default function ProductList() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? '{}');
    } catch {
      return {};
    }
  })();
  const [query, setQuery] = useState<string>(saved.query ?? '');
  const [statusFilter, setStatusFilter] = useState<'todos' | Status>(saved.status ?? 'todos');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoadError(null);
    const { data, error } = await sb()
      .from('products')
      .select(
        'id,name,slug,brand,presentation,status,availability,featured,price,currency,review_notes,updated_at,' +
          'category:categories(name),images:product_images(thumb_path,alt,position)',
      )
      .order('updated_at', { ascending: false });
    if (error) {
      setLoadError(friendlyError(error, 'No pudimos cargar los productos.'));
      return;
    }
    setRows(data as unknown as Row[]);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({ query, status: statusFilter }));
    } catch {}
  }, [query, statusFilter]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = normalize(query.trim());
    return rows.filter(
      (r) =>
        (statusFilter === 'todos' || r.status === statusFilter) &&
        (!q || normalize(`${r.name} ${r.brand ?? ''} ${r.presentation ?? ''}`).includes(q)),
    );
  }, [rows, query, statusFilter]);

  const counts = useMemo(() => {
    const all = rows ?? [];
    return {
      todos: all.length,
      publicado: all.filter((r) => r.status === 'publicado').length,
      borrador: all.filter((r) => r.status === 'borrador').length,
    };
  }, [rows]);

  const update = async (row: Row, patch: Partial<Pick<Row, 'status' | 'availability' | 'featured'>>, okText: string) => {
    setBusyId(row.id);
    const { error } = await sb().from('products').update(patch).eq('id', row.id);
    setBusyId(null);
    if (error) {
      toast('error', `«${row.name}»: ${friendlyError(error)}`);
      return;
    }
    setRows((rs) => rs?.map((r) => (r.id === row.id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r)) ?? null);
    toast('ok', okText);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { data, error } = await sb().rpc('delete_product', { p_id: toDelete.id });
    if (error) {
      setDeleting(false);
      toast('error', friendlyError(error, 'No pudimos eliminar el producto.'));
      return;
    }
    const orphanPaths: string[] = data?.orphan_paths ?? [];
    const cleaned = await removeFiles(orphanPaths);
    setRows((rs) => rs?.filter((r) => r.id !== toDelete.id) ?? null);
    toast(
      'ok',
      cleaned
        ? `Se eliminó «${toDelete.name}».`
        : `Se eliminó «${toDelete.name}». Algunas imágenes no se pudieron borrar; puedes limpiarlas en Respaldo.`,
    );
    setDeleting(false);
    setToDelete(null);
  };

  return (
    <div class="admin-page">
      <div class="admin-page__head">
        <h1>Productos</h1>
        <a class="btn btn--primary" href="/admin/producto">
          <Icon name="plus" size={18} /> Nuevo producto
        </a>
      </div>

      <div class="toolbar">
        <div class="field toolbar__search">
          <label for="buscar-admin">Buscar</label>
          <input
            id="buscar-admin"
            class="input"
            type="search"
            placeholder="Nombre, marca o presentación"
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
        </div>
        <fieldset class="segmented">
          <legend>Mostrar</legend>
          {(['todos', 'publicado', 'borrador'] as const).map((s) => (
            <label key={s} class={statusFilter === s ? 'is-active' : ''}>
              <input type="radio" name="estado" value={s} checked={statusFilter === s} onChange={() => setStatusFilter(s)} />
              {s === 'todos' ? 'Todos' : s === 'publicado' ? 'Publicados' : 'Borradores'} ({counts[s]})
            </label>
          ))}
        </fieldset>
      </div>

      {loadError && (
        <div class="notice notice--error" role="alert">
          <Icon name="alert" />
          <p>
            {loadError}{' '}
            <button type="button" class="link-button" onClick={load}>
              Reintentar
            </button>
          </p>
        </div>
      )}

      {!rows && !loadError && (
        <div role="status" aria-label="Cargando productos">
          {[0, 1, 2].map((i) => (
            <div key={i} class="skeleton" style={{ height: '88px', marginBottom: '12px' }} />
          ))}
        </div>
      )}

      {rows && rows.length === 0 && (
        <div class="empty">
          <span class="empty__icon"><Icon name="box" size={36} /></span>
          <h2>Aún no hay productos</h2>
          <p>Crea el primero: agrega fotos, una descripción y publícalo cuando esté listo.</p>
          <div class="actions"><a class="btn btn--primary" href="/admin/producto">Crear producto</a></div>
        </div>
      )}

      {rows && rows.length > 0 && filtered.length === 0 && (
        <div class="empty">
          <h2>Sin resultados</h2>
          <p>No hay productos que coincidan con la búsqueda o el filtro.</p>
          <div class="actions">
            <button type="button" class="btn btn--secondary" onClick={() => { setQuery(''); setStatusFilter('todos'); }}>
              Quitar filtros
            </button>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <p class="muted" role="status">
            {filtered.length} de {rows!.length} productos
          </p>
          <ul class="product-rows">
            {filtered.map((r) => {
              const thumb = [...r.images].sort((a, b) => a.position - b.position)[0];
              const busy = busyId === r.id;
              const price = formatPrice(r.price, r.currency);
              return (
                <li key={r.id} class="product-row" aria-busy={busy}>
                  <div class="product-row__thumb">
                    {thumb ? (
                      <img src={publicImageUrl(thumb.thumb_path) ?? ''} alt="" width={72} height={72} loading="lazy" />
                    ) : (
                      <span class="product-row__noimg" title="Sin imagen">
                        <Icon name="image" size={22} />
                        <span class="visually-hidden">Sin imagen</span>
                      </span>
                    )}
                  </div>
                  <div class="product-row__main">
                    <h2 class="product-row__name">
                      <a href={`/admin/producto?id=${r.id}`}>{r.name}</a>
                    </h2>
                    <p class="product-row__meta">
                      {[r.brand, r.category?.name ?? 'Sin categoría', r.presentation, price].filter(Boolean).join(' · ')}
                    </p>
                    <div class="product-row__badges">
                      {r.status === 'publicado' ? (
                        <span class="badge badge--ok"><Icon name="eye" size={14} /> Publicado</span>
                      ) : (
                        <span class="badge badge--rose"><Icon name="edit" size={14} /> Borrador</span>
                      )}
                      {r.availability === 'agotado' && <span class="badge badge--warn"><Icon name="alert" size={14} /> Agotado</span>}
                      {r.featured && <span class="badge badge--info"><Icon name="star" size={14} /> Destacado</span>}
                      {r.review_notes && <span class="badge badge--warn" title={r.review_notes}><Icon name="info" size={14} /> Con notas</span>}
                    </div>
                  </div>
                  <div class="product-row__actions">
                    <a class="btn btn--secondary btn--sm" href={`/admin/producto?id=${r.id}`}>
                      <Icon name="edit" size={16} /> Editar<span class="visually-hidden"> {r.name}</span>
                    </a>
                    <details class="menu">
                      <summary class="btn btn--ghost btn--sm">
                        {busy ? <span class="spinner" aria-hidden="true" /> : null}
                        Más acciones<span class="visually-hidden"> para {r.name}</span>
                      </summary>
                      <div
                        class="menu__list"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) (e.currentTarget.parentElement as HTMLDetailsElement).open = false;
                        }}
                      >
                        {r.status === 'publicado' ? (
                          <button type="button" disabled={busy} onClick={() => update(r, { status: 'borrador' }, `«${r.name}» se ocultó del sitio.`)}>
                            <Icon name="eyeOff" size={16} /> Ocultar (pasar a borrador)
                          </button>
                        ) : (
                          <button type="button" disabled={busy} onClick={() => update(r, { status: 'publicado' }, `«${r.name}» ya es visible en el sitio.`)}>
                            <Icon name="eye" size={16} /> Publicar
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            update(
                              r,
                              { availability: r.availability === 'disponible' ? 'agotado' : 'disponible' },
                              `«${r.name}» ahora figura como ${r.availability === 'disponible' ? 'agotado' : 'disponible'}.`,
                            )
                          }
                        >
                          <Icon name={r.availability === 'disponible' ? 'alert' : 'check'} size={16} />
                          {r.availability === 'disponible' ? 'Marcar como agotado' : 'Marcar como disponible'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            update(r, { featured: !r.featured }, r.featured ? `«${r.name}» ya no está destacado.` : `«${r.name}» ahora está destacado.`)
                          }
                        >
                          <Icon name="star" size={16} /> {r.featured ? 'Quitar de destacados' : 'Destacar en inicio'}
                        </button>
                        {r.status === 'publicado' && (
                          <a href={`/producto/${r.slug}`} target="_blank" rel="noopener">
                            <Icon name="external" size={16} /> Ver en el sitio
                          </a>
                        )}
                        <button type="button" class="menu__danger" disabled={busy} onClick={() => setToDelete(r)}>
                          <Icon name="trash" size={16} /> Eliminar
                        </button>
                      </div>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar este producto?"
        confirmLabel="Sí, eliminar"
        danger
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        {toDelete && (
          <>
            <p>
              Vas a eliminar <strong>«{toDelete.name}»</strong>
              {toDelete.brand ? ` (${toDelete.brand})` : ''}
              {toDelete.presentation ? `, ${toDelete.presentation}` : ''}.
            </p>
            <p>
              Se borrarán también sus {toDelete.images.length} {toDelete.images.length === 1 ? 'imagen' : 'imágenes'} y su enlace dejará de
              funcionar. Esta acción no se puede deshacer. Si solo quieres quitarlo del sitio, usa «Ocultar».
            </p>
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
