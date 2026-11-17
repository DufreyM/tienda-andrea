export type Availability = 'disponible' | 'agotado';
export type Status = 'borrador' | 'publicado';

export interface Settings {
  business_name: string;
  tagline: string | null;
  about: string | null;
  whatsapp: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  email: string | null;
  default_currency: string;
  logo_path: string | null;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  position: number;
}

export interface PublicCategory {
  name: string;
  slug: string;
  product_count: number;
}

export interface ProductImage {
  id: string;
  path: string;
  thumb_path: string;
  alt: string;
  position: number;
  width: number | null;
  height: number | null;
}

/** Resumen usado en tarjetas del catálogo. */
export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  presentation: string | null;
  price: number | null;
  currency: string | null;
  availability: Availability;
  featured: boolean;
  category_name: string | null;
  category_slug: string | null;
  image_path: string | null;
  image_thumb: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
}

/** Producto completo para la vista de detalle. */
export interface ProductDetailData {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  presentation: string | null;
  price: number | null;
  currency: string | null;
  availability: Availability;
  featured: boolean;
  updated_at: string;
  category: { name: string; slug: string } | null;
  images: ProductImage[];
}

/** Producto tal como lo ve el administrador. */
export interface AdminProduct extends Omit<ProductDetailData, 'category'> {
  status: Status;
  category_id: string | null;
  review_notes: string | null;
  created_at: string;
}
