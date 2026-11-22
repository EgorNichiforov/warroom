/**
 * Database client. PGlite (embedded Postgres) when DATABASE_URL is empty, postgres-js otherwise.
 * One instance per process; migrations run on first access.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";
import { config } from "@/lib/config";

export type Db = PgliteDatabase<typeof schema> | PostgresJsDatabase<typeof schema>;
export type DbKind = "pglite" | "postgres";

type Holder = { db: Db; kind: DbKind; ready: Promise<void>; close: () => Promise<void> };

const g = globalThis as unknown as { __thinkspaceDb?: Holder };

/** All tables and the migrations ledger live in the "thinkspace" schema (see schema.ts). */
const MIGRATIONS_SCHEMA = "thinkspace";

/**
 * DATABASE_URL may carry the literal placeholder __PASSWORD__; it is replaced with
 * DATABASE_PASSWORD so the password can be managed as its own secret.
 */
export function resolveDatabaseUrl(url: string): string {
  if (!url.includes("__PASSWORD__")) return url;
  const pw = process.env.DATABASE_PASSWORD ?? "";
  if (!pw) throw new Error("DATABASE_URL contains __PASSWORD__ but DATABASE_PASSWORD is not set");
  return url.replace("__PASSWORD__", encodeURIComponent(pw));
}

/** True when every migration in drizzle/meta/_journal.json is already recorded in the ledger. */
async function migrationsUpToDate(sql: ReturnType<typeof postgres>): Promise<boolean> {
  try {
    const journal = JSON.parse(fs.readFileSync(path.join(migrationsFolder(), "meta", "_journal.json"), "utf8")) as { entries: unknown[] };
    const rows = await sql.unsafe(`select count(*)::int as n from "${MIGRATIONS_SCHEMA}"."__drizzle_migrations"`);
    return Number(rows[0]?.n ?? 0) >= journal.entries.length;
  } catch {
    return false; // ledger missing or unreadable: run the migrator
  }
}

function migrationsFolder() {
  return path.join(process.cwd(), "drizzle");
}

function create(): Holder {
  if (config.databaseUrl) {
    // Serverless instances share Supabase's pooler: one connection per instance avoids
    // stalls when several queries run in parallel (they simply queue on the one connection).
    const poolMax = Number(process.env.THINKSPACE_DB_POOL) || (process.env.VERCEL ? 1 : 5);
    const sql = postgres(resolveDatabaseUrl(config.databaseUrl), {
      max: poolMax,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    const db = drizzlePg(sql, { schema });
    // Run DDL only when the ledger is behind: concurrent serverless cold starts each re-running
    // CREATE SCHEMA/TABLE IF NOT EXISTS block one another on Supabase's pooler.
    const ready = (async () => {
      if (await migrationsUpToDate(sql)) return;
      await migratePg(db, { migrationsFolder: migrationsFolder(), migrationsSchema: MIGRATIONS_SCHEMA });
    })();
    return { db, kind: "postgres", ready, close: () => sql.end() };
  }
  const dir = config.pgliteDir === ":memory:" ? undefined : path.resolve(/*turbopackIgnore: true*/ process.cwd(), config.pgliteDir);
  if (dir) fs.mkdirSync(dir, { recursive: true }); // PGlite does not create a missing data directory
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  const ready = migratePglite(db, { migrationsFolder: migrationsFolder(), migrationsSchema: MIGRATIONS_SCHEMA });
  return { db, kind: "pglite", ready, close: () => client.close() };
}

export async function getDb(): Promise<Db> {
  if (!g.__thinkspaceDb) {
    const holder = create();
    // A failed startup (connection or migration) must not be cached for the life of the process.
    holder.ready = holder.ready.catch(async (err) => {
      if (g.__thinkspaceDb === holder) g.__thinkspaceDb = undefined;
      await holder.close().catch(() => undefined);
      throw err;
    });
    g.__thinkspaceDb = holder;
  }
  const holder = g.__thinkspaceDb;
  await holder.ready;
  return holder.db;
}

export function getDbKind(): DbKind {
  return config.databaseUrl ? "postgres" : "pglite";
}

export async function closeDb() {
  if (g.__thinkspaceDb) {
    await g.__thinkspaceDb.close();
    g.__thinkspaceDb = undefined;
  }
}

export { schema };
