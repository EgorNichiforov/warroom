import { afterEach, describe, expect, it } from "vitest";
import { LlmProviderError } from "@/lib/providers/llm/types";
import { MockLlmProvider, detectLanguage, extractTerms } from "@/lib/providers/llm/mock";
import { createLlmProvider } from "@/lib/providers/llm";
import { buildDigest } from "@/lib/engine/digest";
import { makeSnapshot } from "./fixtures";

const provider = new MockLlmProvider({ latencyMs: 0 });
const digest = buildDigest(makeSnapshot(), [], 12);
const seg = (id: string, text: string) => ({ id, text, startedMs: 0, endedMs: 1000 });

describe("mock LLM provider", () => {
  afterEach(() => {
    delete process.env.MOCK_LLM_FAIL;
  });

  it("throws a retryable LlmProviderError on [[fail]] and on MOCK_LLM_FAIL=1", async () => {
    await expect(provider.extract(digest, [seg("s1", "anything [[fail]]")])).rejects.toMatchObject({ name: "LlmProviderError", retryable: true });
    process.env.MOCK_LLM_FAIL = "1";
    const err = await provider.extract(digest, [seg("s1", "hello")]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmProviderError);
    expect((err as LlmProviderError).retryable).toBe(true);
  });

  it("detects language", () => {
    expect(detectLanguage("Deci, mă gândesc la un sistem. But I think research should be connected.")).toBe("mixed");
    expect(detectLanguage("Departamentele ar fi: research, execuție și operațiuni.")).toBe("ro");
    expect(detectLanguage("Actually, let's replace the model with five departments.")).toBe("en");
  });

  it("degrades gracefully on arbitrary text: annotation + one stated thought per segment, conservative concepts", async () => {
    const { extraction, usage } = await provider.extract(digest, [
      seg("s1", "We should talk to Acme Corp about the Q3 pipeline, I think."),
      seg("s2", "Trebuie să sun la furnizor mâine."),
      seg("s3", "Am decis: mergem cu varianta a doua."),
    ]);
    expect(extraction.segmentAnnotations.map((a) => a.language)).toEqual(["en", "ro", "ro"]);
    expect(extraction.segmentAnnotations.every((a) => a.cleanedText.length > 0 && a.translation === null)).toBe(true);
    expect(extraction.thoughts.map((t) => t.type)).toEqual(["idea", "action_item", "decision"]);
    expect(extraction.thoughts.every((t) => t.provenance === "stated" && t.sourceSegmentIds.length === 1)).toBe(true);
    expect(extraction.actions).toHaveLength(1);
    expect(extraction.concepts.map((c) => c.label)).toEqual(["Acme Corp"]);
    expect(extractTerms("Central Intelligence Agency talks to Acme Corp and Big Blue Box and Red Fox Inc.")).toHaveLength(3);
    expect(usage?.model).toBe("mock-rules");
    expect(provider.real).toBe(false);
  });

  it("summarize returns the deterministic simulated summary", async () => {
    const { summary, usage } = await provider.summarize(makeSnapshot());
    expect(summary.simulated).toBe(true);
    expect(usage).toBeNull();
  });

  it("factory falls back to mock without an api key", () => {
    const p = createLlmProvider({ provider: "anthropic", model: "claude-opus-5-5", summaryModel: "claude-opus-5-5", liveEffort: "low", summaryEffort: "medium" });
    expect(p.name).toBe("mock");
    const real = createLlmProvider({ provider: "anthropic", model: "claude-opus-5-5", summaryModel: "claude-opus-5-5", liveEffort: "low", summaryEffort: "medium", apiKey: "sk-test" });
    expect(real.name).toBe("anthropic");
    expect(real.real).toBe(true);
  });
});
