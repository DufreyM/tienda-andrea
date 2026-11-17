# Mímate by Andrea · Catálogo web

Catálogo público de productos de belleza y cuidado personal con un área privada para administrarlos.
Sin carrito ni pagos: cada producto se puede consultar por WhatsApp.

- **Parte pública:** inicio con destacados, catálogo con búsqueda (sin distinguir tildes) y filtro por
  categoría, detalle de producto, contacto, `sitemap.xml` y `robots.txt`.
- **Administración (`/admin`):** inicio y cierre de sesión, recuperación de contraseña, crear, editar,
  previsualizar, publicar, ocultar, destacar, marcar agotado y eliminar productos; categorías; ajustes
  del negocio (nombre, frase, WhatsApp, redes, moneda, logotipo); respaldo descargable y limpieza de
  imágenes sin uso.

| Documento | Para quién |
| --- | --- |
| [docs/guia-administracion.md](docs/guia-administracion.md) | Quien administra el catálogo (sin conocimientos técnicos) |
| [docs/guia-30-dias.md](docs/guia-30-dias.md) | Plan de la prueba de 30 días |
| [docs/decisiones.md](docs/decisiones.md) | Referencias, decisiones de diseño, paleta y arquitectura |
| [docs/servicios-gratuitos.md](docs/servicios-gratuitos.md) | Planes gratuitos, límites, consumo estimado y cómo evitar cobros |
| [docs/pruebas.md](docs/pruebas.md) | Qué se probó, resultados y pendientes |

## Arquitectura

```
Navegador ──► Cloudflare Workers (Astro: páginas públicas generadas en el servidor + /admin estático)
   │                     │
   │                     └──► Supabase (lectura pública con RLS)
   └── /admin ──────────────► Supabase Auth + Postgres + Storage (escritura solo administrador, RLS)
```

- **Astro 7 + Preact** en **Cloudflare Workers** (plan gratuito). Las páginas públicas se generan en el
  servidor para que los buscadores lean el contenido. El área `/admin` son páginas estáticas.
- **Supabase** (plan gratuito): base de datos Postgres, autenticación y almacenamiento de fotos.
- **Seguridad en la base de datos**, no en el frontend: Row Level Security permite a los visitantes leer
  solo productos publicados y a la cuenta administradora escribir. El bucket de fotos limita tipo
  (JPG, PNG, WebP) y tamaño (2 MB) en el servidor.
- Las fotos se **optimizan en el navegador** antes de subirlas (máx. 1600 px, WebP) y se genera una
  miniatura de 600 px.

Estructura principal:

```
supabase/migrations/   Esquema, políticas RLS, funciones y datos iniciales
src/pages/             Páginas públicas, sitemap, robots y /admin
src/components/        Tarjeta, detalle, logotipo y componentes de administración
src/lib/               Configuración, consultas, optimización de imágenes, respaldo
src/styles/            Variables de diseño (tokens.css) y estilos
scripts/               Respaldo, restauración, contraste y administrador local
tests/                 Pruebas de permisos (Vitest) y recorridos en navegador (Playwright)
```

## Requisitos

