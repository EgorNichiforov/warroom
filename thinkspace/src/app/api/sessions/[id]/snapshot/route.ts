import { getSnapshot } from "@/lib/db/repo";
import { handle, notFound, requireSession, type IdCtx } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireSession(req, id);
    const snapshot = await getSnapshot(id);
    if (!snapshot) return notFound("session not found");
    return Response.json(snapshot, { headers: { "cache-control": "no-store" } });
  });
}
