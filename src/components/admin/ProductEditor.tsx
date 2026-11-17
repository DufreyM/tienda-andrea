import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { IMAGE_LIMITS, publicImageUrl } from '../../lib/config';
import { DEFAULT_SETTINGS, slugify } from '../../lib/format';
import { friendlyError } from '../../lib/browser/errors';
import { ImageError, newId, processImage, type ProcessedImage } from '../../lib/browser/images';
import { bucket, removeFiles, sb } from '../../lib/browser/supabase';
import type { AdminProduct, Availability, Category, ProductDetailData, Settings, Status } from '../../lib/types';
import Icon from '../Icon';
import ProductDetail from '../ProductDetail';
import ConfirmDialog from './ConfirmDialog';
import { confirmLeave, setDirty } from './guard';
import { useToast } from './Toasts';

interface EditorImage {
  id: string;
  alt: string;
  width: number | null;
  height: number | null;
  /** Rutas en el almacenamiento (solo si ya se subió). */
  path?: string;
  thumb_path?: string;
  /** Imagen optimizada pendiente de subir. */
  pending?: ProcessedImage & { largeUrl: string; thumbUrl: string; fileName: string };
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  category_id: string;
  brand: string;
  presentation: string;
  price: string;
  currency: string;
  availability: Availability;
  featured: boolean;
  review_notes: string;
  images: EditorImage[];
}

type Errors = Partial<Record<keyof FormState | `alt-${string}`, string>>;

const EMPTY: FormState = {
  name: '',
  slug: '',
  description: '',
  category_id: '',
  brand: '',
  presentation: '',
  price: '',
  currency: '',
  availability: 'disponible',
  featured: false,
  review_notes: '',
  images: [],
};

const CURRENCIES = ['GTQ', 'USD', 'MXN', 'HNL', 'NIO', 'CRC', 'SVC', 'COP', 'PEN', 'EUR'];

/** Representación comparable para detectar cambios sin guardar. */
function snapshot(f: FormState): string {
  return JSON.stringify({ ...f, images: f.images.map((i) => ({ id: i.id, alt: i.alt })) });
}

function parsePrice(value: string): number | null | 'invalid' {
  const v = value.trim().replace(/\s/g, '');
  if (!v) return null;
  // Acepta «150», «150.50», «150,50» y «1,250.50».
  const normalized = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(v) ? v.replace(/,/g, '') : v.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return 'invalid';
  const n = Number(normalized);
  return n >= 0 && n < 10_000_000 ? n : 'invalid';
}

function validate(f: FormState, target: Status): Errors {
  const e: Errors = {};
  const name = f.name.trim();
  if (name.length < 2) e.name = 'Escribe el nombre del producto (mínimo 2 caracteres).';
  else if (name.length > 120) e.name = 'El nombre es muy largo (máximo 120 caracteres).';
  if (!f.slug) e.slug = 'El enlace no puede quedar vacío.';
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug) || f.slug.length > 140)
    e.slug = 'Usa solo minúsculas, números y guiones (sin espacios ni tildes).';
  if (f.description.length > 4000) e.description = 'La descripción es muy larga (máximo 4000 caracteres).';
  if (f.brand.trim().length > 80) e.brand = 'Máximo 80 caracteres.';
  if (f.presentation.trim().length > 80) e.presentation = 'Máximo 80 caracteres.';
  if (f.review_notes.length > 2000) e.review_notes = 'Máximo 2000 caracteres.';
  const price = parsePrice(f.price);
  if (price === 'invalid') e.price = 'Escribe un precio válido, por ejemplo 150 o 150.50.';
  if (price !== null && price !== 'invalid' && !f.currency) e.currency = 'Elige la moneda del precio.';
  for (const img of f.images) {
    const alt = img.alt.trim();
    if (alt.length < 3 || alt.length > 200) e[`alt-${img.id}`] = 'Describe la imagen en 3 a 200 caracteres (por ejemplo: «Frasco de 1 L, vista frontal»).';
  }
  if (target === 'publicado') {
    if (f.description.trim().length < 10) e.description = 'Para publicar, escribe una descripción (mínimo 10 caracteres).';
    if (!f.category_id) e.category_id = 'Para publicar, elige una categoría.';
    if (f.images.length === 0) e.images = 'Para publicar, agrega al menos una imagen.';
  }
  return e;
}

