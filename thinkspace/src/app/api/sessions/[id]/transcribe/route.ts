/**
 * POST /api/sessions/:id/transcribe — body: one recorded utterance (audio/webm, audio/mp4, ...).
 * Returns {text, language}. The client then saves the text as a transcript segment.
 */
import { logUsage } from "@/lib/db/repo";
import { handle, jsonError, requireSession, type IdCtx } from "@/lib/server/http";
import { TranscribeError, transcribeWithFallback } from "@/lib/server/transcribe";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request, ctx: IdCtx) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireSession(req, id);
    const mime = req.headers.get("content-type") || "audio/webm";
    if (!mime.startsWith("audio/") && !mime.startsWith("video/")) return jsonError(415, "Expected an audio body", "bad_media_type");
    const audio = new Uint8Array(await req.arrayBuffer());
    if (audio.byteLength === 0) return jsonError(400, "Empty audio", "empty_audio");
    if (audio.byteLength > MAX_BYTES) return jsonError(413, "Audio clip too large", "too_large");
    try {
      const r = await transcribeWithFallback(audio, mime.startsWith("video/") ? mime.replace("video/", "audio/") : mime);
      void logUsage({ sessionId: id, provider: "gemini", model: r.model, kind: "transcribe", durationMs: r.ms }).catch(() => undefined);
      return Response.json({ text: r.text, language: r.language, ms: r.ms });
    } catch (e) {
      if (e instanceof TranscribeError) return jsonError(e.status, e.message, e.status === 501 ? "not_configured" : "transcribe_failed");
      throw e;
    }
  });
}
