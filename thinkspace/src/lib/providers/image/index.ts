/**
 * Image provider factory. `gemini` needs an API key; without one we fall back to the simulated
 * provider (and say so in the server log) so the app keeps working and /api/health reports the truth.
 */
import { GeminiImageProvider } from "./gemini";
import { MockImageProvider } from "./mock";
import type { ImageProvider } from "./types";

export type { GeneratedImage, ImageProvider, ImageUsage } from "./types";
export { ImageProviderError } from "./types";

let warned = false;

export function createImageProvider(opts: { provider: string; model: string }, apiKey?: string): ImageProvider {
  if (opts.provider === "gemini") {
    if (apiKey) return new GeminiImageProvider(apiKey, opts.model);
    if (!warned) {
      warned = true;
      console.warn("[thinkspace/image] IMAGE_PROVIDER=gemini but GEMINI_API_KEY is empty; using the simulated image provider.");
    }
  } else if (opts.provider !== "mock" && !warned) {
    warned = true;
    console.warn(`[thinkspace/image] unknown IMAGE_PROVIDER "${opts.provider}"; using the simulated image provider.`);
  }
  return new MockImageProvider();
}
