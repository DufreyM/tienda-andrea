import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  open: boolean;
  title: string;
  children: ComponentChildren;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo modal accesible (usa <dialog>: atrapa el foco y se cierra con Escape). */
export default function ConfirmDialog({ open, title, children, confirmLabel, danger, busy, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      cancelRef.current?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      class="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="dialog-title">{title}</h2>
      <div class="dialog__body">{children}</div>
      <div class="actions dialog__actions">
        <button ref={cancelRef} type="button" class="btn btn--ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="button" class={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={busy}>
          {busy && <span class="spinner" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
