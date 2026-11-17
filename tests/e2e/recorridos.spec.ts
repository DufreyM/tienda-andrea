// Recorridos críticos: administración completa de un producto y su reflejo en la parte pública.
// Requiere el Supabase local y el administrador local (node scripts/admin-local.mjs).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFixtures } from './fixtures';

const files = writeFixtures(join(tmpdir(), 'catalogo-e2e'));
const NAME = `Mascarilla de prueba ${Date.now().toString().slice(-5)}`;
let slug = '';

async function login(page: Page) {
  await page.goto('/admin/entrar');
  await page.getByLabel('Correo').fill('admin@local.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin-local-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Productos', level: 1 })).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test('el área de administración exige sesión', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/entrar\?volver=%2Fadmin/);
  await page.getByLabel('Correo').fill('admin@local.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
});

test('crear un producto con validación, imagen inválida y vista previa', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Nuevo producto' }).click();
  await expect(page.getByRole('heading', { name: 'Nuevo producto' })).toBeVisible();

  // Publicar vacío: mensajes junto a los campos y foco en el primero.
  await page.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByText('Escribe el nombre del producto')).toBeVisible();
  await expect(page.getByLabel(/^Nombre/)).toBeFocused();

  await page.getByLabel(/^Nombre/).fill(NAME);
  await expect(page.getByLabel('Enlace del producto')).toHaveValue(/^mascarilla-de-prueba-\d+$/);
  slug = await page.getByLabel('Enlace del producto').inputValue();
  await page.getByLabel(/^Descripción/).fill('Mascarilla para pruebas automáticas.\n\nSegundo párrafo de la descripción.');
  await page.getByLabel('Categoría').selectOption({ label: 'Mascarillas' });
  await page.getByLabel(/^Marca/).fill('Marca Demo');
  await page.getByLabel(/^Presentación/).fill('500 ml');
  await page.getByLabel(/^Precio/).fill('150,50');
  await expect(page.getByLabel('Moneda')).toHaveValue('GTQ');

  // Archivos inválidos: mensaje útil y el formulario conserva los datos.
  const input = page.locator('#f-images');
  await input.setInputFiles(files.text);
  await expect(page.getByRole('alert').filter({ hasText: 'no es una imagen' })).toBeVisible();
  await input.setInputFiles(files.small);
  await expect(page.getByRole('alert').filter({ hasText: 'muy pequeña' })).toBeVisible();
  await expect(page.getByLabel(/^Nombre/)).toHaveValue(NAME);

  await input.setInputFiles([files.good, files.second]);
  await expect(page.getByText('Se subirá al guardar')).toHaveCount(2);
  await expect(page.getByLabel('Descripción de la foto 1')).toHaveValue(NAME);

  // Vista previa con los datos aún no guardados.
  await page.getByRole('button', { name: 'Vista previa' }).click();
  const preview = page.getByRole('region', { name: 'Vista previa del producto' });
  await expect(preview.getByRole('heading', { name: NAME })).toBeVisible();
  await expect(preview.getByText(/150,50/)).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();

  await page.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByText('Producto publicado')).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/admin\/producto\?id=/);
  await expect(page.getByText('Todo guardado.')).toBeVisible();
});

