# Decisiones de diseño y arquitectura

## Revisión inicial

**Materiales disponibles.** Seis capturas del 16/11/2026, entre las 22:02 y las 22:03:

- Aceite de argán (envase «Secret Fragrance – Hair Perfume»).
- Mascarilla Bio_Plant 2 en 1 de 1 L.
- Shampoo Bio_Plant de 1 L (pie de foto: «5 opciones según tipo de pelo»).
- Acondicionador Bio_Plant de 1 L.
- Minoxidil 5 % en spray Biogence de 125 ml.
- Una nota: «Puedes comprar por separado o el combo de los 3 productos a un mejor precio».

**Qué se hizo con ellas.** Se transcribió solo lo legible a 6 productos en **borrador**, sin precios
ni fotos. Los datos dudosos quedaron en «notas internas»:

- Marca del aceite.
- Nombres de las 5 variantes del shampoo.
- Requisitos sanitarios del minoxidil.
- Precio del combo.

Las fotos de las capturas no se publicaron porque podrían ser imágenes del fabricante. La
administradora debe subir fotos propias o autorizadas.

**Marca.** «Mímate by Andrea», con la frase «Un momento para ti» (logotipo de referencia
compartido el 16/11/2026).

**Datos pendientes:**

- Número de WhatsApp y redes sociales. Mientras falten, los botones no se muestran.
- Precios.
- Moneda definitiva. Se dejó GTQ provisional, editable en Ajustes, y no se muestra si no hay precio.

## Referencias consultadas (16/11/2026)

