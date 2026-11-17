import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'preact/hooks';
import { isConfigured } from '../../lib/config';
import { sb } from '../../lib/browser/supabase';
import Icon from '../Icon';
import Wordmark from '../Wordmark';
import { DEFAULT_SETTINGS } from '../../lib/format';
import { confirmLeave } from './guard';
import { ToastProvider } from './Toasts';
import ProductList from './ProductList';
import ProductEditor from './ProductEditor';
import CategoriesPage from './CategoriesPage';
import SettingsPage from './SettingsPage';
import BackupPage from './BackupPage';
import LoginPage from './LoginPage';
import ResetPage from './ResetPage';

export type AdminPage = 'productos' | 'producto' | 'categorias' | 'ajustes' | 'respaldo' | 'entrar' | 'restablecer';

const NAV: { page: AdminPage; href: string; label: string; icon: 'list' | 'tag' | 'settings' | 'download' }[] = [
  { page: 'productos', href: '/admin', label: 'Productos', icon: 'list' },
  { page: 'categorias', href: '/admin/categorias', label: 'Categorías', icon: 'tag' },
  { page: 'ajustes', href: '/admin/ajustes', label: 'Ajustes', icon: 'settings' },
  { page: 'respaldo', href: '/admin/respaldo', label: 'Respaldo', icon: 'download' },
];

export default function AdminApp({ page }: { page: AdminPage }) {
  return <ToastProvider>{renderPage(page)}</ToastProvider>;
}

function renderPage(page: AdminPage) {
  if (!isConfigured()) {
    return (
      <div class="admin-center">
        <div class="notice notice--error" role="alert">
          <Icon name="alert" />
          <p>Falta configurar la conexión con Supabase (variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_PUBLISHABLE_KEY). Revisa el README.</p>
        </div>
      </div>
    );
  }
  if (page === 'entrar') return <LoginPage />;
  if (page === 'restablecer') return <ResetPage />;
  return <Protected page={page} />;
}

type GuardState = { kind: 'checking' } | { kind: 'ok'; session: Session } | { kind: 'error'; message: string };

function Protected({ page }: { page: AdminPage }) {
  const [state, setState] = useState<GuardState>({ kind: 'checking' });

  useEffect(() => {
    let active = true;
    const toLogin = (reason?: string) => {
      const back = location.pathname + location.search;
      const qs = new URLSearchParams({ volver: back });
      if (reason) qs.set('motivo', reason);
      location.replace(`/admin/entrar?${qs}`);
    };
    (async () => {
      try {
        const { data } = await sb().auth.getSession();
        if (!data.session) return toLogin();
        const { data: isAdmin, error } = await sb().rpc('is_admin');
        if (error) throw error;
        if (!isAdmin) {
          await sb().auth.signOut();
          return toLogin('permiso');
        }
        if (active) setState({ kind: 'ok', session: data.session });
      } catch {
        if (active) setState({ kind: 'error', message: 'No pudimos comprobar tu sesión. Revisa tu conexión y recarga la página.' });
      }
    })();
    const { data: sub } = sb().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') toLogin('salida');
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state.kind === 'checking') {
    return (
      <div class="admin-center" role="status">
        <span class="spinner" aria-hidden="true" /> Comprobando sesión…
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div class="admin-center">
        <div class="notice notice--error" role="alert">
          <Icon name="alert" />
          <p>{state.message}</p>
        </div>
      </div>
    );
  }

  const current = page === 'producto' ? 'productos' : page;
  const signOut = async () => {
    if (!confirmLeave()) return;
    await sb().auth.signOut();
  };

  return (
    <div class="admin">
      <header class="admin-header">
        <div class="admin-header__inner">
          <a class="admin-brand" href="/admin" onClick={(e) => !confirmLeave() && e.preventDefault()}>
            <Wordmark name={DEFAULT_SETTINGS.business_name} variant="admin" />
            <span class="admin-brand__label">Administración</span>
          </a>
          <nav aria-label="Administración" class="admin-nav">
            <ul>
              {NAV.map((n) => (
                <li key={n.page}>
                  <a
                    href={n.href}
                    aria-current={current === n.page ? 'page' : undefined}
                    onClick={(e) => !confirmLeave() && e.preventDefault()}
                  >
                    <Icon name={n.icon} size={18} />
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div class="admin-header__end">
            <a class="btn btn--ghost btn--sm" href="/" target="_blank" rel="noopener">
              <Icon name="external" size={16} /> Ver sitio<span class="visually-hidden"> (se abre en otra pestaña)</span>
            </a>
            <button type="button" class="btn btn--ghost btn--sm" onClick={signOut}>
              <Icon name="logout" size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main id="contenido" class="admin-main" tabIndex={-1}>
        {page === 'productos' && <ProductList />}
        {page === 'producto' && <ProductEditor />}
        {page === 'categorias' && <CategoriesPage />}
        {page === 'ajustes' && <SettingsPage />}
        {page === 'respaldo' && <BackupPage />}
      </main>
    </div>
  );
}
