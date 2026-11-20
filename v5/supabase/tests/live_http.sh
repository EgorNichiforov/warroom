#!/bin/bash
# Real HTTP proof against the LIVE project with a throwaway room. Prints results only, never keys.
# AFTER EVERY RUN, AT ONCE: rename the throwaway row so no scheduled task can mistake it for the real one:
#   update public.warroom_sync set id = 'staging-' || id, updated_at = '2000-01-01' where id like 'verify%' and id not like '%:%';
# (the scheduled tasks pick the newest row that has days in it; a fresh room is exactly that until it is renamed)
U=https://lajechvmsrmrmfcluhkr.supabase.co
K=$(grep -o "sb_publishable_[A-Za-z0-9_-]*" /home/claude/warroom/v5/core.js | head -1)
R="verify$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"
echo "$R" > /tmp/live_room.txt
H=(-s -m 30 -H "apikey: $K" -H "Authorization: Bearer $K" -H "Content-Type: application/json")
code() { curl "${H[@]}" -o /tmp/lh.out -w "%{http_code}" "$@"; }
say() { echo "$1: $2"; }
say "1 create room by key (expect 201)" "$(code -X POST "$U/rest/v1/warroom_sync" -H "x-warroom-key: $R" -H "Prefer: return=minimal" -d "{\"id\":\"$R\",\"data\":{\"days\":{},\"sources\":{},\"inbox\":{},\"tasks\":{},\"goals\":{}}}")"
say "2 key reads its row (expect 1)" "$(curl "${H[@]}" -H "x-warroom-key: $R" "$U/rest/v1/warroom_sync?select=id" | grep -o '"id"' | wc -l)"
say "3 no header reads (expect 0)" "$(curl "${H[@]}" "$U/rest/v1/warroom_sync?select=id" | grep -o '"id"' | wc -l)"
T=$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_device_enrol" -H "x-warroom-key: $R" -d '{"p_name":"curl verify"}' | grep -o '"token": *"[a-f0-9]*"' | grep -o '[a-f0-9]\{64\}')
say "4 enrol over HTTP returns a 64-hex token" "${#T}"
say "5 device header alone reads the room (expect 1)" "$(curl "${H[@]}" -H "x-warroom-device: $T" "$U/rest/v1/warroom_sync?select=id" | grep -o '"id"' | wc -l)"
say "6 wrong device token reads (expect 0)" "$(curl "${H[@]}" -H "x-warroom-device: ${T:0:63}0" "$U/rest/v1/warroom_sync?select=id" | grep -o '"id"' | wc -l)"
say "7 device writes its row (expect 204)" "$(code -X PATCH "$U/rest/v1/warroom_sync?id=eq.$R" -H "x-warroom-device: $T" -H "Prefer: return=minimal" -d '{"updated_at":"2000-01-01T00:00:00Z"}')"
say "8 status by device" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_server_status" -H "x-warroom-device: $T" -d '{}' | grep -o '"ok": *true\|"devices": *[0-9]*\|"ai_key": *[a-z]*' | tr '\n' ' ')"
say "9 queue backup + brief (no AI) over HTTP" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_enqueue" -H "x-warroom-device: $T" -d '{"p_kind":"backup","p_payload":{},"p_idem":null}' | grep -o '"ok": *true') $(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_enqueue" -H "x-warroom-device: $T" -d '{"p_kind":"brief","p_payload":{"ai":false},"p_idem":null}' | grep -o '"ok": *true')"
say "10 unknown kind refused" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_enqueue" -H "x-warroom-device: $T" -d '{"p_kind":"drop","p_payload":{},"p_idem":null}' | grep -o 'Unknown kind of job')"
sleep 25
say "11 jobs after 25 s" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_jobs" -H "x-warroom-device: $T" -d '{"p_limit":5}' | grep -o '"kind": *"[a-z]*"\|"status": *"[a-z]*"\|"summary": *"[^"]*"' | tr '\n' ' ')"
say "12 the brief note arrived in the room" "$(curl "${H[@]}" -H "x-warroom-device: $T" "$U/rest/v1/warroom_sync?select=data&id=eq.$R" | grep -o 'Morning brief[^"]*\|Last 7 days: [0-9]* dials' | head -2 | tr '\n' '|')"
say "13 key alone cannot lock" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_lock" -H "x-warroom-key: $R" -d '{"p_on":true}' | grep -o 'Only an enrolled device')"
say "14 device locks" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_lock" -H "x-warroom-device: $T" -d '{"p_on":true}' | grep -o '"locked": *true')"
say "15 locked: key alone reads (expect 0)" "$(curl "${H[@]}" -H "x-warroom-key: $R" "$U/rest/v1/warroom_sync?select=id" | grep -o '"id"' | wc -l)"
say "16 locked: key alone write (expect 0 rows)" "$(curl "${H[@]}" -X PATCH "$U/rest/v1/warroom_sync?id=eq.$R" -H "x-warroom-key: $R" -H "Prefer: return=representation" -d '{"updated_at":"2000-01-01T00:00:00Z"}' | grep -o '"id"' | wc -l)"
say "17 locked: device reads (expect 1)" "$(curl "${H[@]}" -H "x-warroom-device: $T" "$U/rest/v1/warroom_sync?select=id" | grep -o '"id"' | wc -l)"
say "18 locked: key cannot enrol" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_device_enrol" -H "x-warroom-key: $R" -d '{"p_name":"thief"}' | grep -o 'locked' | head -1)"
say "19 device unlocks" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_lock" -H "x-warroom-device: $T" -d '{"p_on":false}' | grep -o '"locked": *false')"
say "20 unlocked: key reads again (expect 1)" "$(curl "${H[@]}" -H "x-warroom-key: $R" "$U/rest/v1/warroom_sync?select=id" | grep -o '"id"' | wc -l)"
say "21 audit over HTTP" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_audit_list" -H "x-warroom-device: $T" -d '{"p_limit":20}' | grep -o '"action": *"[^"]*"' | sort | uniq -c | tr '\n' ';')"
DID=$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_devices" -H "x-warroom-device: $T" -d '{}' | grep -o '"id": *"[a-f0-9-]*"' | head -1 | grep -o '[a-f0-9-]\{36\}')
say "22 revoke own device" "$(curl "${H[@]}" -X POST "$U/rest/v1/rpc/warroom_device_revoke" -H "x-warroom-device: $T" -d "{\"p_id\":\"$DID\"}" | grep -o '"ok": *true')"
say "23 revoked device reads (expect 0)" "$(curl "${H[@]}" -H "x-warroom-device: $T" "$U/rest/v1/warroom_sync?select=id" | grep -o '"id"' | wc -l)"
say "24 worker with no secret (expect 401)" "$(curl -s -m 20 -o /dev/null -w '%{http_code}' -X POST "$U/functions/v1/warroom-worker" -d '{}')"
