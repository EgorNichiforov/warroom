import { UpdateSegmentBody } from "@/lib/contracts/api";
import { updateSegment } from "@/lib/db/repo";
import { handle, notFound, parseBody, requireSession, type IdSegCtx } from "@/lib/server/http";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: IdSegCtx) {
  return handle(async () => {
    const { id, segId } = await ctx.params;
    await requireSession(req, id);
    const body = await parseBody(req, UpdateSegmentBody);
    const out = await updateSegment(id, segId, body);
    if (!out) return notFound("segment not found");
    return Response.json(out);
  });
}
