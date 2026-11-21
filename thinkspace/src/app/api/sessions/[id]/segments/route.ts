import { AppendSegmentsBody } from "@/lib/contracts/api";
import { appendSegments } from "@/lib/db/repo";
import { handle, parseBody, requireSession, type IdCtx } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireSession(req, id);
    const body = await parseBody(req, AppendSegmentsBody);
    const out = await appendSegments(
      id,
      body.segments.map((s) => ({ ...s, language: s.language ?? "unknown", confidence: s.confidence ?? null })),
    );
    return Response.json(out);
  });
}
