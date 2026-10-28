-- MÚSICA (Spotify) · ejecutar UNA vez en Supabase → SQL Editor → New query → Run
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  spotify_url text not null,   -- enlace de Spotify de una canción, álbum o lista
  title text,                  -- opcional: si está vacío se usa el nombre que da Spotify
  sort int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tracks enable row level security;
drop policy if exists "read tracks"  on public.tracks;
drop policy if exists "write tracks" on public.tracks;
create policy "read tracks"  on public.tracks for select using (true);
create policy "write tracks" on public.tracks for all to authenticated using (true) with check (true);
