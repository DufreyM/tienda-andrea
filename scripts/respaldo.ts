// Crea un respaldo completo (datos + fotos) en respaldos/respaldo-AAAA-MM-DD-HHMM.zip
// Uso: npm run respaldo   (lee las credenciales del archivo .env)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBackupZip } from '../src/lib/backup.ts';
import { adminClient, log } from './comun.ts';

const client = await adminClient();
const { zip, missing, data } = await createBackupZip(client, log);
mkdirSync('respaldos', { recursive: true });
const d = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
const file = join('respaldos', `respaldo-${stamp}.zip`);
writeFileSync(file, zip);
console.log(`\nRespaldo creado: ${file}`);
console.log(`  ${data.products.length} productos, ${data.categories.length} categorías, ${data.product_images.length} fotos, ${(zip.length / 1024 / 1024).toFixed(2)} MB`);
if (missing.length) {
  console.warn(`  Atención: no se pudieron descargar ${missing.length} archivos:\n  ${missing.join('\n  ')}`);
  process.exitCode = 2;
}
