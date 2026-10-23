-- ============================================================
-- MENSAJES: leído / no leído, respuestas por email
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → Run
-- (se puede repetir sin problema: no duplica nada)
-- ============================================================

-- 1) Estado de cada mensaje
alter table public.inquiries add column if not exists read boolean not null default false;
alter table public.inquiries add column if not exists replied_at timestamptz;

-- Los mensajes que ya tuvieras quedan como "sin leer".
-- Si prefieres marcarlos todos como leídos, quita los dos guiones de la línea siguiente:
-- update public.inquiries set read = true;

-- 2) Historial de respuestas enviadas (se adapta solo al tipo de "id" de inquiries)
do $$
declare idtype text;
begin
  select format_type(a.atttypid, a.atttypmod) into idtype
  from pg_attribute a
  where a.attrelid = 'public.inquiries'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.inquiry_replies (
      id uuid primary key default gen_random_uuid(),
      inquiry_id %s not null references public.inquiries(id) on delete cascade,
      body text not null,
      sent_by text,
      created_at timestamptz not null default now()
    )$f$, idtype);
end $$;

-- 3) Permisos
alter table public.inquiry_replies enable row level security;

drop policy if exists "banda lee respuestas" on public.inquiry_replies;
create policy "banda lee respuestas" on public.inquiry_replies
  for select to authenticated using (true);
-- (las respuestas solo las inserta la función reply-inquiry, que se salta estas reglas)

drop policy if exists "banda actualiza mensajes" on public.inquiries;
create policy "banda actualiza mensajes" on public.inquiries
  for update to authenticated using (true) with check (true);
