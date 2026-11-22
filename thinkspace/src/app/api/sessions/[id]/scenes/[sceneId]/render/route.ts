import { getScene } from "@/lib/db/repo";
import { handle, notFound, requireSession, type IdSceneCtx } from "@/lib/server/http";
import { renderScene } from "@/lib/server/render";
import { ndjsonStream } from "@/lib/server/stream";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: IdSceneCtx) {
  return handle(async () => {
    const { id, sceneId } = await ctx.params;
    await requireSession(req, id);
    if (!(await getScene(id, sceneId))) return notFound("scene not found");
    return ndjsonStream((emit) => renderScene(id, sceneId, emit, { signal: req.signal }));
  });
}