- Node.js 22.6 o superior.
- Para desarrollo local con base de datos: Docker Desktop.
- Cuentas gratuitas en [Supabase](https://supabase.com) y [Cloudflare](https://dash.cloudflare.com/sign-up) (sin tarjeta).

## Desarrollo local

```bash
npm install
npx supabase start            # levanta Postgres, Auth y Storage locales (Docker) y aplica migraciones
node scripts/admin-local.mjs  # crea admin@local.test / admin-local-123 SOLO en el entorno local
cp .env.example .env          # y pega la URL y la PUBLISHABLE_KEY que muestra `npx supabase status`
npm run dev                   # http://localhost:4321
```

> En Windows, si los puertos 543xx están reservados, este proyecto ya usa los 564xx
> (ver `supabase/config.toml`).

## Variables de entorno

| Variable | Dónde se usa | Valor |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | Sitio (se incrusta al compilar) | Project URL de Supabase |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sitio (se incrusta al compilar) | Clave **publishable** (o *anon*). Es pública por diseño |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Solo scripts de respaldo en tu computadora | Credenciales del administrador |

Nunca uses la clave `service_role` / `secret` en el sitio ni la subas al repositorio. El sitio no la
necesita. `.env` está en `.gitignore`.

## Publicar (paso a paso, gratis)

### 1. Supabase

1. Crea una cuenta y un proyecto nuevo (plan **Free**). Elige la región más cercana a tu clientela
   y guarda la contraseña de la base de datos en un lugar seguro.
2. Aplica el esquema. Opción A, con la terminal:
   ```bash
   npx supabase login
   npx supabase link --project-ref TU_REFERENCIA   # está en la URL del panel del proyecto
   npx supabase db push
   ```
   Opción B, sin terminal: en **SQL Editor**, pega y ejecuta en orden el contenido de
   `supabase/migrations/20261116000000_esquema_catalogo.sql` y luego
   `supabase/migrations/20261116000100_datos_iniciales.sql`.
3. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**. Nadie
   puede registrarse; la única cuenta es la que crees tú.
4. **Authentication → URL Configuration**: en *Site URL* pon la dirección del sitio (paso 2 de
   Cloudflare, p. ej. `https://tienda-andrea.TU-CUENTA.workers.dev`) y en *Redirect URLs* agrega
   `https://tienda-andrea.TU-CUENTA.workers.dev/admin/restablecer`.
5. Crea la cuenta administradora (ver [Administrador](#administrador)).
6. **Project Settings → API Keys**: copia la *Project URL* y la *Publishable key*.

### 2. Cloudflare Workers

1. En el panel de Cloudflare: **Workers & Pages → Create → Import a repository** y conecta GitHub
   con el repositorio `tienda-andrea`.
2. Configuración de compilación:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - **Variables de compilación** (*Build variables*): `PUBLIC_SUPABASE_URL` y
     `PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores del paso anterior.
3. Guarda y despliega. El sitio queda en `https://tienda-andrea.TU-CUENTA.workers.dev` con HTTPS.
   Cada `git push` a `main` vuelve a publicar.

Alternativa por terminal: completa `.env`, ejecuta `npx wrangler login` y luego `npm run deploy`.

### 3. Mantener activo (recomendado)

Supabase pausa los proyectos gratuitos tras **1 semana sin actividad**. Con visitas reales el sitio
consulta la base de datos, pero para evitar pausas en semanas tranquilas está el flujo
`.github/workflows/mantener-activo.yml`: en GitHub ve a **Settings → Secrets and variables →
Actions → Variables** y crea `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. Cada 3 días hará una
consulta de solo lectura. Si el proyecto llega a pausarse, se reactiva desde el panel de Supabase sin
perder datos.

## Administrador

Hay una sola cuenta administradora y no existe registro público.

**Crear:**

1. Supabase → **Authentication → Users → Add user → Create new user**: tu correo, una contraseña
   larga y única, y marca *Auto Confirm User*.
2. **SQL Editor** → ejecuta (cambiando el correo):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tu-correo@ejemplo.com';
   ```
3. Entra en `https://TU-SITIO/admin`.

**Recuperar el acceso:**

- Desde `/admin/entrar` → «¿Olvidaste tu contraseña?». Supabase envía un enlace a
  `/admin/restablecer`. Con el correo gratuito de Supabase solo se envían mensajes a direcciones del
  **equipo del proyecto** (la cuenta dueña de Supabase) y como máximo unos 2 por hora; usa como
  administradora el mismo correo de la cuenta de Supabase.
- Si no llega el correo: Supabase → **Authentication → Users** → menú del usuario → *Send password
  recovery*, o cambia la contraseña desde ahí.

**Quitar permisos:** `delete from public.admins where user_id = '...';` o elimina el usuario en
*Authentication → Users*.

No hay contraseñas de demostración en producción; `scripts/admin-local.mjs` solo funciona contra el
Supabase local.

## Categorías

Se administran en `/admin/categorias` (crear, renombrar, ordenar, eliminar si no tienen productos).
Al renombrar se conserva el enlace (`/catalogo?categoria=...`) para no romper enlaces compartidos.

## Respaldo y restauración

- **Desde el panel:** `/admin/respaldo` → «Descargar respaldo (.zip)». Incluye ajustes, categorías,
  todos los productos (también borradores) y las fotos.
- **Desde la terminal:** con `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env`:
  ```bash
  npm run respaldo                                   # crea respaldos/respaldo-AAAA-MM-DD-HHMM.zip
  npm run restaurar -- respaldos/archivo.zip         # muestra qué contiene
  npm run restaurar -- respaldos/archivo.zip --confirmar
  ```
  La restauración deja el catálogo **igual al respaldo** (borra primero productos y categorías
  actuales) y antes guarda automáticamente `respaldos/antes-de-restaurar-*.zip`. Sirve también
  para mudar el catálogo a otro proyecto de Supabase (aplica antes las migraciones y crea el
  administrador). Procedimiento comprobado: ver [docs/pruebas.md](docs/pruebas.md).

## Pruebas

```bash
npx supabase start && node scripts/admin-local.mjs
npm run test:db     # permisos y operaciones contra la base de datos (Vitest)
npm run test:e2e    # recorridos en navegador sobre la versión compilada (Playwright)
npm run contraste   # contraste WCAG de la paleta
```

En Windows, ejecuta Vitest desde una ruta con la unidad en mayúscula (`C:\...`); si la terminal abre
`c:\...`, Vitest puede cargar dos copias de sí mismo.

## Detener la prueba sin cargos

1. Descarga un respaldo final (panel o `npm run respaldo`).
2. Cloudflare → Workers & Pages → `tienda-andrea` → Settings → **Delete**.
3. Supabase → Project Settings → General → **Pause project** (conserva los datos) o **Delete project**.
4. Desactiva el flujo «Mantener Supabase activo» en GitHub → Actions.

Ninguno de los dos servicios tiene una tarjeta registrada si no la agregaste, así que no hay
facturación automática.
