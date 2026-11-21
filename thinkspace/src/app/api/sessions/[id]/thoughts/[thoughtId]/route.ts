import { UpdateThoughtBody } from "@/lib/contracts/api";
import { updateThought } from "@/lib/db/repo";
import { handle, notFound, parseBody, requireSession, type IdThoughtCtx } from "@/lib/server/http";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: IdThoughtCtx) {
  return handle(async () => {
    const { id, thoughtId } = await ctx.params;
    await requireSession(req, id);
    const body = await parseBody(req, UpdateThoughtBody);
    const out = await updateThought(id, thoughtId, body);
    if (!out) return notFound("thought not found");
    return Response.json(out);
  });
}