const FIELD_ORDER = ['name', 'slug', 'description', 'category_id', 'brand', 'presentation', 'price', 'currency', 'images'];

export default function ProductEditor() {
  const toast = useToast();
  const params = new URLSearchParams(location.search);
  const [productId] = useState<string>(() => params.get('id') ?? newId());
  const [isNew, setIsNew] = useState(!params.get('id'));
  const [status, setStatus] = useState<Status>('borrador');
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [savedSnap, setSavedSnap] = useState(snapshot(EMPTY));
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = snapshot(form) !== savedSnap;
  useEffect(() => setDirty(dirty), [dirty]);
  useEffect(() => () => setDirty(false), []);

  // Carga inicial: categorías, ajustes y (si se edita) el producto.
  useEffect(() => {
    (async () => {
      const [cats, sets] = await Promise.all([
        sb().from('categories').select('id,name,slug,position').order('position').order('name'),
        sb().from('settings').select('*').maybeSingle(),
      ]);
      if (cats.data) setCategories(cats.data as Category[]);
      if (sets.data) setSettings(sets.data as Settings);
      if (isNew) {
        const base = { ...EMPTY, currency: '' };
        setForm(base);
        setSavedSnap(snapshot(base));
        return;
      }
      const { data, error } = await sb()
        .from('products')
        .select('*,images:product_images(id,path,thumb_path,alt,position,width,height)')
        .eq('id', productId)
        .maybeSingle();
      setLoading(false);
      if (error) return setLoadError(friendlyError(error, 'No pudimos cargar el producto.'));
      if (!data) return setNotFound(true);
      const p = data as AdminProduct;
      const loaded: FormState = {
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        category_id: p.category_id ?? '',
        brand: p.brand ?? '',
        presentation: p.presentation ?? '',
        price: p.price !== null ? String(p.price) : '',
        currency: p.currency ?? '',
        availability: p.availability,
        featured: p.featured,
        review_notes: p.review_notes ?? '',
        images: [...p.images]
          .sort((a, b) => a.position - b.position)
          .map((i) => ({ id: i.id, alt: i.alt, width: i.width, height: i.height, path: i.path, thumb_path: i.thumb_path })),
      };
      setForm(loaded);
      setSavedSnap(snapshot(loaded));
      setStatus(p.status);
      setSlugTouched(true);
      setUpdatedAt(p.updated_at);
    })().catch((err) => {
      setLoading(false);
      setLoadError(friendlyError(err, 'No pudimos cargar el producto.'));
    });
  }, []);

  // Libera las vistas previas locales al salir.
  useEffect(
    () => () => form.images.forEach((i) => i.pending && (URL.revokeObjectURL(i.pending.largeUrl), URL.revokeObjectURL(i.pending.thumbUrl))),
    [],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'name' && !slugTouched) next.slug = slugify(String(value));
      if (key === 'price' && String(value).trim() && !f.currency) next.currency = settings.default_currency;
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setAlt = (id: string, alt: string) => {
    setForm((f) => ({ ...f, images: f.images.map((i) => (i.id === id ? { ...i, alt } : i)) }));
    if (errors[`alt-${id}`]) setErrors((e) => ({ ...e, [`alt-${id}`]: undefined }));
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = IMAGE_LIMITS.maxPerProduct - form.images.length;
    const list = [...files];
    const problems: string[] = [];
    if (list.length > room) problems.push(`Solo se pueden tener ${IMAGE_LIMITS.maxPerProduct} imágenes por producto; se ignoraron ${list.length - Math.max(room, 0)}.`);
    const accepted = list.slice(0, Math.max(room, 0));
    const added: EditorImage[] = [];
    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i];
      setProcessing(`Optimizando imagen ${i + 1} de ${accepted.length}…`);
      try {
        const out = await processImage(file);
        added.push({
          id: newId(),
          alt: form.name.trim() ? `${form.name.trim()}${form.images.length + added.length > 0 ? ` (foto ${form.images.length + added.length + 1})` : ''}` : '',
          width: out.width,
          height: out.height,
          pending: { ...out, largeUrl: URL.createObjectURL(out.large), thumbUrl: URL.createObjectURL(out.thumb), fileName: file.name },
        });
      } catch (err) {
        problems.push(err instanceof ImageError ? err.message : `No pudimos procesar «${file.name}».`);
      }
    }
    setProcessing(null);
    setImageErrors(problems);
    if (added.length) {
      setForm((f) => ({ ...f, images: [...f.images, ...added] }));
      setErrors((e) => ({ ...e, images: undefined }));
      toast('info', added.length === 1 ? 'Imagen lista. Se subirá al guardar.' : `${added.length} imágenes listas. Se subirán al guardar.`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setForm((f) => {
      const img = f.images.find((i) => i.id === id);
      if (img?.pending) {
        URL.revokeObjectURL(img.pending.largeUrl);
        URL.revokeObjectURL(img.pending.thumbUrl);
      }
      return { ...f, images: f.images.filter((i) => i.id !== id) };
    });
  };

  const moveImage = (id: string, dir: -1 | 1) => {
    setForm((f) => {
      const idx = f.images.findIndex((i) => i.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= f.images.length) return f;
      const images = [...f.images];
      [images[idx], images[to]] = [images[to], images[idx]];
      return { ...f, images };
    });
  };

  const focusFirstError = (e: Errors) => {
    const key = FIELD_ORDER.find((k) => e[k as keyof Errors]) ?? Object.keys(e).find((k) => e[k as keyof Errors]);
    if (!key) return;
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${key}"]`);
      el?.focus();
      el?.scrollIntoView({ block: 'center' });
    });
  };

  const save = async (target: Status) => {
    if (saving) return;
    setMode('edit');
    const e = validate(form, target);
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast('error', 'Revisa los campos marcados antes de guardar.');
      focusFirstError(e);
      return;
    }

    const uploaded: string[] = [];
    const pending = form.images.filter((i) => i.pending);
    const finalImages = form.images.map((i) => ({ ...i }));
    try {
      for (let n = 0; n < pending.length; n++) {
        const img = pending[n];
        setSaving(`Subiendo imagen ${n + 1} de ${pending.length}…`);
        const p = img.pending!;
        const base = `products/${productId}/${img.id}`;
        const largePath = `${base}-lg.${p.ext}`;
        const thumbPath = `${base}-sm.${p.ext}`;
        for (const [path, blob] of [
          [largePath, p.large],
          [thumbPath, p.thumb],
        ] as const) {
          const { error } = await bucket().upload(path, blob, { contentType: p.type, cacheControl: '31536000', upsert: false });
          if (error) throw Object.assign(error, { imageName: p.fileName });
          uploaded.push(path);
        }
        const target = finalImages.find((i) => i.id === img.id)!;
        target.path = largePath;
        target.thumb_path = thumbPath;
      }

      setSaving('Guardando producto…');
      const price = parsePrice(form.price);
      const payload = {
        name: form.name.trim(),
        slug: form.slug,
        description: form.description.trim(),
        category_id: form.category_id || null,
        brand: form.brand.trim() || null,
        presentation: form.presentation.trim() || null,
        price: price === null || price === 'invalid' ? null : price,
        currency: price === null ? null : form.currency || null,
        availability: form.availability,
        status: target,
        featured: form.featured,
        review_notes: form.review_notes.trim() || null,
        expect_existing: !isNew,
      };
      const images = finalImages.map((i, position) => ({
        id: i.id,
        path: i.path,
        thumb_path: i.thumb_path,
        alt: i.alt.trim(),
        position,
        width: i.width,
        height: i.height,
      }));
      const { data, error } = await sb().rpc('save_product', { p_id: productId, p_data: payload, p_images: images });
      if (error) throw error;

      // Archivos que quedaron sin uso (imágenes quitadas o reemplazadas).
      const orphans: string[] = data?.orphan_paths ?? [];
      const cleaned = await removeFiles(orphans);

      finalImages.forEach((i) => {
        if (i.pending) {
          URL.revokeObjectURL(i.pending.largeUrl);
          URL.revokeObjectURL(i.pending.thumbUrl);
          delete i.pending;
        }
      });
      const next = { ...form, images: finalImages, price: payload.price === null ? '' : String(payload.price), currency: payload.currency ?? '' };
      setForm(next);
      setSavedSnap(snapshot(next));
      setStatus(target);
      setUpdatedAt(data?.product?.updated_at ?? new Date().toISOString());
      setSlugTouched(true);
      if (isNew) {
        setIsNew(false);
        history.replaceState(null, '', `/admin/producto?id=${productId}`);
      }
      const msg =
        target === 'publicado'
          ? status === 'publicado'
            ? 'Cambios guardados. Ya se ven en el sitio.'
            : 'Producto publicado. Ya es visible en el sitio.'
          : status === 'publicado'
            ? 'Producto ocultado: ahora es un borrador y no se ve en el sitio.'
            : 'Borrador guardado. No es visible en el sitio.';
      toast('ok', cleaned ? msg : `${msg} Algunas imágenes antiguas no se pudieron borrar; puedes limpiarlas en Respaldo.`);
    } catch (err) {
      // Lo subido en este intento no quedó registrado: se borra para no dejar archivos huérfanos.
      await removeFiles(uploaded);
      const imageName = (err as { imageName?: string }).imageName;
      const text = friendlyError(err, 'No pudimos guardar el producto. Tus cambios siguen en el formulario.');
      toast('error', imageName ? `«${imageName}»: ${text}` : text);
      if (/enlace/.test(text)) {
        setErrors((x) => ({ ...x, slug: text }));
        focusFirstError({ slug: text });
      }
    } finally {
      setSaving(null);
    }
  };

  const cancel = () => {
    if (!confirmLeave()) return;
    location.href = '/admin';
  };

  const doDelete = async () => {
    setDeleting(true);
    const { data, error } = await sb().rpc('delete_product', { p_id: productId });
    if (error) {
      setDeleting(false);
      toast('error', friendlyError(error, 'No pudimos eliminar el producto.'));
      return;
    }
    await removeFiles(data?.orphan_paths ?? []);
    setDirty(false);
    location.href = '/admin';
  };

  const previewData: ProductDetailData = useMemo(() => {
    const price = parsePrice(form.price);
    const cat = categories.find((c) => c.id === form.category_id);
    return {
      id: productId,
      name: form.name.trim(),
      slug: form.slug,
      description: form.description,
      brand: form.brand.trim() || null,
      presentation: form.presentation.trim() || null,
      price: price === null || price === 'invalid' ? null : price,
      currency: form.currency || null,
      availability: form.availability,
      featured: form.featured,
      updated_at: updatedAt ?? '',
      category: cat ? { name: cat.name, slug: cat.slug } : null,
      images: form.images.map((i, position) => ({
        id: i.id,
        path: i.path ?? '',
        thumb_path: i.thumb_path ?? '',
        alt: i.alt,
        position,
        width: i.width,
        height: i.height,
      })),
    };
  }, [form, categories, updatedAt]);

  if (loading) {
    return (
      <div class="admin-page" role="status">
        <span class="spinner" aria-hidden="true" /> Cargando producto…
      </div>
    );
  }
  if (notFound || loadError) {
    return (
      <div class="admin-page">
        <div class={`notice ${notFound ? 'notice--warn' : 'notice--error'}`} role="alert">
          <Icon name="alert" />
          <p>
            {notFound ? 'Este producto no existe o ya fue eliminado.' : loadError} <a href="/admin">Volver a la lista</a>
          </p>
        </div>
      </div>
    );
  }

  const err = (key: keyof Errors) =>
    errors[key] ? (
      <p class="error-text" id={`err-${key}`}>
        <Icon name="alert" size={16} /> {errors[key]}
      </p>
    ) : null;
  const describedBy = (key: string, hint?: boolean) =>
    [hint ? `hint-${key}` : null, errors[key as keyof Errors] ? `err-${key}` : null].filter(Boolean).join(' ') || undefined;
  const busy = Boolean(saving || processing);
  const publicUrl = `${location.origin}/producto/${form.slug}`;

  return (
    <div class="admin-page">
      <nav class="breadcrumb" aria-label="Ruta">
        <a href="/admin" onClick={(e) => { e.preventDefault(); cancel(); }}>
          <Icon name="arrowLeft" size={16} /> Productos
        </a>
      </nav>
      <div class="admin-page__head">
        <div>
          <h1>{isNew ? 'Nuevo producto' : form.name || 'Editar producto'}</h1>
          <div class="product-row__badges">
            {isNew ? (
              <span class="badge badge--rose"><Icon name="plus" size={14} /> Sin guardar</span>
            ) : status === 'publicado' ? (
              <span class="badge badge--ok"><Icon name="eye" size={14} /> Publicado</span>
            ) : (
              <span class="badge badge--rose"><Icon name="edit" size={14} /> Borrador (no visible)</span>
            )}
            {dirty && !isNew && <span class="badge badge--warn"><Icon name="alert" size={14} /> Cambios sin guardar</span>}
          </div>
        </div>
        <div class="segmented segmented--tabs" role="group" aria-label="Modo">
          <button type="button" class={mode === 'edit' ? 'is-active' : ''} aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>
            <Icon name="edit" size={16} /> Editar
          </button>
          <button type="button" class={mode === 'preview' ? 'is-active' : ''} aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>
            <Icon name="eye" size={16} /> Vista previa
          </button>
        </div>
      </div>

      {mode === 'preview' ? (
        <section class="preview" aria-label="Vista previa del producto">
          <div class="notice notice--info">
            <Icon name="info" />
            <p>Así se verá la página del producto. {status !== 'publicado' && 'Aún no es visible para el público.'}</p>
          </div>
          <div class="preview__frame">
            <ProductDetail
              product={previewData}
              settings={{ whatsapp: settings.whatsapp, business_name: settings.business_name }}
              url={publicUrl}
              preview
              imageUrls={form.images.map((i) => ({
                large: i.pending?.largeUrl ?? publicImageUrl(i.path) ?? '',
                thumb: i.pending?.thumbUrl ?? publicImageUrl(i.thumb_path) ?? '',
              }))}
            />
          </div>
        </section>
      ) : (
        <form
          ref={formRef}
          class="editor"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save(status === 'publicado' ? 'publicado' : 'borrador');
          }}
        >
          <div class="editor__main">
            <fieldset class="panel">
              <legend>Información</legend>
              <div class="field">
                <label for="f-name">Nombre <span aria-hidden="true">*</span></label>
                <input id="f-name" data-field="name" class="input" value={form.name} maxLength={120} required aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('name')} onInput={(e) => set('name', e.currentTarget.value)} />
                {err('name')}
              </div>
              <div class="field">
                <label for="f-slug">Enlace del producto</label>
                <div class="input-prefix">
                  <span aria-hidden="true">/producto/</span>
                  <input
                    id="f-slug"
                    data-field="slug"
                    class="input"
                    value={form.slug}
                    maxLength={140}
                    aria-invalid={Boolean(errors.slug)}
                    aria-describedby={describedBy('slug', true)}
                    onInput={(e) => {
                      setSlugTouched(true);
                      // Mientras se escribe se permite un guion final; al salir del campo se limpia.
                      const typed = e.currentTarget.value
                        .normalize('NFD')
                        .replace(/\p{M}/gu, '')
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+/, '');
                      set('slug', typed);
                    }}
                    onBlur={() => set('slug', slugify(form.slug))}
                  />
                </div>
                <p class="hint" id="hint-slug">
                  {isNew ? 'Se genera a partir del nombre.' : 'Si lo cambias, los enlaces compartidos antes dejarán de funcionar.'}
                </p>
                {err('slug')}
              </div>
              <div class="field">
                <label for="f-desc">Descripción {status === 'publicado' && <span aria-hidden="true">*</span>}</label>
                <textarea id="f-desc" data-field="description" class="textarea" rows={6} maxLength={4000} value={form.description} aria-invalid={Boolean(errors.description)} aria-describedby={describedBy('description', true)} onInput={(e) => set('description', e.currentTarget.value)} />
                <p class="hint" id="hint-description">Obligatoria para publicar. Describe solo lo que conoces del producto; deja una línea en blanco para separar párrafos. {form.description.length}/4000</p>
                {err('description')}
              </div>
              <div class="grid-2">
                <div class="field">
                  <label for="f-cat">Categoría</label>
                  <select id="f-cat" data-field="category_id" class="select" value={form.category_id} aria-invalid={Boolean(errors.category_id)} aria-describedby={describedBy('category_id', true)} onChange={(e) => set('category_id', e.currentTarget.value)}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p class="hint" id="hint-category_id">Obligatoria para publicar. <a href="/admin/categorias" onClick={(e) => !confirmLeave() && e.preventDefault()}>Administrar categorías</a></p>
                  {err('category_id')}
                </div>
                <div class="field">
                  <label for="f-brand">Marca <span class="muted">(opcional)</span></label>
                  <input id="f-brand" data-field="brand" class="input" value={form.brand} maxLength={80} aria-invalid={Boolean(errors.brand)} aria-describedby={describedBy('brand')} onInput={(e) => set('brand', e.currentTarget.value)} />
                  {err('brand')}
                </div>
              </div>
              <div class="field">
                <label for="f-pres">Presentación <span class="muted">(opcional)</span></label>
                <input id="f-pres" data-field="presentation" class="input" value={form.presentation} maxLength={80} placeholder="Ej.: 1 L, 250 ml, 50 g, 3 unidades" aria-describedby={describedBy('presentation', true)} aria-invalid={Boolean(errors.presentation)} onInput={(e) => set('presentation', e.currentTarget.value)} />
                <p class="hint" id="hint-presentation">Volumen, peso o número de unidades.</p>
                {err('presentation')}
              </div>
            </fieldset>

            <fieldset class="panel">
              <legend>Imágenes</legend>
              <p class="hint" id="hint-images">
                La primera es la principal. Formatos JPG, PNG o WebP de hasta {IMAGE_LIMITS.maxInputBytes / 1024 / 1024} MB; se optimizan
                automáticamente. Máximo {IMAGE_LIMITS.maxPerProduct}. Usa fotos propias o autorizadas.
              </p>
              {errors.images && (
                <p class="error-text" id="err-images">
                  <Icon name="alert" size={16} /> {errors.images}
                </p>
              )}
              {imageErrors.length > 0 && (
                <div class="notice notice--error" role="alert">
                  <Icon name="alert" />
                  <div>
                    {imageErrors.map((m, i) => (
                      <p key={i}>{m}</p>
                    ))}
                  </div>
                </div>
              )}
              {form.images.length > 0 && (
                <ul class="image-list">
                  {form.images.map((img, i) => {
                    const src = img.pending?.thumbUrl ?? publicImageUrl(img.thumb_path);
                    const altKey = `alt-${img.id}` as const;
                    return (
                      <li key={img.id} class="image-item">
                        <div class="image-item__thumb">
                          {src ? <img src={src} alt="" width={96} height={96} /> : <Icon name="image" />}
                        </div>
                        <div class="image-item__body">
                          <div class="product-row__badges">
                            {i === 0 && <span class="badge badge--info"><Icon name="star" size={14} /> Principal</span>}
                            {img.pending && <span class="badge badge--warn"><Icon name="upload" size={14} /> Se subirá al guardar</span>}
                          </div>
                          <div class="field">
                            <label for={`alt-${img.id}`}>Descripción de la foto {i + 1}</label>
                            <input
                              id={`alt-${img.id}`}
                              data-field={altKey}
                              class="input"
                              value={img.alt}
                              maxLength={200}
                              placeholder="Ej.: Frasco de 1 L, vista frontal"
                              aria-invalid={Boolean(errors[altKey])}
                              aria-describedby={errors[altKey] ? `err-${altKey}` : undefined}
                              onInput={(e) => setAlt(img.id, e.currentTarget.value)}
                            />
                            {err(altKey)}
                          </div>
                          <div class="actions">
                            <button type="button" class="btn btn--ghost btn--sm" disabled={i === 0 || busy} onClick={() => moveImage(img.id, -1)} aria-label={`Mover foto ${i + 1} antes`}>
                              <Icon name="up" size={16} /> Antes
                            </button>
                            <button type="button" class="btn btn--ghost btn--sm" disabled={i === form.images.length - 1 || busy} onClick={() => moveImage(img.id, 1)} aria-label={`Mover foto ${i + 1} después`}>
                              <Icon name="down" size={16} /> Después
                            </button>
                            <button type="button" class="btn btn--ghost btn--sm" disabled={busy} onClick={() => removeImage(img.id)} aria-label={`Quitar foto ${i + 1}`}>
                              <Icon name="trash" size={16} /> Quitar
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div class="uploader">
                <input
                  ref={fileRef}
                  id="f-images"
                  data-field="images"
                  class="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={busy || form.images.length >= IMAGE_LIMITS.maxPerProduct}
                  aria-describedby={describedBy('images', true)}
                  onChange={(e) => addFiles(e.currentTarget.files)}
                />
                <label for="f-images" class={`btn btn--secondary ${busy || form.images.length >= IMAGE_LIMITS.maxPerProduct ? 'is-disabled' : ''}`}>
                  <Icon name="upload" size={18} /> {form.images.length ? 'Agregar más fotos' : 'Elegir fotos'}
                </label>
                {processing && (
                  <span role="status" class="muted">
                    <span class="spinner" aria-hidden="true" /> {processing}
                  </span>
                )}
              </div>
            </fieldset>
          </div>

          <aside class="editor__side">
            <fieldset class="panel">
              <legend>Precio y disponibilidad</legend>
              <div class="grid-2 grid-2--tight">
                <div class="field">
                  <label for="f-price">Precio <span class="muted">(opcional)</span></label>
                  <input id="f-price" data-field="price" class="input" inputMode="decimal" value={form.price} placeholder="150.00" aria-invalid={Boolean(errors.price)} aria-describedby={describedBy('price')} onInput={(e) => set('price', e.currentTarget.value)} />
                  {err('price')}
                </div>
                <div class="field">
                  <label for="f-cur">Moneda</label>
                  <select id="f-cur" data-field="currency" class="select" value={form.currency} aria-invalid={Boolean(errors.currency)} aria-describedby={describedBy('currency')} onChange={(e) => set('currency', e.currentTarget.value)}>
                    <option value="">—</option>
                    {[...new Set([settings.default_currency, ...CURRENCIES])].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {err('currency')}
                </div>
              </div>
              <p class="hint">Si lo dejas vacío, el sitio muestra «Consultar precio».</p>
              <fieldset class="radio-group">
                <legend>Disponibilidad</legend>
                <label class="checkbox">
                  <input type="radio" name="availability" checked={form.availability === 'disponible'} onChange={() => set('availability', 'disponible')} /> Disponible
                </label>
                <label class="checkbox">
                  <input type="radio" name="availability" checked={form.availability === 'agotado'} onChange={() => set('availability', 'agotado')} /> Agotado
                </label>
              </fieldset>
              <label class="checkbox">
                <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.currentTarget.checked)} /> Destacar en la página de inicio
              </label>
            </fieldset>

            <fieldset class="panel">
              <legend>Notas internas</legend>
              <div class="field">
                <label for="f-notes">Solo las ve la administración</label>
                <textarea id="f-notes" class="textarea" rows={3} maxLength={2000} value={form.review_notes} aria-describedby={describedBy('review_notes', true)} onInput={(e) => set('review_notes', e.currentTarget.value)} />
                <p class="hint" id="hint-review_notes">Útil para recordar datos por confirmar (precio, marca, variantes).</p>
                {err('review_notes')}
              </div>
            </fieldset>

            {!isNew && (
              <div class="panel panel--danger">
                <h2 class="panel__title">Eliminar</h2>
                <p class="hint">Borra el producto y sus imágenes de forma permanente.</p>
                <button type="button" class="btn btn--ghost btn--sm danger-text" onClick={() => setConfirmDelete(true)} disabled={busy}>
                  <Icon name="trash" size={16} /> Eliminar producto
                </button>
              </div>
            )}
          </aside>

          <div class="editor__bar" role="group" aria-label="Acciones del formulario">
            {saving ? (
              <p role="status" class="editor__status">
                <span class="spinner" aria-hidden="true" /> {saving}
              </p>
            ) : (
              <p class="editor__status muted" role="status">
                {dirty ? 'Hay cambios sin guardar.' : isNew ? '' : 'Todo guardado.'}
              </p>
            )}
            <div class="actions">
              <button type="button" class="btn btn--ghost" onClick={cancel} disabled={Boolean(saving)}>
                Cancelar
              </button>
              {status === 'publicado' && !isNew ? (
                <>
                  <button type="button" class="btn btn--secondary" onClick={() => save('borrador')} disabled={busy}>
                    <Icon name="eyeOff" size={18} /> Ocultar
                  </button>
                  <button type="submit" class="btn btn--primary" disabled={busy}>
                    <Icon name="check" size={18} /> Guardar cambios
                  </button>
                </>
              ) : (
                <>
                  <button type="submit" class="btn btn--secondary" disabled={busy}>
                    Guardar borrador
                  </button>
                  <button type="button" class="btn btn--primary" onClick={() => save('publicado')} disabled={busy}>
                    <Icon name="eye" size={18} /> Publicar
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este producto?"
        confirmLabel="Sí, eliminar"
        danger
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      >
        <p>
          Vas a eliminar <strong>«{form.name || 'producto sin nombre'}»</strong>
          {form.brand ? ` (${form.brand})` : ''}. Se borrarán sus imágenes y su enlace dejará de funcionar. Esta acción no se puede deshacer.
        </p>
      </ConfirmDialog>
    </div>
  );
}
