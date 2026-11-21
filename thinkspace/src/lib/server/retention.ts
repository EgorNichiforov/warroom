/**
 * Process startup tasks, run once (per process) on the first API call:
 *  - open the database (which runs migrations)
 *  - apply the retention policy: delete sessions not updated for THINKSPACE_RETENTION_DAYS days.
 */
import "server-only";
import { getDb } from "@/lib/db/client";
import { deleteSessionsOlderThan } from "@/lib/db/repo";
import { config } from "@/lib/config";

const g = globalThis as unknown as { __thinkspaceStartup?: Promise<void> };

export function ensureStartup(): Promise<void> {
  if (!g.__thinkspaceStartup) {
    g.__thinkspaceStartup = (async () => {
      await getDb();
      await applyRetention();
    })().catch((err) => {
      // allow a retry on the next request instead of caching a failed startup forever
      g.__thinkspaceStartup = undefined;
      throw err;
    });
  }
  return g.__thinkspaceStartup;
}

export async function applyRetention(): Promise<number> {
  const days = config.retention.sessionDays;
  if (!(days > 0)) return 0;
  const n = await deleteSessionsOlderThan(days);
  if (n > 0) console.info(`[thinkspace/retention] deleted ${n} session(s) older than ${days} day(s)`);
  return n;
}
