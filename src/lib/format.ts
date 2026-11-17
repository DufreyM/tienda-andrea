import type { Availability, Settings } from './types';

export function formatPrice(price: number | null | undefined, currency: string | null | undefined): string | null {
  if (price === null || price === undefined || !currency) return null;
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency, currencyDisplay: 'symbol' }).format(price);
  } catch {
    return `${currency} ${Number(price).toFixed(2)}`;
  }
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  disponible: 'Disponible',
  agotado: 'Agotado',
};

/** Convierte un texto en un enlace legible: "Aceite de Argán 50 ml" → "aceite-de-argan-50-ml". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

export function whatsappLink(settings: Pick<Settings, 'whatsapp'>, message?: string): string | null {
  if (!settings.whatsapp) return null;
  const base = `https://wa.me/${settings.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function productInquiryMessage(productName: string, url: string): string {
  return `Hola, me interesa el producto «${productName}». ¿Me das más información? ${url}`;
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export const DEFAULT_SETTINGS: Settings = {
  business_name: 'Mímate by Andrea',
  tagline: 'Un momento para ti',
  about: null,
  whatsapp: null,
  instagram_url: null,
  facebook_url: null,
  tiktok_url: null,
  email: null,
  default_currency: 'GTQ',
  logo_path: null,
};
