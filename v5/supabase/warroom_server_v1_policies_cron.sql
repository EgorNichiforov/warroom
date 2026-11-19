-- War Room server, v1, part 2. Apply AFTER warroom_server_v1.sql and AFTER the tests in WAR_ROOM_EXECUTION_STATE.md pass.
-- Device tokens become a second way into the data (permissive policies are OR-ed: these cannot reduce access).
create policy warroom_select_by_device on public.warroom_sync for select to anon using (split_part(id, ':', 1) = (select public.warroom_device_room()));
create policy warroom_insert_by_device on public.warroom_sync for insert to anon with check (split_part(id, ':', 1) = (select public.warroom_device_room()));
create policy warroom_update_by_device on public.warroom_sync for update to anon using (split_part(id, ':', 1) = (select public.warroom_device_room())) with check (split_part(id, ':', 1) = (select public.warroom_device_room()));

-- The gate. Open for every room unless that room chose to lock key-only access (warroom_room.locked), in which case
-- only a request carrying one of the room's device tokens passes. With no locked room this is always true.
create or replace function public.warroom_gate(p_id text) returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.warroom_room r where r.room = split_part(p_id, ':', 1) and r.locked)
      or split_part(p_id, ':', 1) = public.warroom_device_room()
$$;
grant execute on function public.warroom_gate(text) to anon;
create policy warroom_gate_locked on public.warroom_sync as restrictive for all to anon using (public.warroom_gate(id)) with check (public.warroom_gate(id));

-- who wrote: one audit line per write to the main row, never able to block the write
create or replace function public.warroom_sync_audit() returns trigger language plpgsql security definer set search_path = '' as $$
declare h text; did uuid;
begin
  begin
    if position(':' in new.id) = 0 and new.id not like 'staging-%' and new.id not like 'share-%' then
      h := nullif(current_setting('request.headers', true)::json->>'x-warroom-device', '');
      if h is not null then select d.id into did from public.warroom_device d where d.token_hash = encode(extensions.digest(h, 'sha256'), 'hex') limit 1; end if;
      if current_setting('request.headers', true) is not null and not exists (select 1 from public.warroom_audit a where a.room = new.id and a.action = 'data written' and a.device is not distinct from did and a.at > now() - interval '15 minutes') then
        insert into public.warroom_audit(room, device, action, detail) values (new.id, did, 'data written', jsonb_build_object('bytes', pg_column_size(new.data)));
      end if;
    end if;
  exception when others then null;
  end;
  return new;
end $$;
create trigger warroom_sync_audit_t after insert or update on public.warroom_sync for each row execute function public.warroom_sync_audit();

select cron.schedule('warroom-tick', '*/10 * * * *', $$select public.warroom_tick()$$);
