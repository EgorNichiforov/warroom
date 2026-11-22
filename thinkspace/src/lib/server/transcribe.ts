/**
 * Server-side transcription of a short audio clip with Google Gemini (multimodal).
 * Used by the "cloud" speech provider: the browser records an utterance (cut at a pause),
 * posts it here, and gets back the verbatim text in the language(s) actually spoken.
 */
import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Language } from "@/lib/contracts/domain";

export const TRANSCRIBE_PROMPT = `Transcribe this audio exactly as spoken.
The speaker thinks out loud and mixes Romanian and English, often inside one sentence.
Rules:
- Write every word in the language it was spoken. Never translate.
- Use correct Romanian diacritics (ă, â, î, ș, ț).
- Keep hesitations out, but keep self-corrections ("no, I mean...").
- Add normal punctuation.
- If there is no intelligible speech, return an empty text.
Reply with JSON only: {"text": "...", "language": "ro" | "en" | "mixed" | "unknown"}.`;

export type TranscribeResult = { text: string; language: Language; model: string; ms: number };

export class TranscribeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function transcribeModel() {
  return process.env.THINKSPACE_TRANSCRIBE_MODEL?.trim() || "gemini-3.5-flash";
}

/** Faster model used when the primary one fails (outage, quota, retired model). */
export function transcribeFallbackModel() {
  return process.env.THINKSPACE_TRANSCRIBE_FALLBACK_MODEL?.trim() || "gemini-3.5-flash-lite";
}

/**
 * Accurate model first; if it has not answered after HEDGE_MS (or fails), the fast model runs in
 * parallel and the first good answer wins. Keeps phrases appearing within a few seconds.
 */
const HEDGE_MS = 4000;
export async function transcribeWithFallback(audio: Uint8Array, mimeType: string): Promise<TranscribeResult> {
  if (process.env.MOCK_TRANSCRIBE === "1") {
    // test hook (local/e2e only): proves audio arrived without calling Gemini
    return { text: `Test transcript of ${Math.round(audio.byteLength / 1024)} KB of ${mimeType.split(";")[0]} audio.`, language: "en", model: "mock", ms: 1 };
  }
  const primary = transcribeAudio(audio, mimeType, transcribeModel(), 15_000);
  let startFast: () => void = () => undefined;
  const fastGate = new Promise<void>((r) => {
    startFast = r;
    setTimeout(r, HEDGE_MS);
  });
  primary.catch(() => startFast());
  const fast = fastGate.then(() => transcribeAudio(audio, mimeType, transcribeFallbackModel(), 20_000));
  try {
    return await Promise.any([primary, fast]);
  } catch (e) {
    const errs = e instanceof AggregateError ? e.errors : [e];
    const configErr = errs.find((x) => x instanceof TranscribeError && x.status === 501);
    throw configErr ?? errs[0];
  }
}

const LANGS = new Set(["ro", "en", "mixed", "unknown"]);

export async function transcribeAudio(audio: Uint8Array, mimeType: string, model = transcribeModel(), timeoutMs = 20_000): Promise<TranscribeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new TranscribeError("Transcription is not configured (GEMINI_API_KEY missing).", 501);
  const ai = new GoogleGenAI({ apiKey });
  const t0 = Date.now();
  let raw = "";
  try {
    const res = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mimeType.split(";")[0] || "audio/webm", data: Buffer.from(audio).toString("base64") } },
            { text: TRANSCRIBE_PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0,
        // transcription needs no reasoning: thinking only adds latency
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: AbortSignal.timeout(timeoutMs),
      },
    });
    raw = res.text ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /\b(429|RESOURCE_EXHAUSTED)\b/.test(msg) ? 429 : /\b(400|INVALID_ARGUMENT)\b/.test(msg) ? 400 : 502;
    throw new TranscribeError(`Transcription failed: ${msg.slice(0, 300)}`, status);
  }
  let text = "";
  let language: Language = "unknown";
  try {
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")) as { text?: unknown; language?: unknown };
    text = typeof parsed.text === "string" ? parsed.text.trim() : "";
    language = typeof parsed.language === "string" && LANGS.has(parsed.language) ? (parsed.language as Language) : "unknown";
  } catch {
    text = raw.trim();
  }
  return { text, language, model, ms: Date.now() - t0 };
}
