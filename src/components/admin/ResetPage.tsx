import { useEffect, useState } from 'preact/hooks';
import { sb } from '../../lib/browser/supabase';
import { friendlyError } from '../../lib/browser/errors';
import Icon from '../Icon';

/** Página a la que lleva el enlace de recuperación de contraseña enviado por Supabase. */
export default function ResetPage() {
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = sb().auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) setReady('ok');
    });
    // Margen para que Supabase procese el enlace del correo.
    const timer = setTimeout(async () => {
      const { data } = await sb().auth.getSession();
      setReady((r) => (r === 'ok' || data.session ? 'ok' : 'invalid'));
    }, 1500);
    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      const { error: upError } = await sb().auth.updateUser({ password });
      if (upError) throw upError;
      await sb().auth.signOut();
      location.replace('/admin/entrar?motivo=restablecida');
    } catch (err) {
      setError(friendlyError(err, 'No pudimos cambiar la contraseña. Solicita un nuevo enlace.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="admin-center">
      <div class="auth-card">
        <h1>Nueva contraseña</h1>
        {ready === 'checking' && (
          <p role="status"><span class="spinner" aria-hidden="true" /> Verificando el enlace…</p>
        )}
        {ready === 'invalid' && (
          <div class="notice notice--error" role="alert">
            <Icon name="alert" />
            <p>
              El enlace no es válido o ya expiró. <a href="/admin/entrar">Solicita uno nuevo</a> desde «¿Olvidaste tu contraseña?».
            </p>
          </div>
        )}
        {ready === 'ok' && (
          <form onSubmit={submit} noValidate>
            {error && (
              <div class="notice notice--error" role="alert">
                <Icon name="alert" />
                <p>{error}</p>
              </div>
            )}
            <div class="field">
              <label for="new-pass">Nueva contraseña</label>
              <input id="new-pass" class="input" type="password" autocomplete="new-password" minLength={8} value={password} onInput={(e) => setPassword(e.currentTarget.value)} aria-describedby="new-pass-hint" />
              <p class="hint" id="new-pass-hint">Mínimo 8 caracteres. Usa una contraseña que no uses en otros sitios.</p>
            </div>
            <div class="field">
              <label for="confirm-pass">Repite la contraseña</label>
              <input id="confirm-pass" class="input" type="password" autocomplete="new-password" value={confirm} onInput={(e) => setConfirm(e.currentTarget.value)} />
            </div>
            <button class="btn btn--primary btn--block" type="submit" disabled={busy}>
              {busy && <span class="spinner" aria-hidden="true" />}
              Guardar contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
