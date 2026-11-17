// Consultas de la parte pública. Usan la clave pública: RLS garantiza que solo se lean
// productos publicados, aunque alguien intente pedir otros datos.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PAGE_SIZE, SUPABASE_KEY, SUPABASE_URL } from '../config';
import { DEFAULT_SETTINGS } from '../format';
import type { ProductDetailData, ProductSummary, PublicCategory, Settings } from '../types';

export class DataError extends Error {}

function client(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new DataError('Faltan las variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const SETTINGS_COLUMNS =
  'business_name,tagline,about,whatsapp,instagram_url,facebook_url,tiktok_url,email,default_currency,logo_path,updated_at';

export async function getSettings(): Promise<Settings> {
  try {
    const { data, error } = await client().from('settings').select(SETTINGS_COLUMNS).maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return data as Settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface CatalogQuery {
  q?: string;
  category?: string;
  page?: number;
  featuredOnly?: boolean;
  pageSize?: number;
}

export async function searchCatalog(query: CatalogQuery): Promise<{ items: ProductSummary[]; total: number }> {
  const pageSize = query.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);
  const { data, error } = await client().rpc('search_catalog', {
    p_q: query.q?.slice(0, 80) || null,
    p_category: query.category || null,
    p_featured_only: query.featuredOnly ?? false,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw new DataError(error.message);
  const rows = (data ?? []) as (ProductSummary & { total_count: number })[];
  return { items: rows, total: rows.length ? Number(rows[0].total_count) : 0 };
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  const { data, error } = await client().rpc('public_categories');
  if (error) throw new DataError(error.message);
  return (data ?? []).map((c: PublicCategory) => ({ ...c, product_count: Number(c.product_count) }));
}

const DETAIL_COLUMNS =
  'id,name,slug,description,brand,presentation,price,currency,availability,featured,updated_at,' +
  'category:categories(name,slug),images:product_images(id,path,thumb_path,alt,position,width,height)';

export async function getProductBySlug(slug: string): Promise<ProductDetailData | null> {
  if (!/^[a-z0-9-]{1,140}$/.test(slug)) return null;
  const { data, error } = await client()
    .from('products')
    .select(DETAIL_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'publicado')
    .maybeSingle();
  if (error) throw new DataError(error.message);
  if (!data) return null;
  const product = data as unknown as ProductDetailData;
  product.images = [...(product.images ?? [])].sort((a, b) => a.position - b.position);
  return product;
}

export async function getSitemapEntries(): Promise<{ slug: string; updated_at: string }[]> {
  const { data, error } = await client()
    .from('products')
    .select('slug,updated_at')
    .eq('status', 'publicado')
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) throw new DataError(error.message);
  return data ?? [];
}
