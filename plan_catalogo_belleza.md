# Plan y prompt para una IA: catálogo web de belleza y cuidado personal

## Cómo usar este documento

Copia desde «Encargo para la IA» hasta el final y entrégaselo a una IA con capacidad de desarrollar aplicaciones web. Adjunta las capturas de los productos cuando las tengas disponibles. Este documento define el proyecto; no presupone que la IA tenga acceso a tu computadora.

## Encargo para la IA

Actúa como especialista en desarrollo web, diseño de interfaces y experiencia de usuario. Diseña e implementa una página web sencilla, atractiva y funcional para dar visibilidad a productos de belleza y cuidado personal. Debe tener un catálogo público y un área privada de administración para crear, editar y eliminar productos.

Tienes libertad creativa para proponer la identidad visual, la composición y la tecnología, respetando el alcance y el presupuesto. Quiero una aplicación funcional con datos persistentes, lista para probar durante un mes; completa el trabajo hasta donde lo permitan las herramientas y accesos disponibles.

### 1. Objetivo y límites

- Facilitar que cualquier visitante descubra productos y consulte sus características desde el celular o la computadora.
- Permitir que una persona sin conocimientos técnicos mantenga el catálogo.
- Mantener el costo de operación en cero durante los 30 días de prueba, dentro de límites de uso documentados.
- Usar español en toda la interfaz y en las instrucciones de administración.
- Excluir pasarela de pago, carrito, pedidos, cuentas de clientes, reseñas y funciones comerciales complejas.
- Priorizar claridad, rapidez y facilidad de mantenimiento.

### 2. Capturas, productos y datos pendientes

Las últimas capturas que tomé en mi computadora muestran el tipo de productos que quiero publicar. Analiza únicamente las imágenes que adjunte o que estén disponibles explícitamente en el entorno; no afirmes haber visto archivos a los que no tienes acceso.

Si las capturas no están adjuntas, solicita que las comparta y continúa con la estructura y productos de demostración claramente identificados. No conviertas esa ausencia en un bloqueo para el resto del desarrollo.

Extrae de las capturas solo datos legibles. No inventes marcas, precios, ingredientes, certificaciones ni beneficios para la salud. Marca los campos dudosos para revisión. Usa imágenes propias, autorizadas o marcadores visuales provisionales; no copies fotografías de otras tiendas sin permiso.

Deja configurables el nombre del negocio, logotipo, moneda, redes y medio de contacto. Si no se proporcionan, utiliza valores provisionales explícitos. No publiques números, precios ni direcciones ficticias como si fueran reales.

### 3. Referencias e inspiración

Antes de diseñar, investiga de 3 a 5 páginas públicas de belleza, cosmética o cuidado personal. Busca ejemplos de catálogos claros, navegación sencilla y buena presentación de productos.

Entrega una tabla breve con el nombre, enlace, fecha de consulta, patrón útil observado y cómo lo adaptarás. Inspírate en principios de organización y usabilidad; crea una identidad propia sin copiar marcas, textos o diseños completos. Evita trasladar a este proyecto la complejidad de una tienda grande.

Si no puedes navegar, explica esa limitación y propone referencias pendientes de verificar; no inventes una investigación.

### 4. Parte pública

Implementa estas vistas:

1. **Inicio:** presentación breve, acceso visible al catálogo y una selección de productos destacados.
2. **Catálogo:** cuadrícula de productos, búsqueda por nombre o marca y filtro por categoría. Si crece el catálogo, usa paginación o carga progresiva sencilla.
3. **Detalle del producto:** fotografías, nombre, marca cuando corresponda, descripción, categoría, presentación y disponibilidad. Muestra el precio únicamente cuando esté configurado.
4. **Contacto:** enlaces reales configurables a redes o al canal de consultas. Si se configura WhatsApp, permite consultar un producto con un mensaje que incluya su nombre y enlace. Oculta el botón mientras falte el número.

Las tarjetas deben mostrar una imagen consistente, nombre, presentación y acceso al detalle. Incluye estados de carga, catálogo vacío, búsqueda sin resultados, imagen no disponible y producto inexistente. Los borradores nunca deben aparecer públicamente.

No muestres botones de comprar, pagar o agregar al carrito.

### 5. Parte de administrador

Implementa un área privada con inicio y cierre de sesión, sin registro público. Para esta primera versión basta un administrador autorizado, creado mediante un procedimiento seguro y documentado.

Funciones necesarias:

- Listar productos y encontrarlos mediante búsqueda.
- Crear y editar información e imágenes.
- Previsualizar el producto antes de publicarlo.
- Guardar como borrador o publicar; destacar u ocultar productos.
- Cambiar disponibilidad entre disponible y agotado.
- Eliminar productos con confirmación que identifique claramente el producto.
- Mostrar mensajes claros de éxito, error y cambios sin guardar.
- Administrar categorías de forma sencilla o proporcionar un mecanismo documentado para configurarlas.

