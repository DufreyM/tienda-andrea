import type { APIRoute } from 'astro';
import { getPublicCategories, getSitemapEntries } from '../lib/server/db';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${origin}/` },
    { loc: `${origin}/catalogo` },
    { loc: `${origin}/contacto` },
  ];
  try {
    const [products, categories] = await Promise.all([getSitemapEntries(), getPublicCategories()]);
    for (const c of categories) if (c.product_count > 0) urls.push({ loc: `${origin}/catalogo?categoria=${c.slug}` });
    for (const p of products) urls.push({ loc: `${origin}/producto/${p.slug}`, lastmod: p.updated_at.slice(0, 10) });
  } catch {
    // Si la base de datos no responde, se publica al menos el mapa de páginas fijas.
  }
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((u) => `  <url><loc>${escape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
      .join('\n') +
    '\n</urlset>\n';
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
