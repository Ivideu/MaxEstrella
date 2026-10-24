-- ============================================================
-- MAX ESTRELLA · Base de datos (Supabase)
-- Pega TODO este archivo en Supabase → SQL Editor → Run
-- ============================================================

-- ---------- TABLAS ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  venue text,
  city text,
  ticket_url text,
  note text,              -- comentario opcional que se muestra en la web
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  published boolean not null default true,
  published_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  url text not null,          -- enlace de YouTube / Instagram / TikTok o archivo MP4 subido
  title text,
  poster_url text,            -- miniatura opcional
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  category text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  bio text,
  photo_url text,
  sort int not null default 0
);

create table if not exists public.settings (
  key text primary key,
  value text
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  kind text,
  date_place text,
  message text,
  created_at timestamptz not null default now()
);

-- Si ya habías creado la tabla events con una versión anterior, esta línea añade el comentario:
alter table public.events add column if not exists note text;

-- ---------- SEGURIDAD (RLS) ----------
-- Cualquiera LEE el contenido público; solo usuarios con login ESCRIBEN.
alter table public.events    enable row level security;
alter table public.news      enable row level security;
alter table public.videos    enable row level security;
alter table public.photos    enable row level security;
alter table public.members   enable row level security;
alter table public.settings  enable row level security;
alter table public.inquiries enable row level security;

drop policy if exists "read events"   on public.events;
drop policy if exists "write events"  on public.events;
create policy "read events"  on public.events for select using (true);
create policy "write events" on public.events for all to authenticated using (true) with check (true);

drop policy if exists "read news"   on public.news;
drop policy if exists "write news"  on public.news;
create policy "read news"  on public.news for select using (published = true or auth.role() = 'authenticated');
create policy "write news" on public.news for all to authenticated using (true) with check (true);

drop policy if exists "read videos"   on public.videos;
drop policy if exists "write videos"  on public.videos;
create policy "read videos"  on public.videos for select using (true);
create policy "write videos" on public.videos for all to authenticated using (true) with check (true);

drop policy if exists "read photos"   on public.photos;
drop policy if exists "write photos"  on public.photos;
create policy "read photos"  on public.photos for select using (true);
create policy "write photos" on public.photos for all to authenticated using (true) with check (true);

drop policy if exists "read members"   on public.members;
drop policy if exists "write members"  on public.members;
create policy "read members"  on public.members for select using (true);
create policy "write members" on public.members for all to authenticated using (true) with check (true);

drop policy if exists "read settings"   on public.settings;
drop policy if exists "write settings"  on public.settings;
create policy "read settings"  on public.settings for select using (true);
create policy "write settings" on public.settings for all to authenticated using (true) with check (true);

-- Mensajes de contacto: cualquiera puede ENVIAR, solo la banda los LEE/borra.
drop policy if exists "send inquiries"   on public.inquiries;
drop policy if exists "read inquiries"   on public.inquiries;
drop policy if exists "delete inquiries" on public.inquiries;
create policy "send inquiries"   on public.inquiries for insert to anon, authenticated with check (true);
create policy "read inquiries"   on public.inquiries for select to authenticated using (true);
create policy "delete inquiries" on public.inquiries for delete to authenticated using (true);

-- ---------- ALMACÉN DE ARCHIVOS (fotos, MP4, portadas) ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media read"   on storage.objects;
drop policy if exists "media insert" on storage.objects;
drop policy if exists "media update" on storage.objects;
drop policy if exists "media delete" on storage.objects;
create policy "media read"   on storage.objects for select using (bucket_id = 'media');
create policy "media insert" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media update" on storage.objects for update to authenticated using (bucket_id = 'media');
create policy "media delete" on storage.objects for delete to authenticated using (bucket_id = 'media');

-- ---------- CONTENIDO INICIAL ----------
insert into public.settings (key, value) values
  ('hero_tagline', 'CANCIONES QUE ENAMORAN. Canciones que emocionan.'),
  ('bio', 'Max Estrella nace de la necesidad de contar lo que a veces no se dice: la soledad, la depresión que no avisa, el dolor que se convierte en canción.'),
  ('contact_email', 'contacto@maxestrella.es')
on conflict (key) do nothing;
alter table public.events add column if not exists note text;