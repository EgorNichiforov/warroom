import { handle, requireSession, type IdCtx } from "@/lib/server/http";
import { runSummary } from "@/lib/server/summary";
import { ndjsonStream } from "@/lib/server/stream";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireSession(req, id);
    return ndjsonStream((emit) => runSummary(id, emit, { signal: req.signal }));
  });
}
