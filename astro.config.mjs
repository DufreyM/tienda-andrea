// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    // Las fotos se optimizan en el navegador antes de subirlas; no se usa Cloudflare Images.
    imageService: 'passthrough',
  }),
  integrations: [preact()],
  server: { port: 4321, host: true },
  security: { checkOrigin: true },
  // URLs sin barra final: /admin/entrar en lugar de /admin/entrar/.
  trailingSlash: 'never',
  build: { format: 'file' },
  // Sin sesiones de servidor: así no se crea un almacén KV en Cloudflare.
  session: false,
  vite: {
    // Evita que Vite reoptimice dependencias a mitad de la sesión de desarrollo.
    optimizeDeps: { include: ['preact', 'preact/hooks', 'preact/jsx-runtime', '@supabase/supabase-js', 'fflate'] },
  },
});
