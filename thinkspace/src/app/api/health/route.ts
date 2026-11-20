import { config } from "@/lib/config";
import { authMode } from "@/lib/auth";
import { getDbKind } from "@/lib/db/client";
import { createLlmProvider } from "@/lib/providers/llm";
import { createImageProvider } from "@/lib/providers/image";
import { handle } from "@/lib/server/http";
import type { HealthResponse } from "@/lib/contracts/api";
import { getSnapshot, listEvents } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return handle(async () => {
    // TEMPORARY diagnostics: ?probe=<sessionId> times the snapshot/event queries (counts only, no content).
    const probe = new URL(req.url).searchParams.get("probe");
    if (probe) {
      const t0 = Date.now();
      const snap = await Promise.race([getSnapshot(probe), new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 15000))]);
      const t1 = Date.now();
      const ev = snap === "timeout" ? "skipped" : await Promise.race([listEvents(probe, 0).then((e) => e.length), new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 15000))]);
      return Response.json({ snapshotMs: t1 - t0, snapshot: snap === "timeout" ? "timeout" : snap ? { segments: snap.segments.length, thoughts: snap.thoughts.length } : null, events: ev, eventsMs: Date.now() - t1 }, { headers: { "cache-control": "no-store" } });
    }
    const llm = createLlmProvider({
      provider: config.llm.provider,
      model: config.llm.model,
      summaryModel: config.llm.summaryModel,
      liveEffort: config.llm.liveEffort,
      summaryEffort: config.llm.summaryEffort,
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    const image = createImageProvider({ provider: config.image.provider, model: config.image.model }, process.env.GEMINI_API_KEY);
    const available = ["browser", "mock"];
    if (config.speech.sonioxKey) available.push("soniox");
    if (config.speech.deepgramKey) available.push("deepgram");
    const def = available.includes(config.speech.defaultProvider) ? config.speech.defaultProvider : "browser";
    const body: HealthResponse = {
      ok: true,
      db: getDbKind(),
      providers: {
        llm: { name: llm.name, real: llm.real, model: llm.model },
        image: { name: image.name, real: image.real, model: image.model },
        speech: { default: def, available },
      },
      auth: authMode(),
      version: config.appVersion,
    };
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  });
}
