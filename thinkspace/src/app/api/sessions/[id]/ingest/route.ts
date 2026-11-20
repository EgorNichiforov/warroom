import { IngestBody } from "@/lib/contracts/api";
import { handle, parseBody, requireSession, type IdCtx } from "@/lib/server/http";
import { runIngest } from "@/lib/server/ingest";
import { ndjsonStream } from "@/lib/server/stream";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireSession(req, id);
    const body = await parseBody(req, IngestBody);
    return ndjsonStream((emit) => runIngest(id, body.segmentIds, emit, { signal: req.signal }));
  });
}
