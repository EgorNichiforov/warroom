/** TEMPORARY diagnostic (preview deployments only): exercise the real providers with fixed inputs. */
import { transcribeWithFallback } from "@/lib/server/transcribe";
import { createConfiguredLlmProvider } from "@/lib/server/ingest";
import { createImageProvider } from "@/lib/providers/image";
import { config } from "@/lib/config";
import { WEBM_B64, WEBM2_B64 } from "./audio";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (process.env.VERCEL_ENV === "production" || u.searchParams.get("t") !== "8f1c2a9e7d3b4c6a") return new Response("not found", { status: 404 });
  const x = u.searchParams.get("x") ?? "stt";
  const t0 = Date.now();
  try {
    if (x === "stt") {
      const a = await transcribeWithFallback(Buffer.from(WEBM_B64, "base64"), "audio/webm;codecs=opus");
      const b = await transcribeWithFallback(Buffer.from(WEBM2_B64, "base64"), "audio/webm;codecs=opus");
      return Response.json({ x, clip1: a, clip2: b, ms: Date.now() - t0 });
    }
    if (x === "llm") {
      const llm = createConfiguredLlmProvider();
      const digest = { sessionTitle: "Test", focus: "", concepts: [], relations: [], models: [], recentThoughts: [], openQuestions: [], scenes: [], recentSegments: [] };
      const r = await llm.extract(digest, [{ id: "seg_test1", text: "Deci, mă gândesc la un sistem în care avem trei departamente. But I think research should be connected directly to the central intelligence.", startedMs: 0, endedMs: 5000 }]);
      const e = r.extraction;
      return Response.json({ x, provider: llm.name, model: llm.model, ms: Date.now() - t0, usage: r.usage, thoughts: e.thoughts.map((t) => `${t.type}/${t.provenance}: ${t.text}`), concepts: e.concepts.map((c) => c.label), relations: e.relations.length, changes: e.changes.map((c) => c.kind + " " + (c.newModelName ?? c.modelId)), scenes: e.sceneDirectives.map((s) => s.kind + ": " + s.title), langs: e.segmentAnnotations.map((a) => a.language) });
    }
    if (x === "img") {
      const p = createImageProvider({ provider: config.image.provider, model: config.image.model }, process.env.GEMINI_API_KEY);
      const r = await p.generate("A clean organisational diagram-like illustration: three departments connected to a central intelligence hub, calm blue palette, no text", { aspect: "16:9" });
      return Response.json({ x, provider: p.name, real: p.real, model: p.model, mime: r.image.mime, bytes: r.image.bytes.byteLength, ms: Date.now() - t0 });
    }
    return Response.json({ error: "unknown x" });
  } catch (e) {
    return Response.json({ x, error: e instanceof Error ? e.message.slice(0, 800) : String(e), ms: Date.now() - t0 });
  }
}
