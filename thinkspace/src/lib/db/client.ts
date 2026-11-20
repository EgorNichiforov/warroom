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

function migrationsFolder() {
  return path.join(process.cwd(), "drizzle");
}

function create(): Holder {
  if (config.databaseUrl) {
    const sql = postgres(config.databaseUrl, { max: 5, prepare: false });
    const db = drizzlePg(sql, { schema });
    const ready = migratePg(db, { migrationsFolder: migrationsFolder() });
    return { db, kind: "postgres", ready, close: () => sql.end() };
  }
  const dir = config.pgliteDir === ":memory:" ? undefined : path.resolve(/*turbopackIgnore: true*/ process.cwd(), config.pgliteDir);
  if (dir) fs.mkdirSync(dir, { recursive: true }); // PGlite does not create a missing data directory
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  const ready = migratePglite(db, { migrationsFolder: migrationsFolder() });
  return { db, kind: "pglite", ready, close: () => client.close() };
}

export async function getDb(): Promise<Db> {
  if (!g.__thinkspaceDb) g.__thinkspaceDb = create();
  await g.__thinkspaceDb.ready;
  return g.__thinkspaceDb.db;
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
