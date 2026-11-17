// Pruebas de permisos y operaciones principales contra el Supabase local.
// Requiere: `npx supabase start` y `node scripts/admin-local.mjs`.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }));
const URL_ = status.API_URL as string;
const PUBLIC_KEY = (status.PUBLISHABLE_KEY ?? status.ANON_KEY) as string;
const SECRET_KEY = (status.SECRET_KEY ?? status.SERVICE_ROLE_KEY) as string;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

// PNG válido de 1×1 px.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let anon: SupabaseClient;
let admin: SupabaseClient;
let user: SupabaseClient; // sesión iniciada pero sin permisos de administración
let service: SupabaseClient;
let categoryId: string;
const created: string[] = [];
const uploaded: string[] = [];

async function login(email: string, password: string) {
  const c = createClient(URL_, PUBLIC_KEY, opts);
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

function productPayload(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    slug: `prueba-${randomUUID().slice(0, 8)}`,
    description: 'Descripción de prueba suficientemente larga.',
    category_id: categoryId,
    brand: 'Marca de prueba',
    presentation: '250 ml',
    price: null,
    currency: null,
    availability: 'disponible',
    status: 'borrador',
    featured: false,
    review_notes: 'nota interna secreta',
    ...extra,
  };
}

async function uploadAs(client: SupabaseClient, path: string, body: Buffer = PNG, contentType = 'image/png') {
  const r = await client.storage.from('productos').upload(path, body, { contentType });
  if (!r.error) uploaded.push(path);
  return r;
}

beforeAll(async () => {
  anon = createClient(URL_, PUBLIC_KEY, opts);
  service = createClient(URL_, SECRET_KEY, opts);
  admin = await login('admin@local.test', 'admin-local-123');
  const email = `cliente-${randomUUID().slice(0, 6)}@local.test`;
  const { error } = await service.auth.admin.createUser({ email, password: 'cliente-123456', email_confirm: true });
  if (error) throw error;
  user = await login(email, 'cliente-123456');
  const { data } = await service.from('categories').select('id').eq('slug', 'shampoos').single();
  categoryId = data!.id;
});

afterAll(async () => {
  if (created.length) await service.from('products').delete().in('id', created);
  if (uploaded.length) await service.storage.from('productos').remove(uploaded);
});

describe('visitante sin sesión', () => {
  it('no ve borradores ni por consulta directa ni por búsqueda', async () => {
    const { data: drafts } = await service.from('products').select('slug').eq('status', 'borrador');
    expect(drafts!.length).toBeGreaterThan(0);
    const { data } = await anon.from('products').select('id,slug,status');
    expect(data!.every((p) => p.status === 'publicado')).toBe(true);
    const bySlug = await anon.from('products').select('id').eq('slug', drafts![0].slug);
    expect(bySlug.data).toEqual([]);
    const search = await anon.rpc('search_catalog', { p_q: drafts![0].slug.split('-')[0] });
    expect(search.error).toBeNull();
    expect(search.data.map((r: { slug: string }) => r.slug)).not.toContain(drafts![0].slug);
  });

  it('no puede leer las notas internas', async () => {
    const { error } = await anon.from('products').select('review_notes').limit(1);
    expect(error).not.toBeNull();
  });

  it('no puede crear, modificar ni eliminar productos, categorías, imágenes ni ajustes', async () => {
    const ins = await anon.from('products').insert(productPayload('Intruso'));
    expect(ins.error).not.toBeNull();
    const cat = await anon.from('categories').insert({ name: 'Intrusa', slug: 'intrusa' });
    expect(cat.error).not.toBeNull();

    const { data: before } = await service.from('products').select('id,name').limit(1).single();
    await anon.from('products').update({ name: 'Hackeado' }).eq('id', before!.id);
    await anon.from('products').delete().eq('id', before!.id);
    const { data: after } = await service.from('products').select('id,name').eq('id', before!.id).single();
    expect(after).toEqual(before);

    const set = await anon.from('settings').update({ business_name: 'Hackeado' }).eq('id', true).select();
    expect(set.error ?? (set.data?.length === 0 ? 'sin filas' : null)).not.toBeNull();
    const { data: s } = await service.from('settings').select('business_name').single();
    expect(s!.business_name).not.toBe('Hackeado');

    const img = await anon.from('product_images').insert({
      product_id: before!.id,
      path: 'products/x/y.png',
      thumb_path: 'products/x/y.png',
      alt: 'Intruso',
    });
    expect(img.error).not.toBeNull();
  });

  it('no puede llamar funciones de administración', async () => {
    for (const [fn, args] of [
      ['save_product', { p_id: randomUUID(), p_data: productPayload('X'), p_images: [] }],
      ['delete_product', { p_id: randomUUID() }],
      ['orphan_files', {}],
      ['storage_usage', {}],
      ['database_usage', {}],
    ] as const) {
      const { error } = await anon.rpc(fn, args);
      expect(error, fn).not.toBeNull();
    }
  });

  it('no puede subir, listar ni borrar archivos', async () => {
    const up = await uploadAs(anon, `products/${randomUUID()}/intruso.png`);
    expect(up.error).not.toBeNull();
    const { data: list } = await anon.storage.from('productos').list('products');
    expect(list ?? []).toEqual([]);
  });
});

