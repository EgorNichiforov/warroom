/**
 * Real LLM provider: Anthropic Claude via @anthropic-ai/sdk structured outputs (D-06).
 * Thinking is adaptive by default (no `thinking` param); effort controls depth.
 * Server-side refusal fallbacks are enabled; a refusal that survives them is non-retryable.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { SessionSummary, type SessionSnapshot } from "@/lib/contracts/domain";
import { Extraction, type ContextDigest, type SegmentInput } from "@/lib/contracts/extraction";
import {
  EXTRACTION_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  buildExtractionUserMessage,
  buildSummaryUserMessage,
} from "@/lib/engine/prompts";
import { LlmProviderError, type ExtractResult, type LlmProvider, type LlmUsage, type SummaryResult } from "./types";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORTS: readonly Effort[] = ["low", "medium", "high", "xhigh", "max"];
export const toEffort = (s: string, fallback: Effort): Effort => (EFFORTS as readonly string[]).includes(s) ? (s as Effort) : fallback;

/** USD per million tokens: [input, output]. Unknown models cost 0 (logged as such). */
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-opus-5": [5, 25],
  "claude-sonnet-5": [2, 10],
};

export function estimateCostUsd(model: string, usage: BetaMessage["usage"]): number {
  const price = PRICES[model];
  if (!price) return 0;
  const [inPrice, outPrice] = price;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const input = usage.input_tokens * inPrice + cacheRead * inPrice * 0.1 + cacheWrite * inPrice * 1.25;
  return (input + usage.output_tokens * outPrice) / 1_000_000;
}

function toUsage(message: BetaMessage, requestedModel: string, durationMs: number): LlmUsage {
  const u = message.usage;
  const model = message.model || requestedModel;
  return {
    inputTokens: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
    outputTokens: u.output_tokens,
    costUsd: estimateCostUsd(model, u),
    model,
    durationMs,
  };
}

/** Maps SDK errors onto LlmProviderError with a retryable flag. */
export function mapSdkError(err: unknown): LlmProviderError {
  if (err instanceof LlmProviderError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return new LlmProviderError("LLM request aborted", false, err);
  if (err instanceof Anthropic.RateLimitError) return new LlmProviderError("LLM rate limited", true, err);
  if (err instanceof Anthropic.APIConnectionError) return new LlmProviderError("LLM connection error", true, err);
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === "number" ? err.status : undefined;
    const retryable = status === undefined || status === 408 || status === 409 || status >= 500;
    return new LlmProviderError(`LLM API error${status ? ` ${status}` : ""}: ${err.message}`, retryable, err);
  }
  if (err instanceof Anthropic.AnthropicError) {
    // e.g. "Failed to parse structured output" — a fresh sample usually fixes it
    return new LlmProviderError(`LLM output error: ${err.message}`, true, err);
  }
  return new LlmProviderError(err instanceof Error ? err.message : String(err), true, err);
}

const SummaryOutput = SessionSummary.omit({ generatedAt: true, simulated: true });

export type AnthropicProviderOptions = {
  apiKey: string;
  model: string;
  summaryModel?: string;
  liveEffort?: Effort;
  summaryEffort?: Effort;
  client?: Anthropic;
};

export class AnthropicLlmProvider implements LlmProvider {
  readonly name = "anthropic";
  readonly real = true;
  readonly model: string;
  private readonly summaryModel: string;
  private readonly liveEffort: Effort;
  private readonly summaryEffort: Effort;
  private readonly client: Anthropic;

  constructor(opts: AnthropicProviderOptions) {
    this.model = opts.model;
    this.summaryModel = opts.summaryModel ?? opts.model;
    this.liveEffort = opts.liveEffort ?? "low";
    this.summaryEffort = opts.summaryEffort ?? "medium";
    this.client = opts.client ?? new Anthropic({ apiKey: opts.apiKey });
  }

  async extract(digest: ContextDigest, segments: SegmentInput[], opts?: { signal?: AbortSignal }): Promise<ExtractResult> {
    const started = Date.now();
    const message = await this.parse(this.model, this.liveEffort, EXTRACTION_SYSTEM_PROMPT, buildExtractionUserMessage(digest, segments), Extraction, opts?.signal);
    const extraction = Extraction.parse(message.parsed_output);
    return { extraction, usage: toUsage(message, this.model, Date.now() - started) };
  }

  async summarize(snapshot: SessionSnapshot, opts?: { signal?: AbortSignal }): Promise<SummaryResult> {
    const started = Date.now();
    const message = await this.parse(this.summaryModel, this.summaryEffort, SUMMARY_SYSTEM_PROMPT, buildSummaryUserMessage(snapshot), SummaryOutput, opts?.signal);
    const summary: SessionSummary = { ...SummaryOutput.parse(message.parsed_output), generatedAt: new Date().toISOString(), simulated: false };
    return { summary, usage: toUsage(message, this.summaryModel, Date.now() - started) };
  }

  /** One structured-output call; returns the message with a non-null parsed_output or throws LlmProviderError. */
  private async parse<S extends typeof Extraction | typeof SummaryOutput>(
    model: string,
    effort: Effort,
    system: string,
    userMessage: string,
    schema: S,
    signal?: AbortSignal,
  ) {
    try {
      const message = await this.client.beta.messages.parse(
        {
          model,
          max_tokens: 16000,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userMessage }],
          output_config: { effort, format: zodOutputFormat(schema) },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        },
        { signal },
      );
      if (message.stop_reason === "refusal") {
        throw new LlmProviderError(`LLM refused the request (${message.stop_details?.category ?? "unspecified"})`, false);
      }
      if (message.parsed_output === null) {
        const truncated = message.stop_reason === "max_tokens";
        throw new LlmProviderError(truncated ? "LLM output truncated (max_tokens)" : "LLM returned no structured output", truncated);
      }
      return message;
    } catch (err) {
      throw mapSdkError(err);
    }
  }
}
