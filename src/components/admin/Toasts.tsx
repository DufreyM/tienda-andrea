import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useState } from 'preact/hooks';
import Icon from '../Icon';

type Kind = 'ok' | 'error' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

const Ctx = createContext<(kind: Kind, text: string) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

let seq = 0;

/** Mensajes de estado. Los de éxito se ocultan solos; los de error quedan hasta cerrarlos. */
export function ToastProvider({ children }: { children: ComponentChildren }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((kind: Kind, text: string) => {
    const id = ++seq;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    if (kind !== 'error') setTimeout(() => dismiss(id), 6000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div class="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} class={`toast toast--${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <Icon name={t.kind === 'ok' ? 'check' : t.kind === 'error' ? 'alert' : 'info'} />
            <p>{t.text}</p>
            <button type="button" class="toast__close" onClick={() => dismiss(t.id)} aria-label="Cerrar mensaje">
              <Icon name="x" size={18} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
