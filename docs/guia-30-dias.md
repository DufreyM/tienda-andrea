# Guía de la prueba de 30 días

Estas revisiones son **instrucciones para hacer a mano**: no hay recordatorios automáticos. La única
automatización es la consulta cada 3 días que evita que Supabase se pause (si la activaste en GitHub).

## Antes de empezar (día 0)

- [ ] Sitio desplegado y accesible en `https://tienda-andrea.TU-CUENTA.workers.dev`.
- [ ] Registro público desactivado en Supabase y cuenta administradora creada.
- [ ] Ajustes completados: WhatsApp, redes y texto de contacto.
- [ ] Revisar las notas internas de los 6 productos iniciales, subir fotos y publicar los que estén
      listos.
- [ ] Probar «¿Olvidaste tu contraseña?» una vez, para confirmar que el correo llega.
- [ ] Descargar un primer respaldo.
- [ ] Comprobar que **no hay tarjetas** registradas en Cloudflare ni en Supabase.

## Cada semana (días 7, 14, 21 y 28)

**1. Consumo** (10 minutos):

- Panel del sitio → **Respaldo → Uso del plan gratuito**: fotos (de 1 GB) y base de datos (de 500 MB).
- Supabase → **Usage**: *Egress* (de 5 GB) y estado del proyecto (que no diga *Paused*).
- Cloudflare → Workers & Pages → `tienda-andrea` → **Metrics**: solicitudes y errores. Revisa que
  no haya errores 1027 (límite diario) ni 1102 (CPU).
- Anota las cifras en la tabla de abajo. Si la transferencia supera 3 GB antes del día 20, reduce el
  número de fotos por producto o súbelas con menos resolución.

**2. Gestión del catálogo:** agrega o edita al menos un producto, cambia una foto, marca algo como
agotado y vuelve a disponible. Anota cualquier paso confuso.

**3. Respaldo:** Respaldo → **Descargar respaldo (.zip)** y guárdalo fuera de tu computadora (nube
personal).

**4. Limpieza:** si «Imágenes sin uso» muestra archivos, elimínalos.

**5. Comentarios:** pregunta a 2 o 3 clientas o clientes si encontraron fácilmente lo que buscaban,
si las fotos y los datos se entienden en el celular, y si el botón de WhatsApp funcionó y el mensaje
traía el producto correcto.

| Semana | Fotos (MB) | Base de datos (MB) | Egress (GB) | Solicitudes Worker / día (máx.) | Errores | Comentarios clave |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |

## Al terminar (día 30)

1. Descargar el **respaldo final**.
2. Decidir según las cifras y los comentarios:
   - **Continuar gratis:** si el consumo quedó lejos de los límites, no hay que hacer nada.
   - **Detener:** sigue «Detener la prueba sin cargos» en el README (borrar el Worker, pausar o
     borrar el proyecto de Supabase y desactivar la consulta de GitHub).
3. Si se detiene, conservar el respaldo: permite restaurar todo en un proyecto nuevo con
   `npm run restaurar`.
