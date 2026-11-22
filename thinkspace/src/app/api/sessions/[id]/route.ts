import { UpdateSessionBody } from "@/lib/contracts/api";
import { getDb } from "@/lib/db/client";
import { currentAtMs, deleteSession, emitEvents, updateSession, withTx } from "@/lib/db/repo";
import { nowIso } from "@/lib/ids";
import { handle, parseBody, requireSession, type IdCtx } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { session } = await requireSession(req, id);
    return Response.json({ session });
  });
}

export async function PATCH(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { session: before } = await requireSession(req, id);
    const body = await parseBody(req, UpdateSessionBody);
    const db = await getDb();
    // Ending stamps endedAt (kept if already set); re-activating or pausing clears it.
    const endedAt = body.status === undefined ? undefined : body.status === "ended" ? (before.endedAt ?? nowIso()) : null;
    const out = await withTx(db, async (tx) => {
      const session = await updateSession(id, { ...body, endedAt }, tx);
      if (!session) return null;
      const atMs = await currentAtMs(tx, id);
      const events = await emitEvents(tx, id, [{ type: "session.updated", sessionId: id, atMs, payload: session }]);
      return { session, events };
    });
    if (!out) return Response.json({ error: "session not found", code: "not_found" }, { status: 404 });
    return Response.json(out);
  });
}

export async function DELETE(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireSession(req, id);
    await deleteSession(id);
    return new Response(null, { status: 204 });
  });
}