Valida campos e imágenes tanto en la interfaz como en el servidor o servicio de datos. Gestiona errores de subida, tamaños excesivos y formatos incompatibles. Al reemplazar o eliminar imágenes, evita dejar archivos huérfanos y no borres archivos compartidos por otros productos.

### 6. Modelo de datos mínimo

| Campo | Regla |
| --- | --- |
| ID | Identificador único generado automáticamente |
| Nombre | Obligatorio |
| Slug | Único y adecuado para enlaces legibles |
| Descripción | Obligatoria para publicar |
| Categoría | Obligatoria para publicar |
| Marca | Opcional |
| Presentación | Opcional: volumen, peso o unidades |
| Imágenes | Una principal y galería opcional; al menos una para publicar |
| Texto alternativo | Descripción útil de cada imagen |
| Precio y moneda | Opcionales; validar si se completan |
| Disponibilidad | Disponible o agotado |
| Publicación | Borrador o publicado |
| Destacado | Sí o no |
| Fechas | Creación y última actualización |

Conserva productos, imágenes y cambios al recargar, cerrar sesión o acceder desde otro dispositivo. No uses únicamente almacenamiento del navegador ni datos simulados para presentar el CRUD como terminado.

### 7. Diseño visual y HCI

Aplica conceptos de interacción humano-computadora mediante decisiones verificables:

| Principio | Aplicación esperada |
| --- | --- |
| Consistencia | Mismos estilos, nombres y comportamientos en todas las vistas |
| Visibilidad del estado | Indicadores al cargar, subir imágenes y guardar |
| Reconocimiento | Etiquetas claras, categorías visibles y vista previa de imágenes |
| Prevención de errores | Validación junto al campo, confirmación al borrar y aviso de cambios sin guardar |
| Control del usuario | Cancelar una edición y volver al catálogo conservando la búsqueda cuando sea posible |
| Jerarquía y proximidad | Agrupar información relacionada y destacar una acción principal por sección |
| Facilidad de interacción | Botones cómodos para usar con el dedo y acciones frecuentes fáciles de encontrar |
| Accesibilidad | Teclado, foco visible, etiquetas, textos alternativos y mensajes comprensibles |

Propón una sola paleta armónica para la marca, con colores semánticos para éxito, advertencia y error. Como punto de partida opcional, puedes explorar marfil, rosa suave, verde salvia y un tono oscuro para texto. Ajusta los tonos según las capturas y verifica el contraste antes de adoptarlos.

Entrega los colores definitivos en HEX y su función. Centralízalos en variables de diseño. Busca cumplir WCAG 2.2 nivel AA en las vistas implementadas, con contraste mínimo de 4.5:1 para texto normal y 3:1 para texto grande. No comuniques estados solo por color.

Usa tipografías legibles y gratuitas, espacio suficiente y fotografías protagonistas. Diseña primero para móvil y adapta a tableta y escritorio. Evita animaciones excesivas, carruseles automáticos y ventanas emergentes innecesarias. Respeta la preferencia de movimiento reducido.

### 8. Arquitectura y gratuidad

Elige la arquitectura más sencilla que soporte catálogo público, autenticación administrativa, base de datos e imágenes persistentes. Puedes evaluar un frontend moderno y servicios con planes gratuitos; no elijas una tecnología solo por popularidad.

Antes de decidir, verifica en documentación oficial las condiciones vigentes del alojamiento, autenticación, base de datos y almacenamiento. Comprueba que el plan permita este uso comercial. Entrega una tabla con:

- Servicio y función.
- Enlace oficial y fecha de verificación.
- Cuotas gratuitas relevantes: almacenamiento, transferencia, solicitudes y usuarios, según corresponda.
- Requisitos de tarjeta, pausas por inactividad y restricciones de uso.
- Qué sucede al alcanzar el límite y cómo evitar cargos.

No dependas de créditos promocionales que venzan antes de los 30 días. Prioriza planes sin tarjeta ni facturación automática y un subdominio gratuito con HTTPS; no compres un dominio. Desactiva recursos de pago o usa límites duros cuando el proveedor lo permita. Una alerta de consumo por sí sola no evita cobros.

Dimensiona la prueba para un catálogo pequeño; si faltan datos, usa como supuesto inicial 100 productos, hasta 3 imágenes optimizadas por producto y 1.000 visitas durante el mes. Explica que las cuotas reales dependen del peso de las imágenes y del tráfico. No prometas capacidad ilimitada ni disponibilidad garantizada.

Si la propuesta no puede mantenerse en cero con esos supuestos, reduce el consumo o plantea otra arquitectura gratuita antes de continuar. No actives servicios de pago. Incluye instrucciones para exportar los datos y detener la prueba sin cargos.

### 9. Protección del administrador y de los datos

Restringe las operaciones de escritura al administrador mediante controles efectivos en el servidor o políticas del servicio de datos; ocultar botones o proteger una ruta del frontend no basta. Los visitantes solo podrán leer productos publicados y sus imágenes públicas.

