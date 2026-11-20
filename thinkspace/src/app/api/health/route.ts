import { config } from "@/lib/config";
import { authMode } from "@/lib/auth";
import { getDbKind } from "@/lib/db/client";
import { createLlmProvider } from "@/lib/providers/llm";
import { createImageProvider } from "@/lib/providers/image";
import { handle } from "@/lib/server/http";
import type { HealthResponse } from "@/lib/contracts/api";

export const runtime = "nodejs";

export async function GET(req?: Request) {
  return handle(async () => {
    // TEMPORARY diagnostics: ?probe=<sessionId> times the snapshot/event queries (counts only, no content).
    const probe = req && new URL(req.url).searchParams.get("probe");
    if (probe) {
      const { getDb, schema } = await import("@/lib/db/client");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      const tables = {
        sessions: schema.sessions, segments: schema.transcriptSegments, thoughts: schema.thoughts,
        concepts: schema.concepts, relations: schema.relations, models: schema.systemModels,
        versions: schema.modelVersions, changes: schema.changeEvents, scenes: schema.scenes,
        actions: schema.actionItems, events: schema.events,
      } as const;
      const out: Record<string, string> = {};
      for (const [name, t] of Object.entries(tables)) {
        const t0 = Date.now();
        const col = name === "sessions" ? (t as typeof schema.sessions).id : (t as typeof schema.thoughts).sessionId;
        const r = await Promise.race([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (db as any).select().from(t).where(eq(col, probe)).then((rows: unknown[]) => `ok ${rows.length}`, (e: Error) => `err ${e.message.slice(0, 120)}`),
          new Promise<string>((res) => setTimeout(() => res("timeout"), 4000)),
        ]);
        out[name] = `${r} ${Date.now() - t0}ms`;
        if (r === "timeout") break;
      }
      return Response.json(out, { headers: { "cache-control": "no-store" } });
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