describe('usuario con sesión pero sin permisos de administración', () => {
  it('no puede escribir ni subir archivos', async () => {
    const ins = await user.from('products').insert(productPayload('Intruso'));
    expect(ins.error).not.toBeNull();
    const rpc = await user.rpc('save_product', { p_id: randomUUID(), p_data: productPayload('X'), p_images: [] });
    expect(rpc.error?.message).toMatch(/No autorizado/);
    const up = await uploadAs(user, `products/${randomUUID()}/intruso.png`);
    expect(up.error).not.toBeNull();
    const { data: isAdmin } = await user.rpc('is_admin');
    expect(isAdmin).toBe(false);
  });
});

describe('administrador', () => {
  it('crea un borrador, no puede publicarlo sin imagen y sí con imagen', async () => {
    const id = randomUUID();
    created.push(id);
    const draft = await admin.rpc('save_product', { p_id: id, p_data: productPayload('Shampoo de prueba'), p_images: [] });
    expect(draft.error).toBeNull();

    const noImg = await admin.rpc('save_product', {
      p_id: id,
      p_data: { ...productPayload('Shampoo de prueba'), status: 'publicado', expect_existing: true },
      p_images: [],
    });
    expect(noImg.error?.message).toMatch(/al menos una imagen/);

    const path = `products/${id}/${randomUUID()}-lg.png`;
    const thumb = path.replace('-lg', '-sm');
    expect((await uploadAs(admin, path)).error).toBeNull();
    expect((await uploadAs(admin, thumb)).error).toBeNull();
    const pub = await admin.rpc('save_product', {
      p_id: id,
      p_data: { ...productPayload('Shampoo de prueba'), status: 'publicado', expect_existing: true },
      p_images: [{ id: randomUUID(), path, thumb_path: thumb, alt: 'Frasco de prueba', position: 0, width: 1, height: 1 }],
    });
    expect(pub.error).toBeNull();
    const slug = pub.data.product.slug;

    // Ya es visible para visitantes, con su imagen y sin notas internas.
    const visible = await anon.from('products').select('id,name,images:product_images(path)').eq('slug', slug).single();
    expect(visible.data?.images).toHaveLength(1);
    const res = await fetch(`${URL_}/storage/v1/object/public/productos/${path}`);
    expect(res.status).toBe(200);

    // No se puede dejar un producto publicado sin imágenes.
    const delImg = await admin.from('product_images').delete().eq('product_id', id);
    expect(delImg.error?.message).toMatch(/al menos una imagen/);

    // Ocultar: deja de ser visible.
    const hide = await admin.from('products').update({ status: 'borrador' }).eq('id', id);
    expect(hide.error).toBeNull();
    const hidden = await anon.from('products').select('id').eq('slug', slug);
    expect(hidden.data).toEqual([]);
    const hiddenImgs = await anon.from('product_images').select('id').eq('product_id', id);
    expect(hiddenImgs.data).toEqual([]);
  });

  it('exige descripción y categoría para publicar, y precio con moneda', async () => {
    const id = randomUUID();
    created.push(id);
    const short = await admin.rpc('save_product', {
      p_id: id,
      p_data: productPayload('Sin descripción', { description: 'corta', status: 'publicado' }),
      p_images: [],
    });
    expect(short.error?.code).toBe('23514');
    const price = await admin.rpc('save_product', {
      p_id: id,
      p_data: productPayload('Precio sin moneda', { price: 100, currency: null }),
      p_images: [],
    });
    expect(price.error?.code).toBe('23514');
  });

  it('al eliminar, informa solo los archivos que nadie más usa', async () => {
    const a = randomUUID();
    const b = randomUUID();
    created.push(a, b);
    const shared = `products/${a}/${randomUUID()}-lg.png`;
    const own = `products/${a}/${randomUUID()}-sm.png`;
    await uploadAs(admin, shared);
    await uploadAs(admin, own);
    const img = (path: string, thumb: string) => [{ id: randomUUID(), path, thumb_path: thumb, alt: 'Foto de prueba', position: 0 }];
    expect((await admin.rpc('save_product', { p_id: a, p_data: productPayload('Producto A'), p_images: img(shared, own) })).error).toBeNull();
    expect((await admin.rpc('save_product', { p_id: b, p_data: productPayload('Producto B'), p_images: img(shared, shared) })).error).toBeNull();

    const del = await admin.rpc('delete_product', { p_id: a });
    expect(del.error).toBeNull();
    expect(del.data.orphan_paths).toEqual([own]);

    const again = await admin.rpc('delete_product', { p_id: a });
    expect(again.error?.code).toBe('P0002');
  });

  it('el almacenamiento rechaza formatos no permitidos y archivos de más de 2 MB', async () => {
    const txt = await uploadAs(admin, `products/${randomUUID()}/nota.txt`, Buffer.from('hola'), 'text/plain');
    expect(txt.error).not.toBeNull();
    const big = await uploadAs(admin, `products/${randomUUID()}/grande.png`, Buffer.alloc(2 * 1024 * 1024 + 10), 'image/png');
    expect(big.error).not.toBeNull();
  });

  it('administra categorías y no puede borrar una con productos', async () => {
    const slug = `cat-${randomUUID().slice(0, 6)}`;
    const ins = await admin.from('categories').insert({ name: `Categoría ${slug}`, slug }).select().single();
    expect(ins.error).toBeNull();
    const del = await admin.from('categories').delete().eq('id', ins.data!.id);
    expect(del.error).toBeNull();
    const used = await admin.from('categories').delete().eq('id', categoryId);
    expect(used.error?.code).toBe('23503');
  });
});
