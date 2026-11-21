/** TEMPORARY diagnostic (preview deployments only): list Gemini models and transcribe a known clip. */
import { transcribeAudio, transcribeModel } from "@/lib/server/transcribe";
import { WEBM_B64 } from "./audio";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (process.env.VERCEL_ENV === "production" || u.searchParams.get("t") !== "8f1c2a9e7d3b4c6a") return new Response("not found", { status: 404 });
  const out: Record<string, unknown> = { default: transcribeModel() };
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" } });
    const j = (await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    out.models = (j.models ?? []).filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name.replace("models/", ""));
  } catch (e) { out.models = String(e); }
  const audio = Buffer.from(WEBM_B64, "base64");
  const tries = (u.searchParams.get("m") ?? transcribeModel()).split(",");
  out.results = [];
  for (const m of tries) {
    try { (out.results as unknown[]).push(await transcribeAudio(audio, "audio/webm;codecs=opus", m)); }
    catch (e) { (out.results as unknown[]).push({ model: m, error: e instanceof Error ? e.message : String(e) }); }
  }
  return Response.json(out);
}
