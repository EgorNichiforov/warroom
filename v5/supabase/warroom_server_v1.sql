-- War Room server, v1 (19 Nov 2026). ADDITIVE ONLY: no existing table, policy or function is changed.
-- Apply as ONE migration (name: warroom_server_v1_devices_jobs_audit). It needs Egor's confirmation in the Supabase prompt.
-- After it: apply warroom_server_v1_policies_cron.sql, then insert the schedules (see WAR_ROOM_EXECUTION_STATE.md).
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.warroom_config (k text primary key, v text not null, updated_at timestamptz not null default now());
create table if not exists public.warroom_room (room text primary key, locked boolean not null default false, locked_at timestamptz, ai_cap int not null default 6, tz text not null default 'Europe/Chisinau', updated_at timestamptz not null default now());
create table if not exists public.warroom_device (id uuid primary key default gen_random_uuid(), room text not null, name text not null default 'device', token_hash text not null unique, created_at timestamptz not null default now(), last_seen timestamptz, revoked_at timestamptz);
create index if not exists warroom_device_room_i on public.warroom_device(room);
create table if not exists public.warroom_job (id bigint generated always as identity primary key, room text not null, kind text not null, payload jsonb not null default '{}'::jsonb, status text not null default 'queued' check (status in ('queued','running','done','failed','cancelled')), attempts int not null default 0, max_attempts int not null default 3, run_after timestamptz not null default now(), idem text unique, by text, created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz, result jsonb, error text);
create index if not exists warroom_job_due_i on public.warroom_job(status, run_after);
create index if not exists warroom_job_room_i on public.warroom_job(room, id desc);
create table if not exists public.warroom_schedule (room text not null, kind text not null, enabled boolean not null default true, hour int not null check (hour between 0 and 23), minute int not null default 0 check (minute between 0 and 59), dow int[], last_day date, primary key (room, kind));
create table if not exists public.warroom_audit (id bigint generated always as identity primary key, at timestamptz not null default now(), room text not null, device uuid, action text not null, detail jsonb);
create index if not exists warroom_audit_room_i on public.warroom_audit(room, id desc);

alter table public.warroom_config enable row level security;
alter table public.warroom_room enable row level security;
alter table public.warroom_device enable row level security;
alter table public.warroom_job enable row level security;
alter table public.warroom_schedule enable row level security;
alter table public.warroom_audit enable row level security;
revoke all on public.warroom_config, public.warroom_room, public.warroom_device, public.warroom_job, public.warroom_schedule, public.warroom_audit from anon, authenticated;

insert into public.warroom_config(k, v) values ('worker_secret', encode(extensions.gen_random_bytes(32), 'hex')) on conflict (k) do nothing;

create or replace function public.warroom_device_room() returns text language sql stable security definer set search_path = '' as $$
  select d.room from public.warroom_device d
  where d.revoked_at is null
    and d.token_hash = encode(extensions.digest(coalesce(nullif(current_setting('request.headers', true)::json->>'x-warroom-device', ''), '-'), 'sha256'), 'hex')
  limit 1
$$;

create or replace function public.warroom_caller(out room text, out device uuid) returns record language plpgsql stable security definer set search_path = '' as $$
declare k text := public.warroom_key(); h text := nullif(current_setting('request.headers', true)::json->>'x-warroom-device', ''); d record;
begin
  room := null; device := null;
  if h is not null then
    select dv.id, dv.room into d from public.warroom_device dv where dv.revoked_at is null and dv.token_hash = encode(extensions.digest(h, 'sha256'), 'hex') limit 1;
    if found then room := d.room; device := d.id; return; end if;
  end if;
  if k is not null and length(k) >= 16 and position(':' in k) = 0 and k not like 'staging-%' and k not like 'share-%'
     and exists (select 1 from public.warroom_sync s where s.id = k)
     and not exists (select 1 from public.warroom_room r where r.room = k and r.locked) then
    room := k;
  end if;
end $$;

create or replace function public.warroom_log(p_room text, p_device uuid, p_action text, p_detail jsonb) returns void language sql security definer set search_path = '' as $$
  insert into public.warroom_audit(room, device, action, detail) values (p_room, p_device, p_action, p_detail)
$$;