No expongas claves privilegiadas, contraseñas ni secretos en el código del cliente o repositorio. Incluye un archivo de ejemplo de variables de entorno sin valores reales. Documenta la creación y recuperación de acceso del administrador usando los mecanismos del proveedor, sin credenciales compartidas ni contraseñas fijas de demostración en producción.

Limita los archivos de imagen por tipo y tamaño. No añadas formularios que almacenen datos personales ni herramientas de seguimiento para esta primera versión.

### 10. Rendimiento y visibilidad

- Optimiza imágenes y genera tamaños adecuados para miniaturas y detalle.
- Aplica carga diferida a imágenes fuera de la primera pantalla y reserva su espacio para evitar saltos visuales.
- Usa títulos, descripciones, encabezados y enlaces legibles por producto.
- Incluye metadatos para compartir enlaces y un sitemap de las páginas públicas.
- Excluye el administrador de la indexación, sin tratar esa exclusión como una medida de seguridad.
- Verifica que el contenido público de los productos sea accesible para buscadores mediante renderizado o una estrategia equivalente compatible con la arquitectura elegida.

### 11. Orden de ejecución

1. **Revisión inicial:** analiza los materiales disponibles, identifica datos pendientes e indica supuestos. Haz preguntas solo si bloquean una decisión esencial.
2. **Investigación y viabilidad:** revisa referencias y condiciones de los planes gratuitos. Selecciona y justifica una arquitectura.
3. **Diseño:** define navegación, esquema de las vistas, paleta, tipografía y componentes reutilizables.
4. **Base funcional:** configura datos persistentes, almacenamiento, acceso del administrador y permisos.
5. **Construcción:** implementa catálogo, detalle y administración completos; integra las imágenes disponibles.
6. **Validación:** prueba los recorridos críticos, accesibilidad, adaptación móvil y consumo estimado.
7. **Entrega:** prepara el despliegue, la documentación y una guía de prueba de 30 días. Despliega cuando existan los accesos y la autorización necesarios; si falta algún acceso, deja instrucciones concretas y señala el bloqueo.

No te detengas tras entregar una propuesta visual o un plan. Continúa con la implementación, las comprobaciones y los entregables que puedas completar.

### 12. Criterios de aceptación

- [ ] Un visitante puede buscar, filtrar y abrir productos desde móvil y escritorio.
- [ ] Un administrador puede crear un producto con imagen, editarlo y eliminarlo.
- [ ] Los cambios persisten y se reflejan correctamente en la parte pública.
- [ ] Los borradores no se pueden consultar públicamente ni accediendo directamente a sus datos.
- [ ] Una persona sin sesión no puede crear, modificar, eliminar productos ni subir archivos mediante peticiones directas.
- [ ] Un producto oculto o eliminado deja de aparecer y su enlace muestra un estado adecuado.
- [ ] La subida de una imagen inválida muestra un mensaje útil sin perder el formulario.
- [ ] Búsquedas vacías, errores de red y catálogo vacío tienen una respuesta comprensible.
- [ ] Se puede completar la navegación principal y el formulario con teclado y foco visible.
- [ ] No hay desbordamiento horizontal en anchos de referencia de 360, 768 y 1440 píxeles.
- [ ] No se muestran datos ficticios como reales, enlaces de contacto rotos ni controles de pago.
- [ ] Las condiciones gratuitas están verificadas y el proyecto no activa cobros automáticos.
- [ ] Se entrega un procedimiento de respaldo y restauración que se haya comprobado al menos una vez con datos de prueba.

Automatiza las pruebas de permisos y de las operaciones principales cuando sea viable. Complementa con una revisión manual del catálogo y el formulario. Informa qué se comprobó realmente y qué queda pendiente; no declares resultados sin haberlos verificado.

### 13. Entregables

1. Código fuente completo y organizado, con esquema de datos, políticas de acceso y configuración necesaria.
2. Sitio funcional desplegado si hay acceso autorizado, o pasos reproducibles para publicarlo en la opción gratuita elegida.
3. README con instalación, variables de entorno, creación del administrador y mantenimiento básico.
4. Guía breve para agregar productos, cambiar imágenes, publicar, ocultar y eliminar.
5. Resumen de las referencias, decisiones HCI, paleta definitiva y arquitectura.
6. Tabla de servicios gratuitos, límites, supuestos de consumo y medidas para mantener el costo en cero.
7. Resultado de las pruebas, limitaciones y cualquier paso manual pendiente.
8. Guía para los 30 días: revisar consumo semanalmente, probar la gestión del catálogo, recoger comentarios y exportar un respaldo al terminar. Estas revisiones son instrucciones, no automatizaciones ya configuradas.

### 14. Prioridades para decidir

Ante cualquier conflicto, prioriza en este orden: costo cero durante la prueba; funcionamiento y protección del administrador; facilidad de uso; accesibilidad y legibilidad; coherencia visual; mejoras opcionales.

Quiero demostrar los productos con buena presentación y administrarlos sin complicaciones. Usa tu criterio para resolver los detalles y entrega una solución pequeña, cuidada y completa.