test('el producto publicado aparece en la parte pública', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByLabel('Buscar por nombre o marca').fill('MASCARILLA de PRUEBA');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByRole('link', { name: NAME })).toBeVisible();
  await page.getByRole('link', { name: NAME }).click();
  await expect(page).toHaveURL(`/producto/${slug}`);
  await expect(page.getByRole('heading', { name: NAME, level: 1 })).toBeVisible();
  await expect(page.getByText('Disponible', { exact: true })).toBeVisible();
  await expect(page.getByText('500 ml', { exact: true })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /productos\/products\//);
  // Sin botones de compra.
  await expect(page.getByRole('button', { name: /comprar|carrito|pagar/i })).toHaveCount(0);
  // «Volver al catálogo» conserva la búsqueda.
  await expect(page.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute('href', /q=MASCARILLA/);
  // Galería: cambiar de foto.
  await page.getByRole('button', { name: /Ver foto 2 de 2/ }).click();
  await expect(page.getByRole('button', { name: /Ver foto 2 de 2/ })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/catalogo?categoria=mascarillas');
  await expect(page.getByRole('link', { name: NAME })).toBeVisible();
  const sitemap = await page.request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain(`/producto/${slug}`);
});

test('editar, marcar agotado, avisar cambios sin guardar, ocultar y eliminar', async ({ page }) => {
  await login(page);
  await page.getByLabel('Buscar').fill(NAME);
  await page.getByRole('link', { name: NAME, exact: true }).click();
  await expect(page.getByLabel(/^Nombre/)).toHaveValue(NAME);

  // Cambios sin guardar: al salir se pide confirmación.
  await page.getByLabel(/^Presentación/).fill('1 L');
  await expect(page.getByText('Cambios sin guardar', { exact: true })).toBeVisible();
  page.once('dialog', (d) => {
    expect(d.message()).toContain('cambios sin guardar');
    d.dismiss();
  });
  await page.getByRole('link', { name: 'Categorías', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/producto/);

  await page.getByLabel('Agotado', { exact: true }).check();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados')).toBeVisible({ timeout: 20_000 });

  const pub = await page.context().newPage();
  await pub.goto(`/producto/${slug}`);
  await expect(pub.getByText('Agotado', { exact: true })).toBeVisible();
  await expect(pub.getByText('1 L', { exact: true })).toBeVisible();

  // Ocultar desde la lista: el enlace público muestra «no disponible».
  await page.goto('/admin');
  await page.getByLabel('Buscar').fill(NAME);
  await page.getByText(`Más acciones para ${NAME}`).click();
  await page.getByRole('button', { name: 'Ocultar (pasar a borrador)' }).click();
  await expect(page.getByText('se ocultó del sitio')).toBeVisible();
  const hidden = await pub.goto(`/producto/${slug}`);
  expect(hidden?.status()).toBe(404);
  await expect(pub.getByRole('heading', { name: 'Este producto no está disponible' })).toBeVisible();

  // Eliminar con confirmación que identifica el producto.
  await page.getByText(`Más acciones para ${NAME}`).click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '¿Eliminar este producto?' });
  await expect(dialog).toContainText(NAME);
  await expect(dialog).toContainText('2 imágenes');
  await dialog.getByRole('button', { name: 'Sí, eliminar' }).click();
  await expect(page.getByText(`Se eliminó «${NAME}».`)).toBeVisible();
  await expect(page.getByRole('link', { name: NAME, exact: true })).toHaveCount(0);
});

test('descargar un respaldo desde el panel', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Respaldo', exact: true }).click();
  await expect(page.getByText(/de 1 GB/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar respaldo (.zip)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^respaldo-catalogo-\d{4}-\d{2}-\d{2}\.zip$/);
  const { readFileSync } = await import('node:fs');
  const { unzipSync, strFromU8 } = await import('fflate');
  const entries = unzipSync(new Uint8Array(readFileSync(await file.path())));
  const data = JSON.parse(strFromU8(entries['datos.json']));
  expect(data.products.length).toBeGreaterThan(0);
  expect(data.categories.length).toBeGreaterThan(0);
  await expect(page.getByText(/Respaldo descargado/)).toBeVisible();
});

test('el panel no se desborda en celular, tableta ni escritorio', async ({ page }) => {
  await login(page);
  const editHref = await page.locator('.product-row__name a').first().getAttribute('href');
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/admin', editHref!, '/admin/producto', '/admin/categorias', '/admin/ajustes', '/admin/respaldo']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.admin-main')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} a ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

test('accesibilidad automática del área privada', async ({ page }) => {
  await page.goto('/admin/entrar');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  const r1 = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(r1.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  await login(page);
  await page.getByRole('link', { name: 'Nuevo producto' }).click();
  await expect(page.getByLabel(/^Nombre/)).toBeVisible();
  const r2 = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(r2.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
