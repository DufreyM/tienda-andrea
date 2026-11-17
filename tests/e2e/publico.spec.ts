// Parte pública: estados vacíos, teclado, accesibilidad y adaptación a anchos de referencia.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/catalogo', '/catalogo?categoria=shampoos', '/producto/mascarilla-bio-plant-2-en-1', '/catalogo?q=zzz-sin-resultados', '/contacto', '/producto/no-existe', '/admin/entrar'];
const WIDTHS = [360, 768, 1440];

test('búsqueda sin resultados y producto inexistente', async ({ page }) => {
  await page.goto('/catalogo?q=zzz-sin-resultados');
  await expect(page.getByRole('heading', { name: 'No encontramos productos' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver todo el catálogo' })).toBeVisible();
  const res = await page.goto('/producto/no-existe');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Este producto no está disponible' })).toBeVisible();
  const draft = await page.goto('/producto/combo-bio-plant'); // borrador de los datos iniciales
  expect(draft?.status()).toBe(404);
});

test('logotipo con tilde, firma y frase de la marca', async ({ page }) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toContainText('Mímate');
  await expect(h1).toContainText('by Andrea');
  await expect(page.getByText('Un momento para ti')).toBeVisible();
  await expect(page).toHaveTitle('Mímate by Andrea');
  const robots = await page.request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /admin');
});

test('navegación con teclado y foco visible', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /ir al inicio/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focused = page.getByRole('link', { name: 'Catálogo', exact: true });
  await expect(focused).toBeFocused();
  const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/catalogo');
});

for (const width of WIDTHS) {
  test(`sin desbordamiento horizontal a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} a ${width}px`).toBeLessThanOrEqual(0);
    }
  });
}

test('accesibilidad automática de las páginas públicas (WCAG 2.2 AA)', async ({ page }) => {
  for (const path of PAGES.filter((p) => !p.startsWith('/admin'))) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(result.violations.map((v) => `${path} ${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  }
});
