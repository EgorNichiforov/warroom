/**
 * Rule-based simulated LLM provider (D-06). Produces deterministic Extractions for the
 * demo script (src/lib/demo/script.ts) keyed on the digest state, and degrades gracefully
 * for arbitrary text (language detection + one thought per segment). Never labeled real.
 */
import type { ConceptKind, Language, RelationType, SessionSnapshot, ThoughtType } from "@/lib/contracts/domain";
import {
  emptyExtraction,
  type ContextDigest,
  type ExtractedChange,
  type Extraction,
  type SegmentInput,
} from "@/lib/contracts/extraction";
import { buildDeterministicSummary } from "@/lib/engine/summary";
import { normalizeLabel } from "@/lib/engine/apply";
import { LlmProviderError, type ExtractResult, type LlmProvider, type SummaryResult } from "./types";

// ---------------------------------------------------------------------------
// Language heuristics
// ---------------------------------------------------------------------------

const RO_DIACRITICS = /[ăâîșțşţĂÂÎȘȚŞŢ]/;
const RO_STOPWORDS = new Set(["și", "si", "este", "pentru", "mă", "trebuie", "deci", "dacă", "să", "sa", "în", "cu", "la", "care", "ar", "fi", "sunt", "nu", "de", "pe", "din", "către", "toate", "cele", "prima", "unde", "avem", "un", "ca"]);
const EN_STOPWORDS = new Set(["the", "and", "is", "are", "we", "i", "you", "it", "should", "could", "would", "maybe", "but", "not", "with", "for", "to", "of", "this", "that", "our", "let", "need", "think", "so", "or", "yet", "be", "own", "now"]);

