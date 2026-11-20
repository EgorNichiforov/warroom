-- warroom_server_v1_closed (20 Nov 2026). This server belongs to one War Room.
-- Before: anyone holding the public key (it is in the page source) could create a new room, and a device opened with a
-- fresh or mistyped sync code created one too. A second room becomes "the newest row with days in it", which is how
-- the scheduled tasks find the room, so every task would read and write the wrong one.
-- Now: once an owner room is written down (warroom_config.owner_room), the browser role can only create or rename
-- rows that are the owner's room, a side row (an id with a colon), a staging- row or a share- row.
-- The owner's own syncs are untouched. To move to a new sync code on purpose: update warroom_config first.
create or replace function public.warroom_room_allowed(p_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_id like '%:%' or p_id like 'staging-%' or p_id like 'share-%'
      or not exists (select 1 from public.warroom_config where k = 'owner_room')
      or p_id = (select v from public.warroom_config where k = 'owner_room');
$$;
revoke all on function public.warroom_room_allowed(text) from public;
grant execute on function public.warroom_room_allowed(text) to anon, authenticated, service_role;
drop policy if exists warroom_closed_insert on public.warroom_sync;
drop policy if exists warroom_closed_update on public.warroom_sync;
create policy warroom_closed_insert on public.warroom_sync as restrictive for insert to anon, authenticated with check (public.warroom_room_allowed(id));
create policy warroom_closed_update on public.warroom_sync as restrictive for update to anon, authenticated with check (public.warroom_room_allowed(id));
