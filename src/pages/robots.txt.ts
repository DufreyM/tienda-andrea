import type { APIRoute } from 'astro';

// Excluir /admin de buscadores no es una medida de seguridad: la protección real está en
// Supabase (RLS). Solo evita que el área privada aparezca en resultados.
export const GET: APIRoute = ({ url }) =>
  new Response(`User-agent: *\nDisallow: /admin\n\nSitemap: ${url.origin}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
