-- Esquema del catálogo: categorías, productos, imágenes, ajustes y administradores.
-- La seguridad depende de Row Level Security (RLS): los visitantes (rol anon) solo leen
-- productos publicados y sus imágenes; toda escritura exige ser administrador.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Administradores
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Sin políticas: la tabla solo se gestiona desde el panel SQL de Supabase.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_name_unique on public.categories (lower(btrim(name)));
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 140),
  description text not null default '' check (char_length(description) <= 4000),
  category_id uuid references public.categories (id) on delete restrict,
  brand text check (brand is null or char_length(btrim(brand)) between 1 and 80),
  presentation text check (presentation is null or char_length(btrim(presentation)) between 1 and 80),
  price numeric(12, 2) check (price is null or (price >= 0 and price < 10000000)),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  availability text not null default 'disponible' check (availability in ('disponible', 'agotado')),
  status text not null default 'borrador' check (status in ('borrador', 'publicado')),
  featured boolean not null default false,
  -- Notas internas (p. ej. datos dudosos por revisar). Nunca se exponen a visitantes.
  review_notes text check (review_notes is null or char_length(review_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_currency check ((price is null) = (currency is null)),
  constraint products_publish_requirements check (
    status <> 'publicado'
    or (char_length(btrim(description)) >= 10 and category_id is not null)
  )
);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status, featured);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Imágenes de producto (la de menor "position" es la principal)
-- ---------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null check (path ~ '^products/[A-Za-z0-9/_.-]+$'),
  thumb_path text not null check (thumb_path ~ '^products/[A-Za-z0-9/_.-]+$'),
  alt text not null check (char_length(btrim(alt)) between 3 and 200),
  position integer not null default 0,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);
create index product_images_path_idx on public.product_images (path);

-- Un producto publicado debe tener al menos una imagen. Se comprueba al final de la
-- transacción para permitir guardar producto e imágenes en una sola operación.
create or replace function public.check_published_has_image()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  if tg_table_name = 'products' then
    v_product_id := new.id;
  else
    v_product_id := old.product_id;
  end if;

  if exists (
    select 1 from public.products p
    where p.id = v_product_id
      and p.status = 'publicado'
      and not exists (select 1 from public.product_images i where i.product_id = p.id)
  ) then
    raise exception 'Para publicar, el producto necesita al menos una imagen.'
      using errcode = 'P0001', hint = 'publicar_sin_imagen';
  end if;
  return null;
end;
$$;

create constraint trigger products_require_image
  after insert or update on public.products
  deferrable initially deferred
  for each row execute function public.check_published_has_image();

create constraint trigger product_images_keep_one
  after delete or update on public.product_images
  deferrable initially deferred
  for each row execute function public.check_published_has_image();

-- ---------------------------------------------------------------------------
-- Ajustes del negocio (una sola fila)
-- ---------------------------------------------------------------------------
create table public.settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Mímate by Andrea' check (char_length(btrim(business_name)) between 2 and 60),
  tagline text default 'Un momento para ti' check (tagline is null or char_length(tagline) <= 140),
  about text check (about is null or char_length(about) <= 1500),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[1-9][0-9]{7,14}$'),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https://[^\s]+$'),
  facebook_url text check (facebook_url is null or facebook_url ~ '^https://[^\s]+$'),
  tiktok_url text check (tiktok_url is null or tiktok_url ~ '^https://[^\s]+$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  default_currency text not null default 'GTQ' check (default_currency ~ '^[A-Z]{3}$'),
  logo_path text check (logo_path is null or logo_path ~ '^settings/[A-Za-z0-9/_.-]+$'),
  updated_at timestamptz not null default now()
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
insert into public.settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.settings enable row level security;

create policy "categorias visibles" on public.categories
  for select to anon, authenticated using (true);
create policy "categorias admin inserta" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "categorias admin modifica" on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "categorias admin elimina" on public.categories
  for delete to authenticated using ((select public.is_admin()));

create policy "productos publicados o admin" on public.products
  for select to anon, authenticated using (status = 'publicado' or (select public.is_admin()));
create policy "productos admin inserta" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "productos admin modifica" on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "productos admin elimina" on public.products
  for delete to authenticated using ((select public.is_admin()));

create policy "imagenes de publicados o admin" on public.product_images
  for select to anon, authenticated using (
    (select public.is_admin())
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'publicado')
  );
create policy "imagenes admin inserta" on public.product_images
  for insert to authenticated with check ((select public.is_admin()));
create policy "imagenes admin modifica" on public.product_images
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "imagenes admin elimina" on public.product_images
  for delete to authenticated using ((select public.is_admin()));

create policy "ajustes visibles" on public.settings
  for select to anon, authenticated using (true);
