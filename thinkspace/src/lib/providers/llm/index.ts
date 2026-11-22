/** LLM provider factory: real Anthropic when configured, otherwise the simulated mock. */
import { AnthropicLlmProvider, toEffort } from "./anthropic";
import { MockLlmProvider } from "./mock";
import type { LlmProvider } from "./types";

export type { LlmProvider, ExtractResult, SummaryResult, LlmUsage } from "./types";
export { LlmProviderError } from "./types";
export { MockLlmProvider } from "./mock";
export { AnthropicLlmProvider } from "./anthropic";

export type CreateLlmProviderOptions = {
  provider: string;
  model: string;
  summaryModel: string;
  liveEffort: string;
  summaryEffort: string;
  apiKey?: string;
};

export function createLlmProvider(opts: CreateLlmProviderOptions): LlmProvider {
  if (opts.provider === "anthropic") {
    if (opts.apiKey) {
      return new AnthropicLlmProvider({
        apiKey: opts.apiKey,
        model: opts.model,
        summaryModel: opts.summaryModel,
        liveEffort: toEffort(opts.liveEffort, "low"),
        summaryEffort: toEffort(opts.summaryEffort, "medium"),
      });
    }
    console.warn("[thinkspace] LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing; falling back to the simulated mock provider");
  } else if (opts.provider !== "mock") {
    console.warn(`[thinkspace] Unknown LLM_PROVIDER "${opts.provider}"; using the simulated mock provider`);
  }
  return new MockLlmProvider();
}
