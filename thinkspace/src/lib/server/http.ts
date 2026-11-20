/**
 * Small helpers shared by every API route: JSON errors, zod body validation and a wrapper that
 * turns thrown Responses / RepoError / ZodError into `{error, code}` JSON.
 */
import "server-only";
import { z } from "zod";
import { RepoError } from "@/lib/db/repo";
import { ensureStartup } from "@/lib/server/retention";

export function jsonError(status: number, error: string, code: string, details?: unknown): Response {
  return Response.json(details === undefined ? { error, code } : { error, code, details }, { status });
}

export const notFound = (what = "not found") => jsonError(404, what, "not_found");

/** Parse and validate a JSON body; throws a 400 Response on failure. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw jsonError(400, "invalid JSON body", "bad_json");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw jsonError(400, "invalid request body", "validation_error", z.treeifyError(parsed.error));
  }
  return parsed.data;
}

/**
 * Wrap a route handler body. Runs startup tasks (migrations, retention) first and maps errors.
 * Usage: `export const GET = (req, ctx) => handle(async () => { ... })`.
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    await ensureStartup();
    return await fn();
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof RepoError) return jsonError(err.status, err.message, err.code);
    if (err instanceof z.ZodError) return jsonError(400, "validation error", "validation_error", z.treeifyError(err));
    const message = err instanceof Error ? err.message : String(err);
    console.error("[thinkspace/api]", err);
    const dbDown = /ECONNREFUSED|database|connect|PGlite/i.test(message);
    return jsonError(dbDown ? 503 : 500, dbDown ? "database unavailable: " + message : message, dbDown ? "db_unavailable" : "internal_error");
  }
}

export type IdCtx = { params: Promise<{ id: string }> };
export type IdSegCtx = { params: Promise<{ id: string; segId: string }> };
export type IdSceneCtx = { params: Promise<{ id: string; sceneId: string }> };
export type IdActionCtx = { params: Promise<{ id: string; actionId: string }> };
export type IdThoughtCtx = { params: Promise<{ id: string; thoughtId: string }> };
export type AssetCtx = { params: Promise<{ assetId: string }> };