create policy "ajustes admin modifica" on public.settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Los visitantes no pueden leer las notas internas de revisión.
revoke select on public.products from anon;
grant select (
  id, name, slug, description, category_id, brand, presentation, price, currency,
  availability, status, featured, created_at, updated_at
) on public.products to anon;

-- Los visitantes solo leen; se retiran privilegios de escritura como defensa adicional.
revoke insert, update, delete, truncate on public.categories, public.products,
  public.product_images, public.settings, public.admins from anon;

-- ---------------------------------------------------------------------------
-- Almacenamiento de imágenes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- El bucket es público para servir imágenes por URL; listar, subir, reemplazar y borrar
-- archivos queda restringido al administrador.
create policy "admin lee archivos" on storage.objects
  for select to authenticated using (bucket_id = 'productos' and (select public.is_admin()));
create policy "admin sube archivos" on storage.objects
  for insert to authenticated with check (bucket_id = 'productos' and (select public.is_admin()));
create policy "admin reemplaza archivos" on storage.objects
  for update to authenticated using (bucket_id = 'productos' and (select public.is_admin()))
  with check (bucket_id = 'productos' and (select public.is_admin()));
create policy "admin borra archivos" on storage.objects
  for delete to authenticated using (bucket_id = 'productos' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Funciones públicas de lectura
-- ---------------------------------------------------------------------------

-- Búsqueda del catálogo: nombre, marca o presentación, sin distinguir tildes ni mayúsculas.
create or replace function public.search_catalog(
  p_q text default null,
  p_category text default null,
  p_featured_only boolean default false,
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  slug text,
  brand text,
  presentation text,
  price numeric,
  currency text,
  availability text,
  featured boolean,
  category_name text,
  category_slug text,
  image_path text,
  image_thumb text,
  image_alt text,
  image_width integer,
  image_height integer,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      nullif(btrim(coalesce(p_q, '')), '') as q,
      nullif(btrim(coalesce(p_category, '')), '') as cat
  ),
  filtered as (
    select p.id, p.name, p.slug, p.brand, p.presentation, p.price, p.currency,
      p.availability, p.featured, c.name as c_name, c.slug as c_slug
    from public.products p
    left join public.categories c on c.id = p.category_id
    cross join params
    where p.status = 'publicado'
      and (params.cat is null or c.slug = params.cat)
      and (not p_featured_only or p.featured)
      and (
        params.q is null
        or extensions.unaccent(lower(p.name || ' ' || coalesce(p.brand, '') || ' ' || coalesce(p.presentation, '')))
           like '%' || replace(replace(replace(extensions.unaccent(lower(params.q)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      )
  )
  select
    f.id, f.name, f.slug, f.brand, f.presentation, f.price, f.currency, f.availability, f.featured,
    f.c_name, f.c_slug,
    img.path, img.thumb_path, img.alt, img.width, img.height,
    count(*) over () as total_count
  from filtered f
  left join lateral (
    select i.path, i.thumb_path, i.alt, i.width, i.height
    from public.product_images i
    where i.product_id = f.id
    order by i.position, i.created_at
    limit 1
  ) img on true
  order by f.featured desc, f.availability asc, f.name asc
  limit least(greatest(p_limit, 1), 48)
  offset greatest(p_offset, 0);
$$;
grant execute on function public.search_catalog(text, text, boolean, integer, integer) to anon, authenticated;

-- Categorías con su número de productos publicados.
create or replace function public.public_categories()
returns table (name text, slug text, product_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.name, c.slug, count(p.id) as product_count
  from public.categories c
  left join public.products p on p.category_id = c.id and p.status = 'publicado'
  group by c.id
  order by c.position, c.name;
$$;
grant execute on function public.public_categories() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Funciones de administración
-- ---------------------------------------------------------------------------

-- Devuelve, de una lista de rutas, las que ya no usa ningún producto ni el logotipo.
create or replace function public.unreferenced_paths(p_paths text[])
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(distinct x), '{}')
  from unnest(p_paths) as x
  where x is not null
    and not exists (select 1 from public.product_images i where i.path = x or i.thumb_path = x)
    and not exists (select 1 from public.settings s where s.logo_path = x);
$$;

-- Guarda un producto y su lista completa de imágenes en una sola transacción.
-- p_images: [{id, path, thumb_path, alt, position, width, height}]
-- Devuelve el producto guardado y las rutas de archivos que quedaron sin uso.
create or replace function public.save_product(p_id uuid, p_data jsonb, p_images jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_old_paths text[];
  v_new_paths text[];
  v_product public.products;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array' then
    raise exception 'Formato de imágenes inválido' using errcode = '22023';
  end if;

  if coalesce((p_data ->> 'expect_existing')::boolean, false)
     and not exists (select 1 from public.products where id = v_id) then
    raise exception 'El producto ya no existe' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(x), '{}') into v_old_paths
  from public.product_images i, lateral unnest(array[i.path, i.thumb_path]) as x
  where i.product_id = v_id;

  insert into public.products as p (
    id, name, slug, description, category_id, brand, presentation, price, currency,
    availability, status, featured, review_notes
  )
  values (
    v_id,
    btrim(p_data ->> 'name'),
    p_data ->> 'slug',
    coalesce(p_data ->> 'description', ''),
    nullif(p_data ->> 'category_id', '')::uuid,
    nullif(btrim(p_data ->> 'brand'), ''),
    nullif(btrim(p_data ->> 'presentation'), ''),
    nullif(p_data ->> 'price', '')::numeric,
    nullif(p_data ->> 'currency', ''),
    coalesce(p_data ->> 'availability', 'disponible'),
    coalesce(p_data ->> 'status', 'borrador'),
    coalesce((p_data ->> 'featured')::boolean, false),
    nullif(btrim(p_data ->> 'review_notes'), '')
  )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    category_id = excluded.category_id,
    brand = excluded.brand,
    presentation = excluded.presentation,
    price = excluded.price,
    currency = excluded.currency,
    availability = excluded.availability,
    status = excluded.status,
    featured = excluded.featured,
    review_notes = excluded.review_notes;

  delete from public.product_images i
  where i.product_id = v_id
    and i.id not in (
      select (e ->> 'id')::uuid from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) e
    );

  insert into public.product_images (id, product_id, path, thumb_path, alt, position, width, height)
  select
    (e ->> 'id')::uuid, v_id, e ->> 'path', e ->> 'thumb_path', btrim(e ->> 'alt'),
    coalesce((e ->> 'position')::int, 0),
    nullif(e ->> 'width', '')::int, nullif(e ->> 'height', '')::int
  from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) e
  on conflict (id) do update set
    alt = excluded.alt,
    position = excluded.position
  where public.product_images.product_id = v_id;

  -- Un id de imagen que pertenece a otro producto no se reasigna en silencio.
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) e
    join public.product_images i on i.id = (e ->> 'id')::uuid
    where i.product_id <> v_id
  ) then
    raise exception 'Imagen inválida' using errcode = '22023';
  end if;

  select coalesce(array_agg(x), '{}') into v_new_paths
  from public.product_images i, lateral unnest(array[i.path, i.thumb_path]) as x
  where i.product_id = v_id;

  select * into v_product from public.products where id = v_id;

  return jsonb_build_object(
    'product', to_jsonb(v_product),
    'orphan_paths', to_jsonb(public.unreferenced_paths(
      array(select unnest(v_old_paths) except select unnest(v_new_paths))
    ))
  );
end;
$$;

-- Elimina un producto y devuelve las rutas de archivos que quedaron sin uso.
create or replace function public.delete_product(p_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_paths text[];
  v_deleted integer;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(array_agg(x), '{}') into v_paths
  from public.product_images i, lateral unnest(array[i.path, i.thumb_path]) as x
  where i.product_id = p_id;

  delete from public.products where id = p_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'El producto ya no existe' using errcode = 'P0002';
  end if;

  return jsonb_build_object('orphan_paths', to_jsonb(public.unreferenced_paths(v_paths)));
end;
$$;

-- Archivos del bucket que no usa ningún producto ni el logotipo (con más de 1 hora de
-- antigüedad, para no tocar subidas en curso).
create or replace function public.orphan_files()
returns table (name text, size bigint, created_at timestamptz)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
    select o.name, coalesce((o.metadata ->> 'size')::bigint, 0), o.created_at
    from storage.objects o
    where o.bucket_id = 'productos'
      and o.created_at < now() - interval '1 hour'
      and not exists (select 1 from public.product_images i where i.path = o.name or i.thumb_path = o.name)
      and not exists (select 1 from public.settings s where s.logo_path = o.name)
    order by o.created_at;
end;
$$;

-- Uso aproximado de almacenamiento, para el seguimiento semanal del plan gratuito.
create or replace function public.storage_usage()
returns table (files bigint, bytes bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
    select count(*), coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
    from storage.objects o
    where o.bucket_id = 'productos';
end;
$$;

revoke execute on function public.unreferenced_paths(text[]) from public, anon;
revoke execute on function public.save_product(uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.delete_product(uuid) from public, anon;
revoke execute on function public.orphan_files() from public, anon;
revoke execute on function public.storage_usage() from public, anon;
grant execute on function public.unreferenced_paths(text[]) to authenticated;
grant execute on function public.save_product(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.delete_product(uuid) to authenticated;
grant execute on function public.orphan_files() to authenticated;
grant execute on function public.storage_usage() to authenticated;

-- Tamaño de la base de datos (para comparar con los 500 MB del plan gratuito).
create or replace function public.database_usage()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return pg_catalog.pg_database_size(pg_catalog.current_database());
end;
$$;
revoke execute on function public.database_usage() from public, anon;
grant execute on function public.database_usage() to authenticated;
