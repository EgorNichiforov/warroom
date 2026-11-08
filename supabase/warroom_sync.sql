-- War Room sync table. Run once in the Supabase SQL editor of the "egorflow" project
-- (or any project; then paste its URL + publishable key in the app under More → Sync).
--
-- One row per sync code. Access is gated by the x-warroom-key request header, so the
-- public publishable key alone cannot read or write anybody's row. Reversible with:
--   drop table public.warroom_sync; drop function public.warroom_key();

create table if not exists public.warroom_sync (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.warroom_sync enable row level security;

create or replace function public.warroom_key() returns text
language sql stable as $$
  select nullif(current_setting('request.headers', true)::json->>'x-warroom-key', '')
$$;

drop policy if exists "warroom_select_by_key" on public.warroom_sync;
drop policy if exists "warroom_insert_by_key" on public.warroom_sync;
drop policy if exists "warroom_update_by_key" on public.warroom_sync;

create policy "warroom_select_by_key" on public.warroom_sync
  for select to anon
  using (length(coalesce(public.warroom_key(), '')) >= 16 and id = public.warroom_key());

create policy "warroom_insert_by_key" on public.warroom_sync
  for insert to anon
  with check (length(coalesce(public.warroom_key(), '')) >= 16 and id = public.warroom_key());

create policy "warroom_update_by_key" on public.warroom_sync
  for update to anon
  using (length(coalesce(public.warroom_key(), '')) >= 16 and id = public.warroom_key())
  with check (length(coalesce(public.warroom_key(), '')) >= 16 and id = public.warroom_key());

grant select, insert, update on public.warroom_sync to anon;
