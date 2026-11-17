# Resultados de pruebas

Ejecutadas el **16/11/2026** en Windows 11 con:

- Supabase local (CLI 3.2, Postgres 17, Docker).
- La versión compilada del sitio en el runtime de Cloudflare (`wrangler dev`, workerd).
- Chromium (Playwright 1.65).

## Automatizadas

### Permisos y operaciones de base de datos: `npm run test:db` → **11 de 11 correctas**

| Prueba | Qué comprueba |
| --- | --- |
| Visitante: borradores | No ve borradores ni por consulta directa, ni por slug, ni en la búsqueda |
| Visitante: notas internas | No puede leer la columna `review_notes` |
| Visitante: escritura | No puede crear, modificar ni eliminar productos, categorías, imágenes ni ajustes (se comprueba que los datos no cambian) |
| Visitante: funciones | No puede llamar `save_product`, `delete_product`, `orphan_files`, `storage_usage` ni `database_usage` |
| Visitante: archivos | No puede subir ni listar archivos del bucket |
| Usuario con sesión no administrador | No puede escribir, subir archivos ni usar funciones de administración; `is_admin` = false |
| Administrador: publicar | Crea un borrador. No puede publicarlo sin imagen y sí con imagen. El visitante lo ve con su foto (HTTP 200) y sin notas |
| Administrador: proteger | No puede dejar sin imágenes un producto publicado. Al ocultarlo, el visitante deja de verlo a él y a sus imágenes |
| Administrador: reglas | Exige descripción (mín. 10) y categoría para publicar, y precio junto con moneda |
| Administrador: archivos | Al eliminar, devuelve solo los archivos que no usa otro producto (un archivo compartido no se borra). Eliminar dos veces da «ya no existe» |
| Almacenamiento | Rechaza `text/plain` y archivos de más de 2 MB |
| Categorías | Crea y elimina. No permite eliminar una con productos |

### Recorridos en navegador: `npm run test:e2e` → **14 de 14 correctas**

| Prueba | Qué comprueba |
| --- | --- |
| Búsqueda sin resultados y producto inexistente | Mensajes y salidas claras. HTTP 404 para producto inexistente y para un borrador |
| Marca | `<h1>` con «Mímate» (con tilde) y «by Andrea», frase «Un momento para ti», título de página y `robots.txt` excluye `/admin` |
| Teclado | Enlace «Saltar al contenido» visible al enfocarlo. Recorrido por el menú con foco visible. Enter navega |
| Desbordamiento 360 / 768 / 1440 px | Sin desplazamiento horizontal en inicio, catálogo, catálogo filtrado, búsqueda vacía, detalle, contacto, 404 y acceso al panel |
| Accesibilidad pública | axe-core con reglas WCAG 2.0/2.1/2.2 A y AA: **0 incumplimientos** |
| Acceso al panel | `/admin` sin sesión redirige al inicio de sesión. Contraseña incorrecta → mensaje claro |
| Crear producto | Validación junto al campo y foco en el primer error. Enlace generado. Moneda propuesta (GTQ). Archivo de texto y foto de 120 px rechazados **sin perder el formulario**. Dos fotos optimizadas. Vista previa con datos sin guardar. Publicar |
| Reflejo público | Búsqueda sin distinguir mayúsculas. Detalle con disponibilidad, presentación y `og:image`. Sin botones de compra. «Volver al catálogo» conserva la búsqueda. Galería. Filtro por categoría. Sitemap |
| Editar y eliminar | Aviso de cambios sin guardar al salir. Marcar agotado (visible en público). Ocultar (enlace público → 404 «no disponible»). Eliminar con diálogo que muestra nombre y número de fotos |
| Respaldo en el panel | Descarga un .zip válido con `datos.json`, productos y categorías |
| Panel en 360 / 768 / 1440 px | Sin desbordamiento en lista, editor (nuevo y existente), categorías, ajustes y respaldo |
| Accesibilidad del panel | axe-core en inicio de sesión y editor: **0 incumplimientos** |

Las pruebas de desbordamiento detectaron un error real: los chips de categoría ensanchaban
`/catalogo` en 360 y 768 px. Se corrigió y se volvió a probar.

### Otras comprobaciones

- `npm run contraste`: los 25 pares de colores de la paleta cumplen WCAG 2.2 AA (texto 4,5:1; texto
  grande y gráficos 3:1).
- `astro check`: 0 errores de tipos.
- Compilación: sin almacenamiento KV ni Cloudflare Images (no se crean recursos extra).

## Respaldo y restauración (comprobado una vez con datos de prueba)

1. Catálogo local con 6 productos (5 publicados con foto, 1 borrador) → `npm run respaldo`:
   .zip de 0,53 MB con 10 archivos.
2. Se alteraron los datos:
   - Se eliminó el minoxidil y se borraron sus fotos del almacenamiento.
   - Se renombró el shampoo.
   - Se cambió el nombre del negocio.
3. `npm run restaurar -- respaldo.zip` sin `--confirmar` solo informó el contenido. Con
   `--confirmar`, primero guardó un respaldo de seguridad y después restauró.
4. Resultado: el estado (productos, nombres, estados de publicación, número de fotos, nombre del
   negocio) quedó **idéntico** al original, y todas las fotos respondieron HTTP 200.

## Revisión manual

Capturas revisadas en 390 px y 1440 px:

- Inicio con logotipo, ramita y frase.
- Catálogo.
- Detalle.
- Lista y editor del panel.

Se corrigieron dos detalles: la alineación de campos en el editor y el texto de ejemplo del
buscador, que se cortaba a 360 px.

## Pendiente o no verificado

- **Despliegue real** en Cloudflare y Supabase: requiere tus cuentas (pasos en el README). Después
  conviene repetir a mano el recorrido «crear, publicar, ocultar y eliminar» en el sitio publicado.
- **Correo de recuperación de contraseña** con el servicio gratuito de Supabase: no probado (solo
  existe en producción). Pruébalo el día 0.
- **Safari / iPhone y Firefox**: las pruebas usaron Chromium. Safari no genera WebP desde el
  navegador; el código usa JPEG como alternativa, pero no se probó en un dispositivo real.
- **Límite de 10 ms de CPU** de Cloudflare: no se puede medir en local. Revisa los errores 1102 en
  las métricas tras desplegar.
- **Lector de pantalla** (NVDA, VoiceOver): no se hizo una prueba manual. axe-core cubre reglas
  automáticas, no toda la experiencia.
- **Fotos de las capturas**: no se publicaron. Hay que confirmar si son propias o autorizadas antes
  de usarlas.
