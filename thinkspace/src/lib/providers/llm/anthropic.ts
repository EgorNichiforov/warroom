/**
 * Real LLM provider: Anthropic Claude via @anthropic-ai/sdk structured outputs (D-06).
 * Thinking is adaptive by default (no `thinking` param); effort controls depth.
 * Server-side refusal fallbacks are enabled; a refusal that survives them is non-retryable.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { SessionSummary, type SessionSnapshot } from "@/lib/contracts/domain";
import { Extraction, emptyExtraction, type ContextDigest, type SegmentInput } from "@/lib/contracts/extraction";
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
    const { value, message } = await this.callJson(this.model, this.liveEffort, EXTRACTION_SYSTEM_PROMPT, buildExtractionUserMessage(digest, segments), Extraction, (v) => ({ ...emptyExtraction(), ...(v as object) }), opts?.signal);
    return { extraction: value, usage: toUsage(message, this.model, Date.now() - started) };
  }

  async summarize(snapshot: SessionSnapshot, opts?: { signal?: AbortSignal }): Promise<SummaryResult> {
    const started = Date.now();
    const { value, message } = await this.callJson(this.summaryModel, this.summaryEffort, SUMMARY_SYSTEM_PROMPT, buildSummaryUserMessage(snapshot), SummaryOutput, (v) => v, opts?.signal);
    const summary: SessionSummary = { ...value, generatedAt: new Date().toISOString(), simulated: false };
    return { summary, usage: toUsage(message, this.summaryModel, Date.now() - started) };
  }

  /**
   * Asks for one JSON object matching `schema` (described as JSON Schema in the system prompt,
   * which stays stable so it is prompt-cached), validates it with zod and retries once with the
   * validation errors. Constrained decoding is not used: the extraction schema is too large for it.
   */
  private async callJson<S extends z.ZodTypeAny>(
    model: string,
    effort: Effort,
    system: string,
    userMessage: string,
    schema: S,
    normalize: (v: unknown) => unknown,
    signal?: AbortSignal,
  ): Promise<{ value: z.infer<S>; message: BetaMessage }> {
    const systemText = `${system}\n\nOUTPUT FORMAT: reply with exactly one JSON object and nothing else (no prose, no markdown fences). It must validate against this JSON Schema; use [] for empty lists and null for unknown optional values:\n${JSON.stringify(z.toJSONSchema(schema))}`;
    const messages: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: userMessage }];
    let last: BetaMessage | null = null;
    let inTok = 0;
    let outTok = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      let message: BetaMessage;
      try {
        message = (await this.client.beta.messages.create(
          {
            model,
            max_tokens: 16000,
            system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
            messages,
            output_config: { effort },
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
          },
          { signal },
        )) as BetaMessage;
      } catch (err) {
        throw mapSdkError(err);
      }
      last = message;
      inTok += message.usage.input_tokens;
      outTok += message.usage.output_tokens;
      if (message.stop_reason === "refusal") {
        throw new LlmProviderError(`LLM refused the request (${message.stop_details?.category ?? "unspecified"})`, false);
      }
      const text = message.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      let problem: string;
      try {
        const parsed = schema.safeParse(normalize(JSON.parse(jsonText.slice(jsonText.indexOf("{"), jsonText.lastIndexOf("}") + 1))));
        if (parsed.success) {
          message.usage = { ...message.usage, input_tokens: inTok, output_tokens: outTok };
          return { value: parsed.data, message };
        }
        problem = parsed.error.issues.slice(0, 12).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      } catch (e) {
        problem = message.stop_reason === "max_tokens" ? "the JSON was cut off (too long); be more concise" : `not valid JSON (${e instanceof Error ? e.message : "parse error"})`;
      }
      messages.push({ role: "assistant", content: text || "{}" });
      messages.push({ role: "user", content: `That reply did not validate: ${problem}. Reply again with the complete corrected JSON object only.` });
    }
    throw new LlmProviderError(`LLM returned invalid JSON twice${last ? ` (stop: ${last.stop_reason})` : ""}`, true);
  }
}
