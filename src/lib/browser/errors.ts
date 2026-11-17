// Traduce errores técnicos de Supabase a mensajes comprensibles en español.

interface AnyError {
  message?: string;
  code?: string;
  hint?: string | null;
  details?: string | null;
  status?: number;
  statusCode?: string | number;
  name?: string;
}

export function friendlyError(err: unknown, fallback = 'Ocurrió un problema inesperado. Inténtalo de nuevo.'): string {
  if (!err) return fallback;
  const e = err as AnyError;
  const msg = `${e.message ?? ''} ${e.details ?? ''}`.toLowerCase();
  const code = e.code ?? '';
  const status = Number(e.status ?? e.statusCode ?? 0);

  if (e.name === 'TypeError' || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo. Tus cambios siguen en el formulario.';
  }
  if (e.hint === 'publicar_sin_imagen' || msg.includes('al menos una imagen')) {
    return 'Para publicar, el producto necesita al menos una imagen.';
  }
  if (code === '23505') {
    if (msg.includes('products_slug')) return 'Ya existe otro producto con ese enlace. Cambia el enlace (slug) o el nombre.';
    if (msg.includes('categories')) return 'Ya existe una categoría con ese nombre.';
    return 'Ese dato ya está registrado.';
  }
  if (code === '23503') {
    return 'No se puede eliminar la categoría porque tiene productos. Cámbialos de categoría primero.';
  }
  if (code === '23514') {
    if (msg.includes('publish_requirements')) return 'Para publicar, completa la descripción (mínimo 10 caracteres) y elige una categoría.';
    if (msg.includes('price_currency')) return 'Si indicas un precio, elige también la moneda (y viceversa).';
    if (msg.includes('whatsapp')) return 'El número de WhatsApp debe tener solo dígitos, con código de país (8 a 15 dígitos).';
    if (msg.includes('_url')) return 'Los enlaces de redes deben empezar con https://';
    return 'Algún dato no es válido. Revisa los campos marcados.';
  }
  if (code === 'P0002') return e.message ?? 'El elemento ya no existe. Recarga la página.';
  if (code === '42501' || msg.includes('row-level security') || msg.includes('no autorizado') || status === 401 || status === 403) {
    return 'Tu sesión no tiene permiso para esta acción. Vuelve a iniciar sesión.';
  }
  if (code === 'PGRST301' || msg.includes('jwt expired')) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (status === 413 || msg.includes('payload too large') || msg.includes('exceeded the maximum allowed size')) {
    return 'La imagen supera el tamaño máximo permitido (2 MB) incluso después de optimizarla.';
  }
  if (msg.includes('mime type') || msg.includes('invalid_mime_type')) return 'Formato no permitido. Usa fotos JPG, PNG o WebP.';
  if (msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('email not confirmed')) return 'El correo de esta cuenta aún no está confirmado.';
  if (msg.includes('rate limit') || status === 429) return 'Se hicieron demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  if (msg.includes('email address not authorized')) {
    return 'Supabase no permite enviar correos a esta dirección con el servicio de correo gratuito. Revisa la guía de recuperación en el README.';
  }
  if (msg.includes('password should be') || msg.includes('weak password')) return 'La contraseña es muy débil. Usa al menos 8 caracteres combinando letras y números.';
  return fallback;
}
