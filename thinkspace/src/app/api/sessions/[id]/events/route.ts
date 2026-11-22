import { listEvents } from "@/lib/db/repo";
import { handle, requireSession, type IdCtx } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireSession(req, id);
    const raw = Number(new URL(req.url).searchParams.get("since") ?? 0);
    const since = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    const events = await listEvents(id, since);
    return Response.json({ events }, { headers: { "cache-control": "no-store" } });
  });
}
