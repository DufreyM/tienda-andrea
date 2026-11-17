// Restaura un respaldo .zip. El catálogo queda IGUAL al respaldo: se borran primero los
// productos y categorías actuales. Antes de restaurar se crea un respaldo de seguridad.
// Uso: npm run restaurar -- respaldos/respaldo-2026-11-16-2300.zip --confirmar
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBackupZip, parseBackupZip, restoreBackup } from '../src/lib/backup.ts';
import { adminClient, log } from './comun.ts';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('Indica el archivo: npm run restaurar -- respaldos/respaldo-....zip --confirmar');
  process.exit(1);
}
const backup = parseBackupZip(new Uint8Array(readFileSync(file)));
console.log(`Respaldo del ${backup.data.exported_at}: ${backup.data.products.length} productos, ${backup.files.size} archivos.`);
if (!args.includes('--confirmar')) {
  console.log('\nEsto reemplazará el catálogo actual. Vuelve a ejecutar el comando añadiendo --confirmar para continuar.');
  process.exit(0);
}

const client = await adminClient();
console.log('\n1) Respaldo de seguridad del estado actual');
const safety = await createBackupZip(client, log);
mkdirSync('respaldos', { recursive: true });
const safetyFile = join('respaldos', `antes-de-restaurar-${Date.now()}.zip`);
writeFileSync(safetyFile, safety.zip);
log(`Guardado en ${safetyFile}`);

console.log('\n2) Restauración');
const result = await restoreBackup(client, backup, log);
console.log(`\nListo: ${result.products} productos, ${result.images} fotos registradas, ${result.files} archivos subidos.`);
console.log('Revisa «Respaldo > Imágenes sin uso» en el panel para limpiar archivos antiguos que hayan quedado.');
