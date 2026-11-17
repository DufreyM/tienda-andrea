import { useEffect, useState } from 'preact/hooks';
import { slugify } from '../../lib/format';
import { friendlyError } from '../../lib/browser/errors';
import { sb } from '../../lib/browser/supabase';
import type { Category } from '../../lib/types';
import Icon from '../Icon';
import ConfirmDialog from './ConfirmDialog';
import { setDirty } from './guard';
import { useToast } from './Toasts';

type Row = Category & { products: number };

export default function CategoriesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newError, setNewError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; error?: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setDirty(Boolean(newName.trim() || editing)), [newName, editing]);
  useEffect(() => () => setDirty(false), []);

  const load = async () => {
    setLoadError(null);
    const [cats, prods] = await Promise.all([
      sb().from('categories').select('id,name,slug,position').order('position').order('name'),
      sb().from('products').select('category_id'),
    ]);
    if (cats.error || prods.error) {
      setLoadError(friendlyError(cats.error ?? prods.error, 'No pudimos cargar las categorías.'));
      return;
    }
    const counts = new Map<string, number>();
    for (const p of prods.data ?? []) if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
    setRows((cats.data as Category[]).map((c) => ({ ...c, products: counts.get(c.id) ?? 0 })));
  };

  useEffect(() => {
    load();
  }, []);

  const validName = (name: string) => {
    const n = name.trim();
    if (n.length < 2) return 'Escribe un nombre de al menos 2 caracteres.';
    if (n.length > 60) return 'Máximo 60 caracteres.';
    if (!slugify(n)) return 'El nombre debe tener letras o números.';
    return null;
  };

  const add = async (e: Event) => {
    e.preventDefault();
    const problem = validName(newName);
    setNewError(problem);
    if (problem) return;
    setAdding(true);
    const position = Math.max(0, ...(rows ?? []).map((r) => r.position)) + 10;
    const { error } = await sb().from('categories').insert({ name: newName.trim(), slug: slugify(newName), position });
    setAdding(false);
    if (error) {
      setNewError(friendlyError(error));
      return;
    }
    toast('ok', `Categoría «${newName.trim()}» creada.`);
    setNewName('');
    load();
  };

  const rename = async (e: Event) => {
    e.preventDefault();
    if (!editing) return;
    const problem = validName(editing.name);
    if (problem) return setEditing({ ...editing, error: problem });
    setBusyId(editing.id);
    // El enlace (slug) se mantiene para no romper enlaces de filtros ya compartidos.
    const { error } = await sb().from('categories').update({ name: editing.name.trim() }).eq('id', editing.id);
    setBusyId(null);
    if (error) return setEditing({ ...editing, error: friendlyError(error) });
    toast('ok', 'Nombre actualizado.');
    setEditing(null);
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!rows) return;
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    setBusyId(a.id);
    // Se reasignan posiciones consecutivas para que el orden sea estable.
    const reordered = [...rows];
    [reordered[index], reordered[index + dir]] = [b, a];
    const updates = reordered.map((r, i) => ({ id: r.id, position: (i + 1) * 10 }));
    const results = await Promise.all(
      updates.filter((u, i) => reordered[i].position !== u.position).map((u) => sb().from('categories').update({ position: u.position }).eq('id', u.id)),
    );
    setBusyId(null);
    const failed = results.find((r) => r.error);
    if (failed) toast('error', friendlyError(failed.error));
    load();
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await sb().from('categories').delete().eq('id', toDelete.id);
    setDeleting(false);
    if (error) {
      toast('error', friendlyError(error));
      return;
    }
    toast('ok', `Categoría «${toDelete.name}» eliminada.`);
    setToDelete(null);
    load();
  };

  return (
    <div class="admin-page admin-page--narrow">
      <div class="admin-page__head">
        <h1>Categorías</h1>
      </div>
      <p class="muted">Se muestran como filtros en el catálogo, en este orden. Solo aparecen las que tienen productos publicados.</p>

      <form class="panel" onSubmit={add} noValidate>
        <div class="field">
          <label for="cat-new">Nueva categoría</label>
          <div class="inline-form">
            <input
              id="cat-new"
              class="input"
              value={newName}
              maxLength={60}
              placeholder="Ej.: Cuidado de la piel"
              aria-invalid={Boolean(newError)}
              aria-describedby={newError ? 'cat-new-error' : undefined}
              onInput={(e) => {
                setNewName(e.currentTarget.value);
                setNewError(null);
              }}
            />
            <button class="btn btn--primary" type="submit" disabled={adding}>
              {adding ? <span class="spinner" aria-hidden="true" /> : <Icon name="plus" size={18} />} Agregar
            </button>
          </div>
          {newError && (
            <p class="error-text" id="cat-new-error">
              <Icon name="alert" size={16} /> {newError}
            </p>
          )}
        </div>
      </form>

      {loadError && (
        <div class="notice notice--error" role="alert">
          <Icon name="alert" />
          <p>
            {loadError}{' '}
            <button type="button" class="link-button" onClick={load}>Reintentar</button>
          </p>
        </div>
      )}
      {!rows && !loadError && (
        <p role="status"><span class="spinner" aria-hidden="true" /> Cargando categorías…</p>
      )}
      {rows && rows.length === 0 && (
        <div class="empty">
          <h2>Sin categorías</h2>
          <p>Crea al menos una para poder publicar productos.</p>
        </div>
      )}
      {rows && rows.length > 0 && (
        <ul class="cat-list">
          {rows.map((c, i) => (
            <li key={c.id} class="cat-item" aria-busy={busyId === c.id}>
              {editing?.id === c.id ? (
                <form class="cat-item__edit" onSubmit={rename} noValidate>
                  <label for={`cat-${c.id}`} class="visually-hidden">Nuevo nombre para {c.name}</label>
                  <input
                    id={`cat-${c.id}`}
                    class="input"
                    value={editing.name}
                    maxLength={60}
                    aria-invalid={Boolean(editing.error)}
                    aria-describedby={editing.error ? `cat-${c.id}-error` : undefined}
                    onInput={(e) => setEditing({ id: c.id, name: e.currentTarget.value })}
                    ref={(el) => el?.focus()}
                  />
                  <div class="actions">
                    <button type="submit" class="btn btn--primary btn--sm" disabled={busyId === c.id}>Guardar</button>
                    <button type="button" class="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>Cancelar</button>
                  </div>
                  {editing.error && (
                    <p class="error-text" id={`cat-${c.id}-error`}>
                      <Icon name="alert" size={16} /> {editing.error}
                    </p>
                  )}
                </form>
              ) : (
                <>
                  <div class="cat-item__main">
                    <strong>{c.name}</strong>
                    <span class="muted">
                      {c.products} {c.products === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                  <div class="actions">
                    <button type="button" class="btn btn--ghost btn--sm" disabled={i === 0 || Boolean(busyId)} onClick={() => move(i, -1)} aria-label={`Subir ${c.name}`}>
                      <Icon name="up" size={16} />
                    </button>
                    <button type="button" class="btn btn--ghost btn--sm" disabled={i === rows.length - 1 || Boolean(busyId)} onClick={() => move(i, 1)} aria-label={`Bajar ${c.name}`}>
                      <Icon name="down" size={16} />
                    </button>
                    <button type="button" class="btn btn--secondary btn--sm" onClick={() => setEditing({ id: c.id, name: c.name })}>
                      <Icon name="edit" size={16} /> Renombrar<span class="visually-hidden"> {c.name}</span>
                    </button>
                    <button type="button" class="btn btn--ghost btn--sm danger-text" onClick={() => setToDelete(c)}>
                      <Icon name="trash" size={16} /> Eliminar<span class="visually-hidden"> {c.name}</span>
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete && toDelete.products > 0 ? 'No se puede eliminar todavía' : '¿Eliminar esta categoría?'}
        confirmLabel={toDelete && toDelete.products > 0 ? 'Entendido' : 'Sí, eliminar'}
        danger={!(toDelete && toDelete.products > 0)}
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={() => (toDelete && toDelete.products > 0 ? setToDelete(null) : remove())}
      >
        {toDelete && toDelete.products > 0 ? (
          <p>
            «{toDelete.name}» tiene {toDelete.products} {toDelete.products === 1 ? 'producto' : 'productos'}. Cámbialos a otra categoría antes de
            eliminarla.
          </p>
        ) : (
          <p>Vas a eliminar la categoría <strong>«{toDelete?.name}»</strong>. No tiene productos.</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
