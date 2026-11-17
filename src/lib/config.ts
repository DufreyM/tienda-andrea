// Valores públicos (se incrustan en el código del navegador). No poner secretos aquí.
export const SUPABASE_URL: string = import.meta.env.PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY: string = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const BUCKET = 'productos';

export const PAGE_SIZE = 12;

/** Límites de imágenes (el bucket los aplica también en el servidor). */
export const IMAGE_LIMITS = {
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxInputBytes: 15 * 1024 * 1024, // archivo original elegido por la persona
  maxUploadBytes: 2 * 1024 * 1024, // archivo optimizado que se sube (igual al límite del bucket)
  minSide: 300,
  largeSide: 1600,
  thumbSide: 600,
  maxPerProduct: 6,
} as const;

export function isConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path || !SUPABASE_URL) return null;
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encoded}`;
}
