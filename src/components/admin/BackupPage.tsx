import { useEffect, useState } from 'preact/hooks';
import { createBackupZip } from '../../lib/backup';
import { friendlyError } from '../../lib/browser/errors';
import { removeFiles, sb } from '../../lib/browser/supabase';
import Icon from '../Icon';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toasts';

const MB = 1024 * 1024;
const fmt = (bytes: number) => (bytes < MB ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / MB).toFixed(1)} MB`);

interface Usage {
  files: number;
  bytes: number;
  db: number;
}

export default function BackupPage() {
  const toast = useToast();
  const [progress, setProgress] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [orphans, setOrphans] = useState<{ name: string; size: number }[] | null>(null);
  const [confirmClean, setConfirmClean] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInfo = async () => {
    setError(null);
    const [st, db, orph] = await Promise.all([sb().rpc('storage_usage'), sb().rpc('database_usage'), sb().rpc('orphan_files')]);
    const failed = st.error ?? db.error ?? orph.error;
    if (failed) return setError(friendlyError(failed, 'No pudimos leer el uso actual.'));
    const row = (st.data as { files: number; bytes: number }[])[0] ?? { files: 0, bytes: 0 };
    setUsage({ files: Number(row.files), bytes: Number(row.bytes), db: Number(db.data) });
    setOrphans((orph.data as { name: string; size: number }[]).map((o) => ({ name: o.name, size: Number(o.size) })));
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const download = async () => {
    setProgress('Preparando respaldo…');
    try {
      const { zip, missing, data } = await createBackupZip(sb(), setProgress);
      const blob = new Blob([zip as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo-catalogo-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast(
        missing.length ? 'error' : 'ok',
        missing.length
          ? `Respaldo descargado, pero faltaron ${missing.length} imágenes que no se pudieron leer.`
          : `Respaldo descargado: ${data.products.length} productos, ${data.product_images.length} fotos (${fmt(blob.size)}).`,
      );
    } catch (err) {
      toast('error', friendlyError(err, 'No pudimos crear el respaldo.'));
    } finally {
      setProgress(null);
    }
  };

  const clean = async () => {
    if (!orphans?.length) return;
    setCleaning(true);
    const ok = await removeFiles(orphans.map((o) => o.name));
    setCleaning(false);
    setConfirmClean(false);
    toast(ok ? 'ok' : 'error', ok ? `Se eliminaron ${orphans.length} archivos sin uso.` : 'No se pudieron eliminar algunos archivos.');
    loadInfo();
  };

  const pct = (value: number, limit: number) => Math.min(100, (value / limit) * 100);

  return (
    <div class="admin-page admin-page--narrow">
      <div class="admin-page__head"><h1>Respaldo y mantenimiento</h1></div>

      <section class="panel">
        <h2 class="panel__title">Descargar respaldo</h2>
        <p>
          Descarga un archivo .zip con todos los productos (también los borradores), categorías, ajustes y fotos. Guárdalo en tu
          computadora o en tu nube personal. Hazlo al menos una vez por semana y al terminar la prueba.
        </p>
        <button type="button" class="btn btn--primary" onClick={download} disabled={Boolean(progress)}>
          {progress ? <span class="spinner" aria-hidden="true" /> : <Icon name="download" size={18} />}
          {progress ? 'Preparando…' : 'Descargar respaldo (.zip)'}
        </button>
        {progress && <p role="status" class="muted">{progress}</p>}
        <p class="hint">Para restaurar un respaldo, sigue la guía «Restaurar un respaldo» del README (requiere ayuda técnica).</p>
      </section>

      <section class="panel">
        <h2 class="panel__title">Uso del plan gratuito</h2>
        {error && <div class="notice notice--error" role="alert"><Icon name="alert" /><p>{error}</p></div>}
        {!usage && !error && <p role="status"><span class="spinner" aria-hidden="true" /> Calculando…</p>}
        {usage && (
          <dl class="usage">
            <div>
              <dt>Fotos almacenadas</dt>
              <dd>
                {fmt(usage.bytes)} de 1 GB ({usage.files} archivos)
                <meter min={0} max={100} value={pct(usage.bytes, 1024 * MB)} low={60} high={80} optimum={0} aria-label="Uso de almacenamiento" />
              </dd>
            </div>
            <div>
              <dt>Base de datos</dt>
              <dd>
                {fmt(usage.db)} de 500 MB
                <meter min={0} max={100} value={pct(usage.db, 500 * MB)} low={60} high={80} optimum={0} aria-label="Uso de base de datos" />
              </dd>
            </div>
          </dl>
        )}
        <p class="hint">
          La transferencia mensual (5 GB) y las visitas se revisan en los paneles de Supabase y Cloudflare; consulta la guía de 30 días.
        </p>
      </section>

      <section class="panel">
        <h2 class="panel__title">Imágenes sin uso</h2>
        <p>Archivos que ya no pertenecen a ningún producto (por ejemplo, si se cortó la conexión al guardar). Se muestran después de 1 hora.</p>
        {orphans === null && !error && <p role="status"><span class="spinner" aria-hidden="true" /> Buscando…</p>}
        {orphans && orphans.length === 0 && (
          <p class="notice notice--ok"><Icon name="check" /> No hay archivos sin uso.</p>
        )}
        {orphans && orphans.length > 0 && (
          <>
            <p>
              <strong>{orphans.length}</strong> archivos ({fmt(orphans.reduce((s, o) => s + o.size, 0))}).
            </p>
            <button type="button" class="btn btn--secondary" onClick={() => setConfirmClean(true)}>
              <Icon name="trash" size={18} /> Eliminar archivos sin uso
            </button>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmClean}
        title="¿Eliminar archivos sin uso?"
        confirmLabel="Sí, eliminar"
        danger
        busy={cleaning}
        onCancel={() => setConfirmClean(false)}
        onConfirm={clean}
      >
        <p>Se borrarán {orphans?.length ?? 0} archivos que no usa ningún producto ni el logotipo. Las fotos de tus productos no se tocan.</p>
      </ConfirmDialog>
    </div>
  );
}
