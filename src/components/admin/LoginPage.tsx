import { useEffect, useRef, useState } from 'preact/hooks';
import { sb } from '../../lib/browser/supabase';
import { friendlyError } from '../../lib/browser/errors';
import Icon from '../Icon';

const REASONS: Record<string, { kind: 'info' | 'error'; text: string }> = {
  permiso: { kind: 'error', text: 'Esta cuenta no tiene permisos de administración.' },
  salida: { kind: 'info', text: 'Cerraste sesión correctamente.' },
  restablecida: { kind: 'info', text: 'Tu contraseña se actualizó. Inicia sesión con la nueva contraseña.' },
};

function safeReturn(value: string | null): string {
  return value && value.startsWith('/admin') && !value.startsWith('//') && !value.startsWith('/admin/entrar') ? value : '/admin';
}

export default function LoginPage() {
  const params = new URLSearchParams(location.search);
  const reason = REASONS[params.get('motivo') ?? ''];
  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Si ya hay sesión de administrador, ir directo al panel.
    sb().auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: isAdmin } = await sb().rpc('is_admin');
      if (isAdmin) location.replace(safeReturn(params.get('volver')));
    });
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const login = async (e: Event) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await sb().auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      const { data: isAdmin, error: rpcError } = await sb().rpc('is_admin');
      if (rpcError) throw rpcError;
      if (!isAdmin) {
        await sb().auth.signOut();
        setError(REASONS.permiso.text);
        return;
      }
      location.replace(safeReturn(params.get('volver')));
    } catch (err) {
      setError(friendlyError(err, 'No pudimos iniciar sesión. Inténtalo de nuevo.'));
    } finally {
      setBusy(false);
    }
  };

  const recover = async (e: Event) => {
    e.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Escribe un correo válido.');
      return;
    }
    setBusy(true);
    try {
      const { error: recError } = await sb().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${location.origin}/admin/restablecer`,
      });
      if (recError) throw recError;
      setSent(true);
    } catch (err) {
      setError(friendlyError(err, 'No pudimos enviar el correo. Inténtalo más tarde.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="admin-center">
      <div class="auth-card">
        <h1>{mode === 'login' ? 'Iniciar sesión' : 'Recuperar acceso'}</h1>
        <p class="muted">Área privada para administrar el catálogo.</p>

        {reason && !error && mode === 'login' && (
          <div class={`notice notice--${reason.kind === 'error' ? 'error' : 'info'}`} role="status">
            <Icon name={reason.kind === 'error' ? 'alert' : 'info'} />
            <p>{reason.text}</p>
          </div>
        )}
        {error && (
          <div class="notice notice--error" role="alert" tabIndex={-1} ref={errorRef}>
            <Icon name="alert" />
            <p>{error}</p>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={login} noValidate>
            <div class="field">
              <label for="email">Correo</label>
              <input id="email" class="input" type="email" autocomplete="username" value={email} onInput={(e) => setEmail(e.currentTarget.value)} required />
            </div>
            <div class="field">
              <label for="password">Contraseña</label>
              <div class="password">
                <input
                  id="password"
                  class="input"
                  type={(showPassword ? 'text' : 'password') as 'text'}
                  autocomplete="current-password"
                  value={password}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  required
                />
                <button type="button" class="btn btn--ghost btn--sm" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            <button class="btn btn--primary btn--block" type="submit" disabled={busy}>
              {busy && <span class="spinner" aria-hidden="true" />}
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            <p class="auth-alt">
              <button type="button" class="link-button" onClick={() => { setMode('recover'); setError(null); }}>
                ¿Olvidaste tu contraseña?
              </button>
            </p>
          </form>
        ) : sent ? (
          <div>
            <div class="notice notice--ok" role="status">
              <Icon name="check" />
              <p>Si el correo corresponde a la cuenta de administración, recibirás un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.</p>
            </div>
            <p class="auth-alt">
              <button type="button" class="link-button" onClick={() => { setMode('login'); setSent(false); }}>
                Volver a iniciar sesión
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={recover} noValidate>
            <div class="field">
              <label for="email-rec">Correo de la cuenta</label>
              <input id="email-rec" class="input" type="email" autocomplete="username" value={email} onInput={(e) => setEmail(e.currentTarget.value)} required />
            </div>
            <button class="btn btn--primary btn--block" type="submit" disabled={busy}>
              {busy && <span class="spinner" aria-hidden="true" />}
              {busy ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <p class="auth-alt">
              <button type="button" class="link-button" onClick={() => { setMode('login'); setError(null); }}>
                Volver a iniciar sesión
              </button>
            </p>
          </form>
        )}
        <p class="auth-alt"><a href="/">Volver al sitio</a></p>
      </div>
    </div>
  );
}