create or replace function public.warroom_device_enrol(p_name text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare k text := public.warroom_key(); tok text; did uuid; n int;
begin
  if k is null or length(k) < 16 or position(':' in k) > 0 or k like 'staging-%' or k like 'share-%' or not exists (select 1 from public.warroom_sync s where s.id = k) then return jsonb_build_object('error', 'Unknown War Room'); end if;
  if exists (select 1 from public.warroom_room r where r.room = k and r.locked) then return jsonb_build_object('error', 'Key-only access is locked. Unlock from an enrolled device, enrol this one, then lock again.'); end if;
  select count(*) into n from public.warroom_device where room = k and revoked_at is null;
  if n >= 12 then return jsonb_build_object('error', 'Too many devices. Revoke one first.'); end if;
  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.warroom_device(room, name, token_hash, last_seen) values (k, left(coalesce(nullif(trim(p_name), ''), 'device'), 60), encode(extensions.digest(tok, 'sha256'), 'hex'), now()) returning id into did;
  perform public.warroom_log(k, did, 'device enrolled', jsonb_build_object('name', left(coalesce(p_name, ''), 60)));
  return jsonb_build_object('id', did, 'token', tok);
end $$;

create or replace function public.warroom_devices() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  c := public.warroom_caller(); if c.room is null then return jsonb_build_object('error', 'Not authorised'); end if;
  if c.device is not null then update public.warroom_device set last_seen = now() where id = c.device; end if;
  return jsonb_build_object('me', c.device, 'locked', coalesce((select r.locked from public.warroom_room r where r.room = c.room), false),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'created', d.created_at, 'seen', d.last_seen, 'revoked', d.revoked_at) order by d.created_at) from public.warroom_device d where d.room = c.room), '[]'::jsonb));
end $$;

