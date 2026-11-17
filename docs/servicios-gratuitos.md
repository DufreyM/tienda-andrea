# Servicios gratuitos, límites y costo cero

Condiciones consultadas en la documentación oficial el **16/11/2026**. Los proveedores pueden
cambiarlas: revísalas de nuevo antes de empezar la prueba y si algo del panel no coincide.

## Servicios elegidos

| Servicio | Función | Fuentes oficiales (16/11/2026) |
| --- | --- | --- |
| **Cloudflare Workers – Free** | Alojamiento del sitio, HTTPS y subdominio `*.workers.dev` | [Precios](https://developers.cloudflare.com/workers/platform/pricing/), [Límites](https://developers.cloudflare.com/workers/platform/limits/), [Archivos estáticos](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Términos](https://www.cloudflare.com/terms/) |
| **Supabase – Free** | Base de datos, autenticación del administrador y almacenamiento de fotos | [Precios](https://supabase.com/pricing), [Facturación](https://supabase.com/docs/guides/platform/billing-on-supabase), [Límites de archivos](https://supabase.com/docs/guides/storage/uploads/file-limits), [Correo (SMTP)](https://supabase.com/docs/guides/auth/auth-smtp), [Pausa por inactividad](https://supabase.com/docs/guides/platform/free-project-pausing), [Términos](https://supabase.com/terms) |
| **GitHub** (opcional) | Repositorio, despliegue automático y consulta cada 3 días para evitar la pausa | [Facturación de Actions](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions) |

**Descartado: Vercel Hobby.** Su plan gratuito es solo para uso personal **no comercial**
([fair use](https://vercel.com/docs/limits/fair-use-guidelines), [términos](https://vercel.com/terms)).
Un catálogo de una tienda es uso comercial, así que no cumple el requisito.

## Cuotas relevantes

### Cloudflare Workers (Free)

| Concepto | Cuota gratuita | Al superarla |
| --- | --- | --- |
| Solicitudes al Worker (páginas públicas, sitemap) | 100 000 por día (se reinicia a las 00:00 UTC) | Cloudflare responde con el error 1027 hasta el día siguiente. No se cobra |
| Archivos estáticos (CSS, JS, fuentes, páginas de /admin) | **Gratis e ilimitados** | — |
| CPU por solicitud | 10 ms | Error 1102 en esa solicitud |
| Archivos estáticos | 20 000 por versión, 25 MiB cada uno | El despliegue falla |
| Tamaño del Worker | 64 MiB | El despliegue falla |

- **Tarjeta:** el acuerdo solo la exige para servicios de pago; el plan gratuito no la pide. No la
  agregues.
- **Uso comercial:** no se encontró prohibición para el plan gratuito. Sí hay restricciones:
  no revender el servicio y **no procesar tarjetas de crédito** en sitios del plan gratuito (este
  catálogo no tiene pagos).
- **Pausas:** los Workers no se suspenden por inactividad.
- **HTTPS en `workers.dev`:** no aparece en las páginas consultadas; se confirma al desplegar.
- No se usan KV, D1, R2, Images ni Durable Objects (desactivados en `astro.config.mjs` y
  `wrangler.jsonc`), así que no hay otros contadores.

### Supabase (Free)

| Concepto | Cuota gratuita | Uso estimado (supuesto inicial) |
| --- | --- | --- |
| Base de datos | 500 MB | < 5 MB (100 productos) |
| Almacenamiento de archivos | 1 GB | ≈ 75 MB (ver cálculo) |
| Transferencia (egress) | 5 GB + 5 GB en caché | ≈ 1,5 GB al mes |
| Usuarios activos (MAU) | 50 000 | 1 (la administradora) |
| Tamaño máximo por archivo | 50 MB | El bucket lo limita a **2 MB** |
| Proyectos activos | 2 | 1 |
| Solicitudes a la API | Ilimitadas | — |
| Transformación de imágenes | **No incluida** | No se usa: las fotos se optimizan en el navegador |
| Correo de Auth integrado | ~2 por hora, solo a direcciones del equipo del proyecto | Solo recuperación de contraseña |
| Copias diarias automáticas | No incluidas | Respaldo manual semanal (ver guía de 30 días) |

- **Tarjeta:** las páginas consultadas no la exigen para el plan Free; no la agregues.
- **Pausa por inactividad:** un proyecto Free se pausa tras **1 semana sin actividad suficiente en la
  base de datos**. Supabase avisa por correo. Los datos se conservan y el proyecto se reactiva desde el
  panel. Para evitarlo: las visitas consultan la base de datos, y el flujo de GitHub
  `mantener-activo.yml` hace una consulta de solo lectura cada 3 días.
- **Al superar una cuota:** la documentación no detalla el comportamiento del plan Free. Al no
  haber medio de pago, no puede haber cobros automáticos. Lo razonable es esperar restricciones del
  servicio. El margen estimado es amplio (≈ 30 % de la transferencia).
- **Uso comercial:** los términos generales limitan el uso a «fines comerciales internos» del
  cliente y no mencionan el plan Free por nombre. No se encontró prohibición expresa de usar el plan
  Free para el sitio público de un negocio.

### GitHub Actions (opcional)

- Gratis en repositorios **públicos**. En privados, el plan Free incluye 2000 minutos al mes. El
  límite de gasto predeterminado es 0 USD: al agotarlos, Actions se desactiva y no se cobra.
- La consulta cada 3 días usa unos 10 minutos al mes.

## Supuestos y cálculo de consumo

Supuesto inicial del plan: **100 productos, hasta 3 fotos por producto y 1000 visitas al mes**.

**Fotos.** Cada foto se guarda en dos tamaños, optimizados en WebP: detalle (máx. 1600 px,
≈ 150–200 KB) y miniatura (600 px, ≈ 40–50 KB).

- 100 × 3 × ≈ 250 KB ≈ **75 MB** de 1 GB (≈ 7 %).

**Transferencia por visita** (sin contar la caché del navegador, que las fotos tienen por 1 año):

- Inicio: 8 miniaturas ≈ 400 KB.
- Catálogo: 12 miniaturas ≈ 600 KB.
- Dos productos: ≈ 500 KB.
- Total ≈ 1,5 MB por visita × 1000 visitas ≈ **1,5 GB** de 5 GB (≈ 30 %).

**Solicitudes al Worker.** ≈ 5 páginas por visita × 1000 visitas = 5000 al mes, frente a 100 000
**por día**.

Las cifras reales dependen del peso de las fotos y del tráfico. Si hay mucho más tráfico (por ejemplo,
una publicación viral), la transferencia de fotos es lo primero que se acerca al límite. No hay
capacidad ilimitada ni disponibilidad garantizada en planes gratuitos.

**CPU de 10 ms.** Las páginas públicas hacen consultas sencillas, y la espera de red no cuenta como
CPU. Si en el panel de Cloudflare aparecieran errores 1102, hay que reducir el trabajo por página
antes de pensar en un plan de pago.

## Medidas para mantener el costo en cero

1. No registrar tarjeta en Cloudflare, Supabase ni GitHub.
2. No activar complementos de pago: Cloudflare Images, KV, R2, D1; Supabase Pro, *compute add-ons*,
   *custom domains*, PITR.
3. Usar el subdominio gratuito `*.workers.dev`: no comprar dominio.
4. Fotos optimizadas antes de subir, límite de 2 MB y 6 fotos por producto, y caché de 1 año.
5. Limpieza de imágenes sin uso desde el panel (Respaldo → Imágenes sin uso).
6. Revisión semanal del consumo (ver [guía de 30 días](guia-30-dias.md)). Una alerta por sí sola
   no evita cobros, pero aquí no hay medio de pago que cobrar.

## Exportar datos y detener la prueba

1. Panel → **Respaldo → Descargar respaldo (.zip)**, o `npm run respaldo`.
2. Cloudflare → Workers & Pages → `tienda-andrea` → Settings → **Delete**.
3. Supabase → Project Settings → General → **Pause project** (conserva datos) o **Delete project**.
4. GitHub → Actions → desactivar «Mantener Supabase activo».
