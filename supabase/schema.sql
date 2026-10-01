-- Fun Forest seizoenkaart-app — Supabase schema
-- Plak dit geheel in de Supabase SQL Editor (Dashboard > SQL Editor > New query) en draai het uit.

-- =========================================================================
-- 1. PROFIELEN (pas, bezoeken, voorkeuren)
-- =========================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  name         text not null default '',
  pass_number  text,                                  -- nummer van de fysieke seizoenkaart
  visits       integer not null default 0,
  notifications boolean not null default true,
  member_since timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "eigen profiel lezen" on public.profiles;
create policy "eigen profiel lezen"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "eigen profiel aanmaken" on public.profiles;
create policy "eigen profiel aanmaken"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "eigen profiel bijwerken" on public.profiles;
create policy "eigen profiel bijwerken"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =========================================================================
-- 2. RESERVERINGEN (6 plekken per tijdslot, 1 reservering per gast per slot)
-- =========================================================================
create table if not exists public.reservations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  user_name  text not null default '',
  slot_date  date not null,
  slot_time  text not null,                            -- 'HH:MM'
  created_at timestamptz not null default now(),
  unique (user_id, slot_date, slot_time)               -- geen dubbele boekingen
);

create index if not exists reservations_slot_idx
  on public.reservations (slot_date, slot_time);

alter table public.reservations enable row level security;

-- Iedereen die ingelogd is ziet alle reserveringen (nodig voor de beschikbaarheidsteller)
drop policy if exists "beschikbaarheid zien" on public.reservations;
create policy "beschikbaarheid zien"
  on public.reservations for select
  using (auth.role() = 'authenticated');

drop policy if exists "zelf reserveren" on public.reservations;
create policy "zelf reserveren"
  on public.reservations for insert
  with check (auth.uid() = user_id);

drop policy if exists "zelf annuleren" on public.reservations;
create policy "zelf annuleren"
  on public.reservations for delete
  using (auth.uid() = user_id);

-- =========================================================================
-- 3. RESERVEREN MET CAPACITEIT (max 6 per tijdslot), centraal afgedwongen
-- =========================================================================
create or replace function public.book_slot(
  p_date  date,
  p_time  text,
  p_email text,
  p_name  text
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_count integer;
  v_row   public.reservations;
begin
  if v_uid is null then
    raise exception 'Je bent niet ingelogd.';
  end if;

  select count(*) into v_count
  from public.reservations
  where slot_date = p_date and slot_time = p_time;

  if v_count >= 6 then
    raise exception 'Dit tijdslot is vol. Kies een ander tijdstip.';
  end if;

  begin
    insert into public.reservations (user_id, user_email, user_name, slot_date, slot_time)
    values (v_uid, coalesce(p_email, ''), coalesce(p_name, ''), p_date, p_time)
    returning * into v_row;
  exception
    when unique_violation then
      raise exception 'Je hebt dit tijdslot al gereserveerd. Kies een ander tijdstip.';
  end;

  return v_row;
end;
$$;

revoke all on function public.book_slot(date, text, text, text) from public;
grant execute on function public.book_slot(date, text, text, text) to authenticated;

-- =========================================================================
-- 4. AUTO-PROFIEL BIJ NIEUW ACCOUNT (optioneel, maakt signup simpeler)
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, pass_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'pass_number'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
