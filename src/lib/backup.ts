// Respaldo y restauración del catálogo. Funciona en el navegador (página «Respaldo») y en
// Node (scripts/respaldo.mjs y scripts/restaurar.mjs). Usa una sesión de administrador:
// los permisos los sigue controlando RLS.
//
// Formato: archivo .zip con
//   datos.json          → ajustes, categorías, productos (incluidos borradores) e imágenes
//   archivos/<ruta>     → cada foto y el logotipo, con la misma ruta que en el almacenamiento
import type { SupabaseClient } from '@supabase/supabase-js';
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

export const BACKUP_VERSION = 1;
const BUCKET = 'productos';

export interface BackupData {
  version: number;
  exported_at: string;
  settings: Record<string, unknown> | null;
  categories: Record<string, unknown>[];
  products: Record<string, unknown>[];
  product_images: Record<string, unknown>[];
}

type Progress = (text: string) => void;

async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

export async function readCatalog(client: SupabaseClient): Promise<BackupData> {
  const [settings, categories, products, product_images] = await Promise.all([
    must(client.from('settings').select('*').maybeSingle()),
    must(client.from('categories').select('*').order('position')),
    must(client.from('products').select('*').order('created_at')),
    must(client.from('product_images').select('*').order('product_id').order('position')),
  ]);
  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    settings: settings as Record<string, unknown> | null,
    categories: categories as Record<string, unknown>[],
    products: products as Record<string, unknown>[],
    product_images: product_images as Record<string, unknown>[],
  };
}

export function referencedFiles(data: BackupData): string[] {
  const files = new Set<string>();
  for (const img of data.product_images) {
    files.add(String(img.path));
    files.add(String(img.thumb_path));
  }
  if (data.settings?.logo_path) files.add(String(data.settings.logo_path));
  return [...files];
}

/** Crea el .zip completo. Devuelve también las rutas que no se pudieron descargar. */
export async function createBackupZip(client: SupabaseClient, progress: Progress = () => {}): Promise<{ zip: Uint8Array; missing: string[]; data: BackupData }> {
  progress('Leyendo datos…');
  const data = await readCatalog(client);
  const files = referencedFiles(data);
  const entries: Zippable = { 'datos.json': strToU8(JSON.stringify(data, null, 2)) };
  const missing: string[] = [];
  for (let i = 0; i < files.length; i++) {
    progress(`Descargando imagen ${i + 1} de ${files.length}…`);
    const { data: blob, error } = await client.storage.from(BUCKET).download(files[i]);
    if (error || !blob) {
      missing.push(files[i]);
      continue;
    }
    // Las imágenes ya están comprimidas: se guardan sin volver a comprimir.
    entries[`archivos/${files[i]}`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
  }
  progress('Generando archivo…');
  return { zip: zipSync(entries, { level: 6 }), missing, data };
}

export function parseBackupZip(zip: Uint8Array): { data: BackupData; files: Map<string, Uint8Array> } {
  const entries = unzipSync(zip);
  const raw = entries['datos.json'];
  if (!raw) throw new Error('El archivo no contiene datos.json; no parece un respaldo del catálogo.');
  const data = JSON.parse(strFromU8(raw)) as BackupData;
  if (data.version !== BACKUP_VERSION) throw new Error(`Versión de respaldo no compatible: ${data.version}`);
  const files = new Map<string, Uint8Array>();
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.startsWith('archivos/') && !name.endsWith('/')) files.set(name.slice('archivos/'.length), bytes);
  }
  return { data, files };
}

const contentType = (path: string) =>
  path.endsWith('.webp') ? 'image/webp' : path.endsWith('.png') ? 'image/png' : 'image/jpeg';

/**
 * Restaura un respaldo: el catálogo queda IGUAL al respaldo (se eliminan primero los
 * productos y categorías actuales). Haz un respaldo del estado actual antes de usarlo.
 */
export async function restoreBackup(
  client: SupabaseClient,
  backup: { data: BackupData; files: Map<string, Uint8Array> },
  progress: Progress = () => {},
): Promise<{ products: number; images: number; files: number }> {
  const { data, files } = backup;

  progress('Vaciando el catálogo actual…');
  await must(client.from('products').delete().not('id', 'is', null).select('id'));
  await must(client.from('categories').delete().not('id', 'is', null).select('id'));

  if (data.settings) {
    progress('Restaurando ajustes…');
    const { id: _id, updated_at: _u, ...settings } = data.settings;
    await must(client.from('settings').update(settings).eq('id', true).select());
  }

  progress('Restaurando categorías…');
  if (data.categories.length) {
    await must(client.from('categories').insert(data.categories.map(({ updated_at: _u, ...c }) => c)).select('id'));
  }

  // Primero como borrador: un producto publicado exige tener imágenes ya registradas.
  progress('Restaurando productos…');
  if (data.products.length) {
    await must(
      client
        .from('products')
        .insert(data.products.map(({ updated_at: _u, ...p }) => ({ ...p, status: 'borrador' })))
        .select('id'),
    );
  }

  let uploaded = 0;
  const paths = [...files.keys()];
  for (let i = 0; i < paths.length; i++) {
    progress(`Subiendo imagen ${i + 1} de ${paths.length}…`);
    const path = paths[i];
    const { error } = await client.storage
      .from(BUCKET)
      .upload(path, files.get(path)!, { contentType: contentType(path), cacheControl: '31536000', upsert: true });
    if (error) throw error;
    uploaded++;
  }

  progress('Restaurando imágenes de productos…');
  if (data.product_images.length) {
    await must(client.from('product_images').insert(data.product_images).select('id'));
  }

  progress('Restaurando estado de publicación…');
  for (const p of data.products.filter((x) => x.status === 'publicado')) {
    await must(client.from('products').update({ status: 'publicado' }).eq('id', p.id as string).select('id'));
  }

  return { products: data.products.length, images: data.product_images.length, files: uploaded };
}