create or replace function public.warroom_device_revoke(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  c := public.warroom_caller(); if c.room is null then return jsonb_build_object('error', 'Not authorised'); end if;
  update public.warroom_device set revoked_at = now() where id = p_id and room = c.room and revoked_at is null;
  if not found then return jsonb_build_object('error', 'No such active device'); end if;
  perform public.warroom_log(c.room, c.device, 'device revoked', jsonb_build_object('device', p_id));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.warroom_lock(p_on boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  c := public.warroom_caller(); if c.room is null or c.device is null then return jsonb_build_object('error', 'Only an enrolled device can change this'); end if;
  insert into public.warroom_room(room, locked, locked_at) values (c.room, p_on, case when p_on then now() end)
    on conflict (room) do update set locked = excluded.locked, locked_at = excluded.locked_at, updated_at = now();
  perform public.warroom_log(c.room, c.device, case when p_on then 'key-only access locked' else 'key-only access unlocked' end, null);
  return jsonb_build_object('ok', true, 'locked', p_on);
end $$;

create or replace function public.warroom_wake() returns bigint language plpgsql security definer set search_path = '' as $$
declare sec text; req bigint;
begin
  select v into sec from public.warroom_config where k = 'worker_secret';
  select net.http_post(url := 'https://lajechvmsrmrmfcluhkr.supabase.co/functions/v1/warroom-worker', headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', sec), body := jsonb_build_object('op', 'tick'), timeout_milliseconds := 120000) into req;
  return req;
exception when others then return null;
end $$;

create or replace function public.warroom_enqueue(p_kind text, p_payload jsonb, p_idem text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record; jid bigint; n int;
begin
  c := public.warroom_caller(); if c.room is null then return jsonb_build_object('error', 'Not authorised'); end if;
  if p_kind not in ('brief', 'quality', 'research', 'role', 'backup') then return jsonb_build_object('error', 'Unknown kind of job'); end if;
  select count(*) into n from public.warroom_job where room = c.room and status in ('queued', 'running');
  if n >= 20 then return jsonb_build_object('error', 'Too many jobs waiting'); end if;
  if pg_column_size(coalesce(p_payload, '{}'::jsonb)) > 8000 then return jsonb_build_object('error', 'Request too large'); end if;
  insert into public.warroom_job(room, kind, payload, idem, by) values (c.room, p_kind, coalesce(p_payload, '{}'::jsonb), nullif(p_idem, ''), coalesce(c.device::text, 'key'))
    on conflict (idem) do nothing returning id into jid;
  if jid is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  perform public.warroom_log(c.room, c.device, 'job queued', jsonb_build_object('kind', p_kind, 'job', jid));
  perform public.warroom_wake();
  return jsonb_build_object('ok', true, 'id', jid);
end $$;

create or replace function public.warroom_jobs(p_limit int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  c := public.warroom_caller(); if c.room is null then return jsonb_build_object('error', 'Not authorised'); end if;
  return jsonb_build_object('jobs', coalesce((select jsonb_agg(x order by (x->>'id')::bigint desc) from (select jsonb_build_object('id', j.id, 'kind', j.kind, 'status', j.status, 'attempts', j.attempts, 'by', case when j.by = 'schedule' then 'schedule' else 'you' end, 'created', j.created_at, 'finished', j.finished_at, 'error', j.error, 'summary', j.result->>'summary', 'ai', j.result->'ai_calls') as x from public.warroom_job j where j.room = c.room order by j.id desc limit least(greatest(coalesce(p_limit, 20), 1), 60)) q), '[]'::jsonb));
end $$;

create or replace function public.warroom_job_cancel(p_id bigint) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  c := public.warroom_caller(); if c.room is null then return jsonb_build_object('error', 'Not authorised'); end if;
  update public.warroom_job set status = 'cancelled', finished_at = now() where id = p_id and room = c.room and status = 'queued';
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.warroom_schedules() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  c := public.warroom_caller(); if c.room is null then return jsonb_build_object('error', 'Not authorised'); end if;
  return jsonb_build_object('schedules', coalesce((select jsonb_agg(jsonb_build_object('kind', s.kind, 'enabled', s.enabled, 'hour', s.hour, 'minute', s.minute, 'dow', s.dow, 'last', s.last_day) order by s.hour, s.minute) from public.warroom_schedule s where s.room = c.room), '[]'::jsonb),
    'ai_cap', coalesce((select r.ai_cap from public.warroom_room r where r.room = c.room), 6));
end $$;

create or replace function public.warroom_schedule_set(p_kind text, p_enabled boolean, p_hour int, p_minute int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  c := public.warroom_caller(); if c.room is null then return jsonb_build_object('error', 'Not authorised'); end if;
  if p_kind not in ('brief', 'quality', 'research', 'backup') or p_hour not between 0 and 23 or coalesce(p_minute, 0) not between 0 and 59 then return jsonb_build_object('error', 'Bad schedule'); end if;
  insert into public.warroom_schedule(room, kind, enabled, hour, minute, dow) values (c.room, p_kind, p_enabled, p_hour, coalesce(p_minute, 0), case when p_kind = 'quality' then array[1] end)
    on conflict (room, kind) do update set enabled = excluded.enabled, hour = excluded.hour, minute = excluded.minute;
  perform public.warroom_log(c.room, c.device, 'schedule changed', jsonb_build_object('kind', p_kind, 'enabled', p_enabled, 'hour', p_hour, 'minute', coalesce(p_minute, 0)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.warroom_audit_list(p_limit int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  c := public.warroom_caller(); if c.room is null then return jsonb_build_object('error', 'Not authorised'); end if;
  return jsonb_build_object('audit', coalesce((select jsonb_agg(x) from (select jsonb_build_object('at', a.at, 'action', a.action, 'device', (select d.name from public.warroom_device d where d.id = a.device), 'detail', a.detail) as x from public.warroom_audit a where a.room = c.room order by a.id desc limit least(greatest(coalesce(p_limit, 30), 1), 100)) q), '[]'::jsonb));
end $$;

create or replace function public.warroom_server_status() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  c := public.warroom_caller(); if c.room is null then return jsonb_build_object('error', 'Not authorised'); end if;
  return jsonb_build_object('ok', true, 'device', c.device, 'locked', coalesce((select r.locked from public.warroom_room r where r.room = c.room), false),
    'devices', (select count(*) from public.warroom_device d where d.room = c.room and d.revoked_at is null),
    'queued', (select count(*) from public.warroom_job j where j.room = c.room and j.status in ('queued', 'running')),
    'last_done', (select max(j.finished_at) from public.warroom_job j where j.room = c.room and j.status = 'done'),
    'failed_7d', (select count(*) from public.warroom_job j where j.room = c.room and j.status = 'failed' and j.created_at > now() - interval '7 days'),
    'ai_key', exists (select 1 from public.warroom_secret s where s.id = c.room and coalesce(s.ai->>'key', '') <> ''),
    'backups', (select count(*) from public.warroom_backup b where b.src_id = c.room and b.label = 'nightly'),
    'last_backup', (select max(b.taken_at) from public.warroom_backup b where b.src_id = c.room and b.label = 'nightly'));
end $$;

create or replace function public.warroom_job_claim(p_n int) returns setof public.warroom_job language sql security definer set search_path = '' as $$
  update public.warroom_job j set status = 'running', attempts = j.attempts + 1, started_at = now()
  where j.id in (select id from public.warroom_job where status = 'queued' and run_after <= now() order by id for update skip locked limit least(greatest(coalesce(p_n, 3), 1), 5))
  returning j.*
$$;
create or replace function public.warroom_job_finish(p_id bigint, p_ok boolean, p_result jsonb, p_error text) returns void language sql security definer set search_path = '' as $$
  update public.warroom_job set
    status = case when p_ok then 'done' when attempts >= max_attempts then 'failed' else 'queued' end,
    run_after = case when p_ok then run_after else now() + make_interval(mins => 10 * attempts) end,
    finished_at = case when p_ok or attempts >= max_attempts then now() end,
    result = coalesce(p_result, result), error = case when p_ok then null else left(p_error, 500) end
  where id = p_id and status = 'running'
$$;
create or replace function public.warroom_note(p_room text, p_id text, p_title text, p_body text) returns void language sql security definer set search_path = '' as $$
  update public.warroom_sync s set data = jsonb_set(s.data, '{inbox}', coalesce(s.data->'inbox', '{}'::jsonb) || jsonb_build_object(p_id, jsonb_build_object('id', p_id, '_u', v.m, 'at', v.m, 'from', 'Server', 'title', p_title, 'body', p_body))), updated_at = now()
  from (select (extract(epoch from clock_timestamp()) * 1000)::bigint as m) v where s.id = p_room
$$;
create or replace function public.warroom_backup_run(p_room text) returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.warroom_backup(label, src_id, src_updated_at, data, md5) select 'nightly', s.id, s.updated_at, s.data, md5(s.data::text) from public.warroom_sync s where s.id in (p_room, p_room || ':queue', p_room || ':bench');
  get diagnostics n = row_count;
  delete from public.warroom_backup b where b.label = 'nightly' and split_part(b.src_id, ':', 1) = p_room and b.taken_at < now() - interval '14 days';
  return n;
end $$;
create or replace function public.warroom_ai_used(p_room text) returns int language sql stable security definer set search_path = '' as $$
  select coalesce(sum(coalesce((j.result->>'ai_calls')::int, 0)), 0)::int from public.warroom_job j where j.room = p_room and j.created_at > now() - interval '24 hours'
$$;

create or replace function public.warroom_tick() returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; n_enq int := 0; n_due int; loc timestamp; today date; req bigint;
begin
  update public.warroom_job set status = case when attempts >= max_attempts then 'failed' else 'queued' end, error = left(coalesce(error, '') || ' [timed out]', 500), run_after = now() + interval '5 minutes', finished_at = case when attempts >= max_attempts then now() end
    where status = 'running' and started_at < now() - interval '10 minutes';
  for r in select s.room, s.kind, s.hour, s.minute, s.dow, s.last_day, coalesce(rm.tz, 'Europe/Chisinau') as tz from public.warroom_schedule s left join public.warroom_room rm on rm.room = s.room where s.enabled loop
    loc := now() at time zone r.tz; today := loc::date;
    if (r.last_day is null or r.last_day < today) and (extract(hour from loc)::int * 60 + extract(minute from loc)::int) >= r.hour * 60 + r.minute and (r.dow is null or extract(isodow from loc)::int = any (r.dow)) then
      insert into public.warroom_job(room, kind, payload, idem, by) values (r.room, r.kind, jsonb_build_object('scheduled', true, 'day', today), r.kind || ':' || today || ':' || md5(r.room), 'schedule') on conflict (idem) do nothing;
      update public.warroom_schedule set last_day = today where room = r.room and kind = r.kind; n_enq := n_enq + 1;
    end if;
  end loop;
  delete from public.warroom_audit where at < now() - interval '60 days';
  delete from public.warroom_job where created_at < now() - interval '45 days';
  select count(*) into n_due from public.warroom_job where status = 'queued' and run_after <= now();
  if n_due > 0 then req := public.warroom_wake(); end if;
  return jsonb_build_object('enqueued', n_enq, 'due', n_due, 'request', req);
end $$;

revoke all on function public.warroom_job_claim(int), public.warroom_job_finish(bigint, boolean, jsonb, text), public.warroom_note(text, text, text, text), public.warroom_backup_run(text), public.warroom_ai_used(text), public.warroom_tick(), public.warroom_wake(), public.warroom_log(text, uuid, text, jsonb), public.warroom_caller() from public, anon, authenticated;
grant execute on function public.warroom_job_claim(int), public.warroom_job_finish(bigint, boolean, jsonb, text), public.warroom_note(text, text, text, text), public.warroom_backup_run(text), public.warroom_ai_used(text) to service_role;
grant execute on function public.warroom_device_room(), public.warroom_device_enrol(text), public.warroom_devices(), public.warroom_device_revoke(uuid), public.warroom_lock(boolean), public.warroom_enqueue(text, jsonb, text), public.warroom_jobs(int), public.warroom_job_cancel(bigint), public.warroom_schedules(), public.warroom_schedule_set(text, boolean, int, int), public.warroom_audit_list(int), public.warroom_server_status() to anon;
