// Aviso de cambios sin guardar compartido por las pantallas del administrador.
let dirty = false;

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
}

export function setDirty(value: boolean) {
  if (value === dirty) return;
  dirty = value;
  if (value) window.addEventListener('beforeunload', onBeforeUnload);
  else window.removeEventListener('beforeunload', onBeforeUnload);
}

export function isDirty() {
  return dirty;
}

/** Pide confirmación antes de salir si hay cambios sin guardar. */
export function confirmLeave(): boolean {
  if (!dirty) return true;
  const ok = window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?');
  if (ok) setDirty(false);
  return ok;
}
