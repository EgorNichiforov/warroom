-- warroom_server_v1_owner (20 Nov 2026). One place that names the owner's War Room.
-- Why: every scheduled Claude task found the room as "the newest row that has days in it". A second room (a mistyped
-- sync code on a new device, a test) becomes the newest the moment it syncs, and every task would then read and write
-- the wrong one. Now the room is written down once, and tasks ask for it by name.
-- The id is a password: it is copied here by subquery, never typed, and the function is closed to the browser roles.
insert into public.warroom_config (k, v)
select 'owner_room', id from public.warroom_sync
where id not like '%:%' and id not like 'staging-%' and id not like 'share-%' and data ? 'days'
order by updated_at desc limit 1
on conflict (k) do nothing;

create or replace function public.warroom_owner() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select c.v from public.warroom_config c where c.k = 'owner_room' and exists (select 1 from public.warroom_sync s where s.id = c.v)),
    (select id from public.warroom_sync where id not like '%:%' and id not like 'staging-%' and id not like 'share-%' and data ? 'days' order by updated_at desc limit 1));
$$;
revoke all on function public.warroom_owner() from public, anon, authenticated;
grant execute on function public.warroom_owner() to service_role;
comment on function public.warroom_owner() is 'The owner''s War Room id for scheduled tasks. If the sync code is ever changed on purpose: update warroom_config set v = <new id> where k = ''owner_room''.';
