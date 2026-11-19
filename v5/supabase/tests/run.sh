#!/bin/bash
# Local proof of the server migration. Needs a throwaway Postgres 16 on /tmp:5544 (see README in this folder).
# It rebuilds a stand-in for the live project, applies both migration files, and checks every way in.
P="psql -h /tmp -p 5544 -U postgres -v ON_ERROR_STOP=1 -q -t -A"
D=$(cd "$(dirname "$0")" && pwd)
$P -f $D/harness.sql >/dev/null 2>&1 && grep -v "create extension" $D/../warroom_server_v1.sql | $P >/dev/null 2>&1 && $P -f $D/../warroom_server_v1_policies_cron.sql >/dev/null 2>&1 || { echo "SETUP FAILED"; exit 1; }
A=ROOMAAAAAAAAAAAAAAAA1; B=ROOMBBBBBBBBBBBBBBBB2; pass=0; fail=0
q() { # q '<headers json>' '<sql>' -> runs as the browser role
  $P 2>&1 <<SQL
set role anon; select set_config('request.headers', '$1', false) \g /dev/null
$2
SQL
}
ok() { if [ "$2" = "$3" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $1 | got: $2 | want: $3"; fi; }
has() { if echo "$2" | grep -q "$3"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $1 | got: $2 | want match: $3"; fi; }
K="{\"x-warroom-key\":\"$A\"}"; KB="{\"x-warroom-key\":\"$B\"}"
# 1. Nothing changes for a device that only has the key
ok "key reads its row" "$(q "$K" "select count(*) from warroom_sync")" 1
ok "key writes its row" "$(q "$K" "update warroom_sync set data = data || '{\"t\":1}' where id='$A' returning 1")" 1
ok "no key reads nothing" "$(q '{}' "select count(*) from warroom_sync")" 0
ok "key cannot read the queue row without naming it" "$(q "$K" "select count(*) from warroom_sync where id like '%:queue'")" 0
ok "queue row by its own key still works" "$(q "{\"x-warroom-key\":\"$A:queue\"}" "select count(*) from warroom_sync")" 1
# 2. Private tables are closed to the browser
has "browser cannot read devices" "$(q "$K" "select count(*) from warroom_device")" "permission denied"
has "browser cannot read config" "$(q "$K" "select v from warroom_config")" "permission denied"
has "browser cannot read jobs" "$(q "$K" "select count(*) from warroom_job")" "permission denied"
has "browser cannot claim jobs" "$(q "$K" "select * from warroom_job_claim(3)")" "permission denied"
has "browser cannot write notes" "$(q "$K" "select warroom_note('$A','x','t','b')")" "permission denied"
has "browser cannot ask who it is" "$(q "$K" "select * from warroom_caller()")" "permission denied"
has "browser cannot run the tick" "$(q "$K" "select warroom_tick()")" "permission denied"
# 3. Enrol
has "enrol needs a real room" "$(q '{"x-warroom-key":"NOSUCHROOMXXXXXXXXXXXX"}' "select warroom_device_enrol('x')")" "Unknown War Room"
has "enrol refuses a sub-row key" "$(q "{\"x-warroom-key\":\"$A:queue\"}" "select warroom_device_enrol('x')")" "Unknown War Room"
T1=$(q "$K" "select warroom_device_enrol('Phone')->>'token'"); T2=$(q "$K" "select warroom_device_enrol('Laptop')->>'token'"); TB=$(q "$KB" "select warroom_device_enrol('Other')->>'token'")
ok "token is 64 hex" "${#T1}" 64
ok "token is not stored" "$($P -c "select count(*) from warroom_device where token_hash = '$T1'")" 0
D1="{\"x-warroom-device\":\"$T1\"}"; D2="{\"x-warroom-device\":\"$T2\"}"; DB="{\"x-warroom-device\":\"$TB\"}"
# 4. A device token alone reads and writes the room's rows, and only that room's
ok "device reads main + queue + snapshot" "$(q "$D1" "select count(*) from warroom_sync")" 3
ok "device writes main" "$(q "$D1" "update warroom_sync set data = data || '{\"t\":2}' where id='$A' returning 1")" 1
ok "device inserts a new sub-row" "$(q "$D1" "insert into warroom_sync(id,data) values ('$A:bench','{}') returning 1")" 1
has "device cannot insert into another room" "$(q "$D1" "insert into warroom_sync(id,data) values ('$B:bench','{}') returning 1")" "row-level security"
ok "device cannot update another room" "$(q "$D1" "update warroom_sync set data='{}' where id='$B' returning 1")" ""
ok "other room's device sees only its row" "$(q "$DB" "select string_agg(id,',') from warroom_sync")" "$B"
ok "made-up token reads nothing" "$(q '{"x-warroom-device":"deadbeef"}' "select count(*) from warroom_sync")" 0
# 5. RPCs
ok "status by key" "$(q "$K" "select warroom_server_status()->>'devices'")" 2
ok "status by device" "$(q "$D1" "select (warroom_server_status()->>'device') is not null")" t
has "status with nothing" "$(q '{}' "select warroom_server_status()")" "Not authorised"
ok "devices list" "$(q "$D1" "select jsonb_array_length(warroom_devices()->'devices')")" 2
has "enqueue unknown kind" "$(q "$D1" "select warroom_enqueue('rm -rf','{}',null)")" "Unknown kind"
has "enqueue ok" "$(q "$D1" "select warroom_enqueue('quality','{}','t1')")" '"ok": true'
has "enqueue same idem is a duplicate" "$(q "$D1" "select warroom_enqueue('quality','{}','t1')")" "duplicate"
ok "worker was woken with the secret" "$($P -c "select (headers->>'x-worker-secret') = (select v from warroom_config where k='worker_secret') from net.calls order by id desc limit 1")" t
ok "jobs list hides other rooms" "$(q "$DB" "select jsonb_array_length(warroom_jobs(20)->'jobs')")" 0
ok "jobs list" "$(q "$K" "select warroom_jobs(20)->'jobs'->0->>'status'")" queued
has "schedule set" "$(q "$D1" "select warroom_schedule_set('brief', true, 6, 10)")" '"ok": true'
has "schedule refuses role kind" "$(q "$D1" "select warroom_schedule_set('role', true, 6, 10)")" "Bad schedule"
# 6. Worker side (service role)
J=$($P -c "set role service_role; select id from warroom_job_claim(3)" | head -1)
ok "claim marks running" "$($P -c "select status||attempts from warroom_job where id=$J")" running1
ok "second claim gets nothing" "$($P -c "set role service_role; select count(*) from warroom_job_claim(3)")" 0
$P -c "set role service_role; select warroom_job_finish($J, false, null, 'boom')" >/dev/null
ok "failure requeues with backoff" "$($P -c "select status || (run_after > now() + interval '9 minutes') from warroom_job where id=$J")" queuedtrue
$P -c "update warroom_job set run_after = now() where id=$J; set role service_role; select count(*) from warroom_job_claim(3); select warroom_job_finish($J, true, '{\"summary\":\"fine\",\"ai_calls\":2}', null)" >/dev/null
ok "success" "$($P -c "select status from warroom_job where id=$J")" done
ok "ai use counted" "$($P -c "set role service_role; select warroom_ai_used('$A')")" 2
$P -c "set role service_role; select warroom_note('$A','sj1','Title','Body')" >/dev/null
ok "note lands in the inbox, rest of the data intact" "$(q "$D1" "select (data->'inbox'->'sj1'->>'title') || (data ? 'days') || (data->>'t') from warroom_sync where id='$A'")" Titletrue2
ok "backup copies the room's rows" "$($P -c "set role service_role; select warroom_backup_run('$A')")" 3
ok "backup md5 matches" "$($P -c "select bool_and(md5 = md5(data::text)) from warroom_backup")" t
# 7. Schedules through the tick
$P -c "update warroom_schedule set hour=0, minute=0 where room='$A'; select warroom_tick(); select warroom_tick()" >/dev/null
ok "tick queues a due schedule once" "$($P -c "select count(*) from warroom_job where kind='brief' and by='schedule'")" 1
$P -c "update warroom_job set status='running', started_at = now() - interval '20 minutes', attempts=1 where kind='brief'; select warroom_tick()" >/dev/null
ok "tick rescues a stuck job" "$($P -c "select status from warroom_job where kind='brief'")" queued
# 8. Revoke
has "other room cannot revoke" "$(q "$DB" "select warroom_device_revoke((select id from warroom_device where name='Laptop'))" 2>&1)" "No such active device\|permission denied"
ID2=$($P -c "select id from warroom_device where name='Laptop'")
has "revoke" "$(q "$D1" "select warroom_device_revoke('$ID2')")" '"ok": true'
ok "revoked token reads nothing" "$(q "$D2" "select count(*) from warroom_sync")" 0
has "revoked token cannot call" "$(q "$D2" "select warroom_server_status()")" "Not authorised"
# 9. The lock
has "key alone cannot lock" "$(q "$K" "select warroom_lock(true)")" "Only an enrolled device"
has "device locks" "$(q "$D1" "select warroom_lock(true)")" '"locked": true'
ok "locked: key alone reads nothing" "$(q "$K" "select count(*) from warroom_sync")" 0
ok "locked: key alone writes nothing" "$(q "$K" "update warroom_sync set data='{}' where id='$A' returning 1")" ""
ok "locked: queue key alone reads nothing" "$(q "{\"x-warroom-key\":\"$A:queue\"}" "select count(*) from warroom_sync")" 0
ok "locked: device still reads" "$(q "$D1" "select count(*) from warroom_sync")" 4
ok "locked: device + key together still read" "$(q "{\"x-warroom-key\":\"$A\",\"x-warroom-device\":\"$T1\"}" "select count(*) from warroom_sync where id='$A'")" 1
ok "locked: device still writes" "$(q "$D1" "update warroom_sync set data = data || '{\"t\":3}' where id='$A' returning 1")" 1
has "locked: key cannot enrol a new device" "$(q "$K" "select warroom_device_enrol('Thief')")" "locked"
has "locked: key cannot call RPCs" "$(q "$K" "select warroom_jobs(5)")" "Not authorised"
ok "locked: other room untouched" "$(q "$KB" "select count(*) from warroom_sync")" 1
ok "locked: other room's device cannot unlock" "$(q "$DB" "select warroom_lock(false)" >/dev/null; $P -c "select count(*) from warroom_room where room='$A' and locked")" 1
ok "locked: worker still writes the note" "$($P -c "set role service_role; select warroom_note('$A','sj2','T2','B'); select data->'inbox'->'sj2'->>'title' from warroom_sync where id='$A'" | tail -1)" T2
has "device unlocks" "$(q "$D1" "select warroom_lock(false)")" '"locked": false'
ok "unlocked: key reads again" "$(q "$K" "select count(*) from warroom_sync")" 1
# 10. Audit
has "audit shows the lock" "$(q "$D1" "select warroom_audit_list(50)")" "key-only access locked"
has "audit shows writes by device name" "$(q "$D1" "select warroom_audit_list(50)")" "data written"
ok "audit is per room" "$(q "$DB" "select count(*) from jsonb_array_elements(warroom_audit_list(50)->'audit') e where e->>'action' = 'key-only access locked'")" 0
ok "a write is never blocked by the audit" "$($P -c "drop table warroom_audit cascade" >/dev/null 2>&1; q "$K" "update warroom_sync set data = data || '{\"t\":9}' where id='$A' returning 1")" 1
echo "$pass passed, $fail failed"
