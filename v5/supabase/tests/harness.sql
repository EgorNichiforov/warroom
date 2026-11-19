-- A stand-in for the Supabase project as it is tonight (roles, the three existing tables, warroom_key and the three key policies).
drop schema if exists public cascade; create schema public; drop schema if exists extensions cascade; drop schema if exists net cascade; drop schema if exists cron cascade;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema extensions; create extension if not exists pgcrypto with schema extensions;
grant usage on schema public, extensions to anon, authenticated, service_role;
-- Supabase gives the browser roles rights on every new table and function by default; the migration has to take them back.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create schema net; create table net.calls(id bigserial primary key, url text, headers jsonb, body jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ insert into net.calls(url, headers, body) values (url, headers, body) returning id $$;
create schema cron; create table cron.job(jobname text primary key, schedule text, command text);
create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ insert into cron.job values (a,b,c) on conflict (jobname) do update set schedule=excluded.schedule, command=excluded.command returning 1::bigint $$;
create table public.warroom_sync (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table public.warroom_secret (id text primary key, ai jsonb, updated_at timestamptz default now());
create table public.warroom_backup (backup_id bigint generated always as identity primary key, taken_at timestamptz not null default now(), label text, src_id text, src_updated_at timestamptz, data jsonb, md5 text);
alter table public.warroom_sync enable row level security; alter table public.warroom_secret enable row level security; alter table public.warroom_backup enable row level security;
grant select, insert, update on public.warroom_sync to anon; grant all on all tables in schema public to service_role;
create function public.warroom_key() returns text language sql stable set search_path = '' as $$ select nullif(current_setting('request.headers', true)::json->>'x-warroom-key','') $$;
create policy warroom_select_by_key on public.warroom_sync for select to anon using (length(coalesce(public.warroom_key(),''))>=16 and id = public.warroom_key());
create policy warroom_insert_by_key on public.warroom_sync for insert to anon with check (length(coalesce(public.warroom_key(),''))>=16 and id = public.warroom_key());
create policy warroom_update_by_key on public.warroom_sync for update to anon using (length(coalesce(public.warroom_key(),''))>=16 and id = public.warroom_key()) with check (length(coalesce(public.warroom_key(),''))>=16 and id = public.warroom_key());
insert into public.warroom_sync(id, data) values ('ROOMAAAAAAAAAAAAAAAA1', '{"days":{},"inbox":{},"goals":{}}'), ('ROOMAAAAAAAAAAAAAAAA1:queue', '{"items":{}}'), ('ROOMAAAAAAAAAAAAAAAA1:snap1', '{}'), ('ROOMBBBBBBBBBBBBBBBB2', '{"days":{},"sources":{}}'), ('staging-xxxxxxxxxxxxxxxx', '{}');
insert into public.warroom_secret(id, ai) values ('ROOMAAAAAAAAAAAAAAAA1', '{"provider":"gemini","key":"k","model":"m"}');
