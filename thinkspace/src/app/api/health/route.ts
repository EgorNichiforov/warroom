import { config } from "@/lib/config";
import { authMode } from "@/lib/auth";
import { getDbKind } from "@/lib/db/client";
import { createLlmProvider } from "@/lib/providers/llm";
import { createImageProvider } from "@/lib/providers/image";
import { handle } from "@/lib/server/http";
import type { HealthResponse } from "@/lib/contracts/api";
import { getSnapshot, listEvents, listSessions } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET(req?: Request) {
  return handle(async () => {
    // TEMPORARY (preview only): ?probe=<sessionId> runs the session page's queries in parallel.
    const probe = req && new URL(req.url).searchParams.get("probe");
    if (probe) {
      const t0 = Date.now();
      const timeout = new Promise<string>((r) => setTimeout(() => r("timeout"), 12000));
      const work = Promise.all([getSnapshot(probe), listEvents(probe, 0), listSessions("owner"), getSnapshot(probe)]).then(
        ([s, e, l]) => `ok segs=${s?.segments.length} ev=${e.length} sessions=${l.length}`,
        (err: Error) => `err ${err.message.slice(0, 160)}`,
      );
      const r = await Promise.race([work, timeout]);
      return Response.json({ result: r, ms: Date.now() - t0 }, { headers: { "cache-control": "no-store" } });
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
