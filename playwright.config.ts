import { defineConfig, devices } from '@playwright/test';

// Pruebas de extremo a extremo contra la versión compilada ejecutada en el entorno de
// Cloudflare (wrangler dev) y el Supabase local.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8787',
    locale: 'es-GT',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:8787',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
