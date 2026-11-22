import { getSnapshot } from "@/lib/db/repo";
import { handle, jsonError, notFound, requireSession, type IdCtx } from "@/lib/server/http";
import { exportFilename, snapshotToMarkdown } from "@/lib/server/export";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireSession(req, id);
    const format = new URL(req.url).searchParams.get("format") ?? "json";
    if (format !== "json" && format !== "md") return jsonError(400, "format must be json or md", "validation_error");
    const snapshot = await getSnapshot(id);
    if (!snapshot) return notFound("session not found");
    const filename = exportFilename(snapshot.session, format);
    const headers = {
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    };
    if (format === "md") {
      return new Response(snapshotToMarkdown(snapshot), { headers: { ...headers, "content-type": "text/markdown; charset=utf-8" } });
    }
    return new Response(JSON.stringify(snapshot, null, 2), { headers: { ...headers, "content-type": "application/json; charset=utf-8" } });
  });
}
