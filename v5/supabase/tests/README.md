# Server migration: local proof

`run.sh` rebuilds a stand-in for the live Supabase project (same roles, same three tables, the same `warroom_key()`
and the same three key policies) in a throwaway Postgres 16, applies `../warroom_server_v1.sql` and
`../warroom_server_v1_policies_cron.sql`, and checks every way in: key only, device token, another room's token,
a revoked token, the lock, the worker's functions, schedules and the audit trail.

    initdb -D /tmp/wrpg -A trust -U postgres && pg_ctl -D /tmp/wrpg -o '-p 5544 -c unix_socket_directories=/tmp' -w start
    ./run.sh

`pg_net` and `pg_cron` are replaced by small stand-ins (a table that records the call). So this proves the SQL,
the permissions and the queue logic. It does not prove the live cron or the live HTTP call to the worker.
