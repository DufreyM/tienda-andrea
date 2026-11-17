import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { BUCKET, SUPABASE_KEY, SUPABASE_URL } from '../config';

let client: SupabaseClient | null = null;

/** Cliente del navegador para el área de administración (guarda la sesión). */
export function sb(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'catalogo-admin' },
    });
  }
  return client;
}

export function bucket() {
  return sb().storage.from(BUCKET);
}

/** Borra archivos del almacenamiento sin interrumpir el flujo si falla (quedan para «Mantenimiento»). */
export async function removeFiles(paths: string[]): Promise<boolean> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return true;
  try {
    const { error } = await bucket().remove(unique);
    return !error;
  } catch {
    return false;
  }
}