| Sitio | Enlace | Patrón útil observado | Cómo se adaptó |
| --- | --- | --- | --- |
| Briogeo | [briogeohair.com/collections/all](https://www.briogeohair.com/collections/all) | Filtros por tipo de producto e indicador «mostrando 1–12 de 12» | Un solo filtro (categoría) en chips y el número de resultados visible |
| Prose | [prose.com](https://www.prose.com) | Menú superior muy corto y bloques con mucho espacio en blanco y títulos breves | Navegación de 3 enlaces (Inicio, Catálogo, Contacto) y portada aireada |
| Druni | [druni.es/cabello](https://www.druni.es/cabello) | Marca en mayúsculas sobre el nombre y estado de existencias visible en la tarjeta | Marca en versalitas sobre el nombre y etiqueta «Agotado» con icono y texto |
| Primor | [primor.eu/es_es/cabello](https://www.primor.eu/es_es/cabello) | Barra lateral con muchos filtros; algunos mostraban «No se pudieron cargar las opciones» | Lección: pocos filtros y generados en el servidor para que siempre carguen |
| Weleda | [weleda.es](https://www.weleda.es/) | Tamaño (ml) junto al precio en la tarjeta | La presentación (1 L, 125 ml) se muestra en cada tarjeta; sin precio, «Consultar precio» |

No se pudieron leer automáticamente (bloqueo o error), así que no se usaron:

- The Ordinary, Aesop, Glossier, Typology, Natura, Olaplex, Verb, Lush, Notino y Kiehl's.

Se tomaron principios de organización, no textos, marcas ni diseños.

## Identidad visual

**Logotipo tipográfico.** «Mímate» es el elemento principal, con la tilde. Usa Fraunces con el eje
de suavidad al máximo (curvas redondeadas, como el logotipo de referencia) y el rosa empolvado de la
marca. «by Andrea» va debajo en Figtree, más pequeño, con espaciado amplio y en oliva, como firma.

- Es **texto real**, no una imagen: se ve nítido en cualquier pantalla y los lectores de pantalla lo
  leen.
- En la portada lo acompaña la ramita del logotipo, redibujada como SVG.
- En el celular el encabezado centra el logotipo y pone el menú debajo. En la computadora el
  logotipo va a la izquierda y el menú a la derecha.

**Tipografías gratuitas** (incluidas en el sitio, sin servicios externos):

| Fuente | Uso |
| --- | --- |
| **Fraunces** (variable, suave) | Logotipo, títulos y la frase en cursiva |
| **Figtree** | Textos, botones y formularios. Muy legible en tamaños pequeños |

### Paleta definitiva

Centralizada en `src/styles/tokens.css`. Contraste verificado con `npm run contraste` (WCAG 2.2).

| HEX | Variable | Función |
| --- | --- | --- |
| `#FCF6F0` | `--color-bg` | Crema del logotipo: fondo general |
| `#FFFFFF` | `--color-surface` | Tarjetas y formularios |
| `#B96F6D` | `--color-brand` | Rosa empolvado del logotipo. **Solo texto grande** («Mímate», 3,5:1) y adornos |
| `#9E5458` | `--color-primary` | Rosa profundo: botones, enlaces y foco (5,1:1 sobre crema; blanco sobre él 5,4:1) |
| `#7A3840` | `--color-primary-strong` | Estados *hover* y texto sobre rosa suave (7,1:1) |
| `#F7E6E3` | `--color-rose-soft` | Rosa suave: bloques destacados y elementos activos |
| `#55603F` | `--color-sage` | Oliva oscuro: «by Andrea», frase y etiquetas informativas (6,3:1) |
| `#ECEEDF` | `--color-sage-soft` | Fondo de etiquetas informativas |
| `#8A8F5A` | `--color-leaf` | Verde hoja: solo ilustración (gráfico, 3,2:1) |
| `#2E2724` | `--color-text` | Texto principal (13,7:1) |
| `#62574F` | `--color-text-muted` | Texto secundario (6,5:1) |
| `#EADFD6` / `#8C7F79` | `--color-border` / `--color-border-strong` | Separadores / bordes de campos (3,6:1) |
| `#1E6B3A` + `#E3F1E7` | `--color-success*` | Éxito, «Disponible», botón de WhatsApp |
| `#7A4D00` + `#FCF0D6` | `--color-warning*` | Advertencia, «Agotado», cambios sin guardar |
| `#B3261E` + `#FBE5E3` | `--color-error*` | Errores y eliminación |

El rosa del logotipo no llega a 4,5:1, así que no se usa en texto normal ni en botones con texto
blanco. Para eso existe el rosa profundo. Los estados nunca dependen solo del color: siempre llevan
texto y, en general, un icono.

## Decisiones de interacción (HCI)

| Principio | Cómo se aplicó |
| --- | --- |
| Consistencia | Los mismos componentes (botones, etiquetas, tarjetas) y nombres («Publicar», «Ocultar», «Borrador») en todo el sitio. El detalle público y la vista previa del panel usan **el mismo componente** |
| Visibilidad del estado | Esqueletos y «Comprobando sesión…» al cargar. «Optimizando imagen 1 de 2…», «Subiendo imagen…» y «Guardando producto…». «Buscando…» en el catálogo. Mensajes de éxito y error. Barra «Todo guardado / Hay cambios sin guardar» |
| Reconocimiento | Etiquetas visibles en todos los campos. Categorías como chips con número de productos. Miniaturas de las fotos elegidas. Etiquetas Publicado / Borrador / Agotado / Destacado / Con notas |
| Prevención de errores | Validación junto al campo y en la base de datos. Foco en el primer error. Confirmación al eliminar con el nombre del producto y el número de fotos. Aviso al salir con cambios sin guardar. El enlace se genera solo. No se puede publicar sin descripción, categoría y foto |
| Control del usuario | «Cancelar» en el formulario. «Ocultar» como alternativa reversible a eliminar. «Volver al catálogo» conserva la búsqueda y el filtro. La búsqueda y el filtro de la lista del panel se recuerdan |
| Jerarquía y proximidad | Formulario agrupado en Información, Imágenes, Precio y disponibilidad, y Notas internas. Una acción principal por pantalla (Ver catálogo, Publicar o Guardar cambios, Nuevo producto) |
| Facilidad de interacción | Objetivos de al menos 44 px. La tarjeta completa es pulsable. Barra de acciones fija abajo en el editor. Diseño para móvil primero |
| Accesibilidad | Enlace «Saltar al contenido». Foco visible de 3 px. `lang="es"`. Textos alternativos obligatorios en cada foto. Regiones `aria-live` para mensajes. Diálogos `<dialog>` que atrapan el foco. Respeta «reducir movimiento». Sin carruseles automáticos ni ventanas emergentes |

## Arquitectura

| Opción | Resultado |
| --- | --- |
| **Astro en Cloudflare Workers + Supabase** | **Elegida.** Gratis con uso comercial, sin tarjeta y sin pausas del sitio. Las páginas públicas se generan en el servidor (SEO) y los cambios del panel se ven al instante |
| Vercel Hobby + Supabase | Descartada: el plan Hobby prohíbe el uso comercial |
| Sitio estático + reconstrucción al editar | Descartada: cada cambio tardaría minutos en verse y consumiría compilaciones |
| Cloudflare D1 + R2 + autenticación propia | Descartada: R2 requiere registrar un medio de pago, y escribir la autenticación propia añade riesgo |

Detalles clave:

- **Permisos en la base de datos (RLS).** Los visitantes solo leen productos publicados y sus
  imágenes. Las notas internas tienen el permiso de columna retirado para visitantes. Toda escritura
  requiere estar en la tabla `admins`. No existe ninguna clave privilegiada en el sitio.
- **Regla «publicado = tiene foto»** comprobada en la base de datos con un *trigger* diferido. Así
  producto e imágenes se guardan en una sola transacción (`save_product`).
- **Sin archivos huérfanos.** Las funciones `save_product` y `delete_product` devuelven solo las rutas
  que ningún otro producto ni el logotipo usan, y el panel las borra. Si una subida falla, se borra lo
  subido en ese intento. La sección «Imágenes sin uso» limpia lo que haya quedado por cortes de
  conexión.
- **Imágenes de borradores.** El bucket es público para servir fotos por URL. Las rutas incluyen
  identificadores aleatorios y los visitantes no pueden listar archivos, pero una foto de un borrador
  es accesible si alguien conoce su URL exacta. Los datos del borrador (nombre, descripción, precio)
  sí están protegidos por completo.
- **SEO.** Títulos y descripciones por producto, Open Graph, datos estructurados `Product`,
  `sitemap.xml` dinámico, `robots.txt` que excluye `/admin` y `noindex` en el panel. Excluir
  `/admin` de los buscadores no es una medida de seguridad.