const words = (text: string) => text.toLowerCase().split(/[^\p{L}']+/u).flatMap((w) => w.split("'")).filter(Boolean);

/** ro / en / mixed from diacritics and stopwords; "en" when nothing Romanian is found. */
export function detectLanguage(text: string): Language {
  const ws = words(text);
  const ro = RO_DIACRITICS.test(text) || ws.some((w) => RO_STOPWORDS.has(w));
  const en = ws.some((w) => EN_STOPWORDS.has(w));
  if (ro && en) return "mixed";
  if (ro) return "ro";
  return "en";
}

const cleanText = (raw: string) => {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return t;
  const capitalized = t[0].toLocaleUpperCase() + t.slice(1);
  return /[.!?…]$/.test(capitalized) ? capitalized : `${capitalized}.`;
};

// ---------------------------------------------------------------------------
// Extraction builder: resolves labels against the digest and against items already
// produced in this batch so later lines build on earlier ones.
// ---------------------------------------------------------------------------

class Builder {
  readonly out: Extraction = emptyExtraction();
  private counter = 0;
  private readonly labels = new Map<string, string>(); // normalized label → ref (existing id or tempId)
  private readonly pendingConceptKinds = new Map<string, string>();

  constructor(private readonly digest: ContextDigest) {}

  private tempId(prefix: string) {
    this.counter += 1;
    return `${prefix}${this.counter}`;
  }

  /** Finds an existing concept by any alias (normalized label). */
  findConcept(aliases: string[]): string | undefined {
    for (const a of aliases) {
      const key = normalizeLabel(a);
      const hit = this.labels.get(key) ?? this.digest.concepts.find((c) => normalizeLabel(c.label) === key)?.id;
      if (hit) return hit;
    }
    return undefined;
  }

  /** Returns a ref for the concept, reusing an existing id (emitting existingId) or creating a tempId. */
  concept(label: string, kind: ConceptKind, segmentId: string, aliases: string[] = []): string {
    const key = normalizeLabel(label);
    const pending = this.labels.get(key);
    if (pending) return pending;
    const existing = this.digest.concepts.find((c) => [label, ...aliases].some((a) => normalizeLabel(c.label) === normalizeLabel(a)));
    if (existing) {
      const tempId = this.tempId("c");
      this.out.concepts.push({ tempId, label: existing.label, kind: existing.kind, description: null, provenance: "stated", sourceSegmentIds: [segmentId], existingId: existing.id });
      this.labels.set(key, existing.id);
      return existing.id;
    }
    const tempId = this.tempId("c");
    this.out.concepts.push({ tempId, label, kind, description: null, provenance: "stated", sourceSegmentIds: [segmentId], existingId: null });
    this.labels.set(key, tempId);
    this.pendingConceptKinds.set(tempId, kind);
    return tempId;
  }

  /** Adds a relation unless an identical active one exists; returns the ref (existing id or tempId). */
  relation(fromRef: string, toRef: string, type: RelationType, segmentId: string, label: string | null = null): string {
    const existing = this.digest.relations.find((r) => r.fromId === fromRef && r.toId === toRef && r.type === type);
    if (existing) return existing.id;
    const pending = this.out.relations.find((r) => r.fromRef === fromRef && r.toRef === toRef && r.type === type);
    if (pending) return pending.tempId;
    const tempId = this.tempId("r");
    this.out.relations.push({ tempId, fromRef, toRef, type, label, provenance: "stated", sourceSegmentIds: [segmentId] });
    return tempId;
  }

  findRelations(fromRef: string, toRef: string, type: RelationType): string[] {
    return this.digest.relations.filter((r) => r.fromId === fromRef && r.toId === toRef && r.type === type).map((r) => r.id);
  }

  thought(type: ThoughtType, text: string, segmentId: string, opts: { confidence?: number; conceptRefs?: string[]; revises?: string | null; provenance?: "stated" | "inferred" } = {}): string {
    const tempId = this.tempId("t");
    this.out.thoughts.push({
      tempId,
      type,
      text,
      provenance: opts.provenance ?? "stated",
      confidence: opts.confidence ?? 0.75,
      sourceSegmentIds: [segmentId],
      revisesThoughtId: opts.revises ?? null,
      conceptRefs: opts.conceptRefs ?? [],
    });
    return tempId;
  }

  action(text: string, segmentId: string) {
    this.out.actions.push({ tempId: this.tempId("a"), text, priority: null, dueDate: null, dependsOnRefs: [], provenance: "stated", sourceSegmentIds: [segmentId] });
  }

  findModel(nameContains: string): string | undefined {
    const key = normalizeLabel(nameContains);
    return this.digest.models.find((m) => normalizeLabel(m.name).includes(key))?.id;
  }

  /** Pending create-change for a model of that name in this batch (so a later line merges into it). */
  pendingCreate(nameContains: string): ExtractedChange | undefined {
    const key = normalizeLabel(nameContains);
    return this.out.changes.find((c) => c.modelId === null && c.newModelName && normalizeLabel(c.newModelName).includes(key));
  }

  /** Change on an existing model, or on the pending create in this batch, or a fresh create. */
  modelChange(nameContains: string, newModelName: string, change: Omit<ExtractedChange, "modelId" | "newModelName">): void {
    const modelId = this.findModel(nameContains);
    if (modelId) {
      this.out.changes.push({ ...change, modelId, newModelName: null });
      return;
    }
    const pending = this.pendingCreate(nameContains);
    if (pending) {
      pending.addConceptRefs = [...new Set([...pending.addConceptRefs, ...change.addConceptRefs])];
      pending.addRelationRefs = [...new Set([...pending.addRelationRefs, ...change.addRelationRefs])];
      pending.sourceSegmentIds = [...new Set([...pending.sourceSegmentIds, ...change.sourceSegmentIds])];
      pending.description = `${pending.description}; ${change.description}`;
      return;
    }
    this.out.changes.push({ ...change, kind: "create", modelId: null, newModelName });
  }

  diagramScene(): { id: string } | undefined {
    const d = this.digest.scenes.filter((s) => s.kind === "diagram" || s.kind === "structured");
    return d.length ? { id: d[d.length - 1].id } : undefined;
  }

  openQuestion(textContains: string) {
    const key = normalizeLabel(textContains);
    return this.digest.openQuestions.find((q) => normalizeLabel(q.text).includes(key));
  }

  annotate(segment: SegmentInput) {
    this.out.segmentAnnotations.push({ segmentId: segment.id, language: detectLanguage(segment.text), cleanedText: cleanText(segment.text), translation: null });
  }
}

// ---------------------------------------------------------------------------
// Scenario rules (ordered; the first matching rule handles the segment)
// ---------------------------------------------------------------------------

type Rule = { name: string; test: (t: string) => boolean; apply: (b: Builder, seg: SegmentInput, text: string) => void };

const has = (...res: RegExp[]) => (t: string) => res.every((re) => re.test(t));

const CI = ["Central Intelligence", "central intelligence"];
const EXEC = ["Execuție", "Execution", "Executie"];
const OPS = ["Operațiuni", "Operations", "Operatiuni"];

const RULES: Rule[] = [
  {
    name: "scenario3-correction",
    test: has(/not what I meant|nu asta am vrut|greșit|gresit/i, /research/i, /advise|sfătui|sfatui/i),
    apply(b, seg) {
      const research = b.concept("Research", "component", seg.id);
      const exec = b.concept("Execuție", "component", seg.id, EXEC);
      const controls = b.findRelations(research, exec, "controls");
      b.out.corrections.push({
        description: "Research shouldn't control execution; it should only advise it",
        retractThoughtIds: [],
        retractRelationIds: controls,
        retractConceptIds: [],
        sourceSegmentIds: [seg.id],
      });
      const advises = b.relation(research, exec, "advises", seg.id, "advises");
      b.thought("observation", "Research advises execution; it does not control it", seg.id, { confidence: 0.9, conceptRefs: [research, exec] });
      const modelId = b.findModel("Departments");
      if (modelId) {
        b.out.changes.push({
          kind: "correction",
          modelId,
          newModelName: null,
          description: "Research advises execution instead of controlling it",
          removeConceptRefs: [],
          addConceptRefs: [],
          removeRelationRefs: controls,
          addRelationRefs: [advises],
          renames: [],
          implications: [],
          unresolvedQuestions: [],
          sourceSegmentIds: [seg.id],
        });
      }
      b.out.focus = "Clarifying the relationship between research and execution: advisory, not control.";
    },
  },
  {
    name: "scenario2-replace-five-departments",
    test: has(/replace|înlocui|inlocui/i, /five|cinci/i, /department/i),
    apply(b, seg) {
      const ci = b.concept("Central Intelligence", "component", seg.id, CI);
      const research = b.concept("Research", "component", seg.id);
      const exec = b.concept("Execuție", "component", seg.id, EXEC);
      const ops = b.concept("Operațiuni", "component", seg.id, OPS);
      const finance = b.concept("Finance", "component", seg.id);
      const marketing = b.concept("Marketing", "component", seg.id);
      const rels = [finance, marketing].map((d) => b.relation(d, ci, "reports_to", seg.id, "reports to"));
      b.thought("proposed_modification", "Replace the three-department model with five departments: research, execution, operations, finance and marketing", seg.id, {
        confidence: 0.85,
        conceptRefs: [research, exec, ops, finance, marketing],
      });
      b.modelChange("Departments", "Departments model", {
        kind: "replace",
        description: "Replaced three-department model with five departments",
        removeConceptRefs: [],
        addConceptRefs: [ci, research, exec, ops, finance, marketing],
        removeRelationRefs: [],
        addRelationRefs: rels,
        renames: [],
        implications: ["Reporting lines for the two new departments are not yet defined"],
        unresolvedQuestions: ["Who leads Finance and Marketing?"],
        sourceSegmentIds: [seg.id],
      });
      const diagram = b.diagramScene();
      b.out.sceneDirectives.push({
        op: diagram ? "update" : "new",
        sceneId: diagram?.id ?? null,
        title: "Five departments",
        kind: "diagram",
        description: "Five departments (research, execution, operations, finance, marketing) reporting to central intelligence",
        imagePrompt: "",
        conceptRefs: [ci, research, exec, ops, finance, marketing],
        reason: "The department structure changed from three to five",
        sourceSegmentIds: [seg.id],
      });
      b.out.focus = "Restructuring the organization into five departments around central intelligence.";
    },
  },
  {
    name: "scenario1-line2-departments-report",
    test: has(/raporteaz|reports? to/i, /central intelligence/i),
    apply(b, seg) {
      const ci = b.concept("Central Intelligence", "component", seg.id, CI);
      const research = b.concept("Research", "component", seg.id);
      const exec = b.concept("Execuție", "component", seg.id, EXEC);
      const ops = b.concept("Operațiuni", "component", seg.id, OPS);
      const rels = [research, exec, ops].map((d) => b.relation(d, ci, "reports_to", seg.id, "reports to"));
      b.thought("observation", "The departments are research, execution and operations; each reports to central intelligence", seg.id, {
        confidence: 0.85,
        conceptRefs: [research, exec, ops, ci],
      });
      b.modelChange("Departments", "Departments model", {
        kind: "add",
        description: "Added execution and operations departments reporting to central intelligence",
        removeConceptRefs: [],
        addConceptRefs: [ci, research, exec, ops],
        removeRelationRefs: [],
        addRelationRefs: rels,
        renames: [],
        implications: [],
        unresolvedQuestions: [],
        sourceSegmentIds: [seg.id],
      });
      b.out.focus = "Defining the three departments and their reporting lines to central intelligence.";
    },
  },
  {
    name: "scenario1-line1-three-departments",
    test: has(/trei departamente|three departments/i, /central intelligence/i),
    apply(b, seg) {
      const sistem = b.concept("Sistem", "concept", seg.id, ["System"]);
      const research = b.concept("Research", "component", seg.id);
      const ci = b.concept("Central Intelligence", "component", seg.id, CI);
      const rel = b.relation(research, ci, "connects_to", seg.id, "connected directly");
      b.thought("idea", "A system with three departments, where research is connected directly to the central intelligence", seg.id, {
        confidence: 0.8,
        conceptRefs: [sistem, research, ci],
      });
      b.modelChange("Departments", "Departments model", {
        kind: "create",
        description: "Three departments around a central intelligence",
        removeConceptRefs: [],
        addConceptRefs: [sistem, research, ci],
        removeRelationRefs: [],
        addRelationRefs: [rel],
        renames: [],
        implications: [],
        unresolvedQuestions: [],
        sourceSegmentIds: [seg.id],
      });
      b.out.sceneDirectives.push({
        op: "new",
        sceneId: null,
        title: "Three departments",
        kind: "diagram",
        description: "Three departments with research connected directly to central intelligence",
        imagePrompt: "",
        conceptRefs: [sistem, research, ci],
        reason: "A new organizational structure was introduced",
        sourceSegmentIds: [seg.id],
      });
      b.out.focus = "Sketching a system of three departments with research wired directly into central intelligence.";
    },
  },
  {
    name: "scenario4-crm-brainstorm",
    test: has(/crm/i, /mă întreb|ma intreb|i wonder|not sure|nu știu|nu stiu|maybe|poate/i),
    apply(b, seg) {
      const crm = b.concept("CRM", "concept", seg.id, ["current CRM", "sistemul de CRM"]);
      const hubspot = b.concept("HubSpot", "resource", seg.id);
      const own = b.concept("Own CRM", "resource", seg.id, ["custom CRM"]);
      const sheet = b.concept("Spreadsheet", "resource", seg.id, ["spreadsheet CRM"]);
      for (const alt of [hubspot, own, sheet]) b.relation(alt, crm, "alternative_to", seg.id, "alternative");
      b.thought("question", "Should we replace the current CRM?", seg.id, { confidence: 0.8, conceptRefs: [crm] });
      b.thought("alternative", "Use HubSpot", seg.id, { confidence: 0.7, conceptRefs: [hubspot, crm] });
      b.thought("alternative", "Build our own CRM", seg.id, { confidence: 0.7, conceptRefs: [own, crm] });
      b.thought("alternative", "Keep the spreadsheet for now", seg.id, { confidence: 0.7, conceptRefs: [sheet, crm] });
      b.out.focus = "Weighing whether to replace the current CRM: HubSpot, a custom build, or the spreadsheet; nothing decided.";
    },
  },
  {
    name: "scenario5-decision-and-actions",
    test: has(/i've decided|i have decided|am decis|hotărât|hotarat/i, /spreadsheet/i),
    apply(b, seg) {
      const sheet = b.concept("Spreadsheet", "resource", seg.id, ["spreadsheet CRM"]);
      const crm = b.findConcept(["CRM"]);
      b.thought("decision", "Keep the spreadsheet CRM for this quarter", seg.id, { confidence: 0.9, conceptRefs: crm ? [sheet, crm] : [sheet] });
      const question = b.openQuestion("CRM");
      if (question) {
        b.thought("conclusion", "The CRM question is settled for this quarter: keep the spreadsheet", seg.id, {
          confidence: 0.85,
          conceptRefs: crm ? [sheet, crm] : [sheet],
          revises: question.id,
        });
      }
      b.action("Write the research department charter", seg.id);
      b.action("Schedule a call with the operations lead", seg.id);
      b.out.focus = "Decided to keep the spreadsheet CRM this quarter; next steps are the research charter and a call with operations.";
    },
  },
  {
    name: "scenario6-dashboard",
    test: has(/dashboard/i, /central intelligence/i),
    apply(b, seg) {
      const ci = b.concept("Central Intelligence", "component", seg.id, CI);
      const dashboard = b.concept("Dashboard", "object", seg.id);
      b.relation(ci, dashboard, "contains", seg.id, "has");
      b.thought("idea", "Central intelligence needs a dashboard that shows all five departments", seg.id, { confidence: 0.8, conceptRefs: [ci, dashboard] });
      b.out.sceneDirectives.push({
        op: "new",
        sceneId: null,
        title: "Central intelligence dashboard",
        kind: "illustration",
        description: "An operations dashboard for central intelligence overseeing five departments",
        imagePrompt:
          "A clean, modern operations dashboard on a large wall screen in a calm control room, five distinct panels arranged around a central hub, each panel a different soft color representing a department, minimal flat illustration style, no text, no labels, soft daylight",
        conceptRefs: [ci, dashboard],
        reason: "A concrete object (the dashboard) was introduced and a picture communicates it better than text",
        sourceSegmentIds: [seg.id],
      });
      b.out.focus = "Returning to the first idea: a central intelligence dashboard covering all five departments.";
    },
  },
];

// ---------------------------------------------------------------------------
// Generic fallback for arbitrary text
// ---------------------------------------------------------------------------

const DECISION_CUES = /\b(i've decided|i have decided|we are going to|we're going to|am decis|hotărât|hotarat|rămâne așa)\b/i;
const ACTION_CUES = /\b(need to|needs to|next step|trebuie să|trebuie sa|să facem|sa facem|to do:)\b/i;
const QUESTION_CUES = /\?|\b(whether|dacă|daca|mă întreb|ma intreb|i wonder|should we|ar trebui)\b/i;
const CORRECTION_CUES = /\b(not what i meant|nu asta am vrut|actually,|de fapt|wrong|greșit|gresit)\b/i;
const TERM_RE = /\b(\p{Lu}[\p{Ll}\p{M}]+(?:\s+\p{Lu}[\p{Ll}\p{M}]+)+)\b/gu;
const SENTENCE_STARTS = /(?:^|[.!?]\s+)(\p{Lu}[\p{Ll}\p{M}]+(?:\s+\p{Lu}[\p{Ll}\p{M}]+)+)/gu;

function fallbackType(text: string): ThoughtType {
  if (CORRECTION_CUES.test(text)) return "observation";
  if (DECISION_CUES.test(text)) return "decision";
  if (QUESTION_CUES.test(text)) return "question";
  if (ACTION_CUES.test(text)) return "action_item";
  return "idea";
}

/** Capitalized multi-word terms not at a sentence start, at most three. */
export function extractTerms(text: string): string[] {
  const starts = new Set([...text.matchAll(SENTENCE_STARTS)].map((m) => m[1]));
  const terms = [...text.matchAll(TERM_RE)].map((m) => m[1]).filter((t) => !starts.has(t));
  return [...new Set(terms)].slice(0, 3);
}

function applyGeneric(b: Builder, seg: SegmentInput, text: string) {
  const conceptRefs = extractTerms(text).map((t) => b.concept(t, "concept", seg.id));
  const type = fallbackType(text);
  const sentence = cleanText(text).replace(/\.$/, "");
  if (type === "action_item") {
    const task = sentence.replace(/^.*?\b(need to|needs to|next step:?|trebuie să|trebuie sa|să facem|sa facem)\s*/i, "").trim();
    b.action(task ? task[0].toLocaleUpperCase() + task.slice(1) : sentence, seg.id);
    b.thought("action_item", sentence, seg.id, { confidence: 0.6, conceptRefs });
    return;
  }
  b.thought(type, sentence, seg.id, { confidence: type === "decision" ? 0.7 : 0.55, conceptRefs });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type MockLlmOptions = { latencyMs?: number };

export class MockLlmProvider implements LlmProvider {
  readonly name = "mock";
  readonly real = false;
  readonly model = "mock-rules";
  private readonly latencyMs: number;

  constructor(opts: MockLlmOptions = {}) {
    this.latencyMs = opts.latencyMs ?? 150;
  }

  /** Deterministic rule-based extraction; no network. */
  async extract(digest: ContextDigest, segments: SegmentInput[], opts?: { signal?: AbortSignal }): Promise<ExtractResult> {
    const started = Date.now();
    if (this.latencyMs > 0) await sleep(this.latencyMs);
    opts?.signal?.throwIfAborted();
    const joined = segments.map((s) => s.text).join(" ");
    if (process.env.MOCK_LLM_FAIL === "1" || joined.includes("[[fail]]")) {
      throw new LlmProviderError("Simulated LLM failure (MOCK_LLM_FAIL)", true);
    }
    const b = new Builder(digest);
    for (const seg of segments) {
      b.annotate(seg);
      const text = seg.text;
      const rule = RULES.find((r) => r.test(text));
      if (rule) rule.apply(b, seg, text);
      else applyGeneric(b, seg, text);
    }
    if (!b.out.focus) b.out.focus = digest.focus;
    return { extraction: b.out, usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, model: this.model, durationMs: Date.now() - started } };
  }

  async summarize(snapshot: SessionSnapshot): Promise<SummaryResult> {
    if (this.latencyMs > 0) await sleep(this.latencyMs);
    return { summary: buildDeterministicSummary(snapshot, true), usage: null };
  }
}
