/**
 * Google Gemini image provider (DECISIONS D-08) via @google/genai.
 * generate(): text prompt → image. edit(): previous image + instruction → new image (continuity).
 *
 * Request shape (per the SDK types in node_modules/@google/genai/dist/genai.d.ts):
 *   ai.models.generateContent({ model, contents, config: { responseModalities: ['TEXT','IMAGE'], imageConfig: { aspectRatio } } })
 * Some image models reject IMAGE-only modality lists, so TEXT is always included and the first
 * part carrying inlineData is used as the result.
 *
 * Cost: the Gemini image models are billed per output image; 0.039 USD per image is an ESTIMATE
 * taken from the public price list at the time of writing and is only used for usage_log.
 */
import { GoogleGenAI, ApiError, type Part } from "@google/genai";
import { ImageProviderError, type GeneratedImage, type ImageProvider, type ImageUsage } from "./types";

export const GEMINI_IMAGE_COST_USD_ESTIMATE = 0.039;

type Aspect = "16:9" | "4:3" | "1:1";

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}

function mapError(err: unknown): ImageProviderError {
  if (err instanceof ImageProviderError) return err;
  if (err instanceof ApiError) {
    const status = err.status;
    const retryable = status === 429 || status === 408 || status >= 500;
    return new ImageProviderError(`Gemini image API error ${status}: ${err.message}`, retryable, err);
  }
  if (err instanceof Error && err.name === "AbortError") return new ImageProviderError("image generation aborted", true, err);
  const message = err instanceof Error ? err.message : String(err);
  // Network failures and unknown errors are worth a retry; the SDK may also surface HTTP codes as text.
  const m = /\b(4\d\d|5\d\d)\b/.exec(message);
  const code = m ? Number(m[1]) : 0;
  const retryable = code === 0 || code === 429 || code >= 500;
  return new ImageProviderError(`Gemini image provider failed: ${message}`, retryable, err);
}

export class GeminiImageProvider implements ImageProvider {
  readonly name = "gemini";
  readonly real = true;
  readonly model: string;
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  private async call(parts: Part[], aspect: Aspect, signal?: AbortSignal): Promise<{ image: GeneratedImage; usage: ImageUsage }> {
    const started = Date.now();
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: aspect },
          abortSignal: signal,
        },
      });
      const candidates = response.candidates ?? [];
      for (const c of candidates) {
        for (const p of c.content?.parts ?? []) {
          if (p.inlineData?.data) {
            const bytes = new Uint8Array(Buffer.from(p.inlineData.data, "base64"));
            return {
              image: { bytes, mime: p.inlineData.mimeType ?? "image/png", width: null, height: null },
              usage: { costUsd: GEMINI_IMAGE_COST_USD_ESTIMATE, model: this.model, durationMs: Date.now() - started },
            };
          }
        }
      }
      const blocked = response.promptFeedback?.blockReason;
      const text = candidates[0]?.content?.parts?.find((p) => p.text)?.text;
      throw new ImageProviderError(
        blocked
          ? `Gemini refused the prompt (${blocked})`
          : `Gemini returned no image${text ? `: ${text.slice(0, 200)}` : ""}`,
        false,
      );
    } catch (err) {
      throw mapError(err);
    }
  }

  generate(prompt: string, opts?: { signal?: AbortSignal; aspect?: Aspect }) {
    return this.call([{ text: prompt }], opts?.aspect ?? "16:9", opts?.signal);
  }

  edit(previous: GeneratedImage, instruction: string, opts?: { signal?: AbortSignal }) {
    const parts: Part[] = [
      { text: instruction },
      { inlineData: { data: toBase64(previous.bytes), mimeType: previous.mime } },
    ];
    return this.call(parts, "16:9", opts?.signal);
  }
}
