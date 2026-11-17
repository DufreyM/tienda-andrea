-- Datos iniciales tomados de las capturas compartidas el 16/11/2026.
-- Todos los productos se crean como BORRADOR, sin precio y sin imagen: el administrador debe
-- revisar las notas internas, subir fotos propias o autorizadas y publicarlos.
-- Solo se transcribió texto legible en las capturas; no se añadieron beneficios ni precios.

insert into public.categories (name, slug, position) values
  ('Shampoos', 'shampoos', 10),
  ('Acondicionadores', 'acondicionadores', 20),
  ('Mascarillas', 'mascarillas', 30),
  ('Tratamientos', 'tratamientos', 40),
  ('Aceites y perfumes capilares', 'aceites-y-perfumes-capilares', 50),
  ('Combos', 'combos', 60)
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, presentation, availability, status, featured, review_notes)
values
  (
    'Aceite de argán',
    'aceite-de-argan',
    'Aceite de argán para el cabello. En el envase se lee «Secret Fragrance – Hair Perfume» y «morocco».',
    (select id from public.categories where slug = 'aceites-y-perfumes-capilares'),
    null,
    null,
    'disponible', 'borrador', false,
    'REVISAR: la captura muestra «Secret Fragrance – Hair Perfume» y, parcialmente, «Hier Essential». Confirmar la marca, si es aceite o perfume capilar, y el volumen. Falta precio y foto.'
  ),
  (
    'Mascarilla Bio_Plant 2 en 1',
    'mascarilla-bio-plant-2-en-1',
    'Mascarilla reconstructora para el cabello «Hair Reconstructor Mask» 2 en 1, de la línea Bio_Plant de Bomark International.',
    (select id from public.categories where slug = 'mascarillas'),
    'Bio_Plant',
    '1 L (34 fl oz)',
    'disponible', 'borrador', true,
    'Volumen leído en el envase: «volume: 1L / net. 34 FL.Oz.». Falta precio y foto.'
  ),
  (
    'Shampoo Bio_Plant',
    'shampoo-bio-plant',
    'Shampoo de la línea profesional Bio_Plant de Bomark International. Hay 5 opciones según el tipo de cabello. En la foto de referencia aparece la variante «Ginger Shampoo».',
    (select id from public.categories where slug = 'shampoos'),
    'Bio_Plant',
    '1 L (34 fl oz)',
    'disponible', 'borrador', true,
    'REVISAR: confirmar los nombres de las 5 variantes (solo se lee «Ginger Shampoo»). Falta precio y foto.'
  ),
  (
    'Acondicionador Bio_Plant',
    'acondicionador-bio-plant',
    'Acondicionador «Hair Conditioner» de la línea profesional Bio_Plant de Bomark International.',
    (select id from public.categories where slug = 'acondicionadores'),
    'Bio_Plant',
    '1 L (34 fl oz)',
    'disponible', 'borrador', true,
    'Volumen leído en el envase: «Volume: 1L / net. 34 FL.Oz.». Falta precio y foto.'
  ),
  (
    'Minoxidil 5 % en spray',
    'minoxidil-5-en-spray',
    'Minoxidil 5 % en presentación spray, ideal para llevar de viaje o en la bolsa. El empaque indica «Hair Growth Treatment – For Hair and Beard».',
    (select id from public.categories where slug = 'tratamientos'),
    'Biogence',
    '125 ml (4.17 fl oz)',
    'disponible', 'borrador', false,
    'REVISAR: el minoxidil es un principio activo. Confirmar los requisitos sanitarios locales para anunciarlo y no añadir afirmaciones de salud. Falta precio y foto.'
  ),
  (
    'Combo Bio_Plant: shampoo, acondicionador y mascarilla',
    'combo-bio-plant',
    'Puedes comprar el shampoo, el acondicionador y la mascarilla Bio_Plant por separado o el combo de los 3 productos a un mejor precio.',
    (select id from public.categories where slug = 'combos'),
    'Bio_Plant',
    '3 productos',
    'disponible', 'borrador', false,
    'Definir el precio del combo y subir una foto de los 3 productos juntos.'
  )
on conflict (slug) do nothing;
