import { UpdateActionBody } from "@/lib/contracts/api";
import { updateAction } from "@/lib/db/repo";
import { handle, notFound, parseBody, requireSession, type IdActionCtx } from "@/lib/server/http";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: IdActionCtx) {
  return handle(async () => {
    const { id, actionId } = await ctx.params;
    await requireSession(req, id);
    const body = await parseBody(req, UpdateActionBody);
    const out = await updateAction(id, actionId, body);
    if (!out) return notFound("action not found");
    return Response.json(out);
  });
}
