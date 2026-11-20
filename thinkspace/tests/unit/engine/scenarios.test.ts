import { describe, expect, it } from "vitest";
import { DEMO_SCRIPT, scenarioLines } from "@/lib/demo/script";
import { buildDeterministicSummary } from "@/lib/engine/summary";
import { MockLlmProvider } from "@/lib/providers/llm/mock";
import { conceptByLabel, runScript } from "./fixtures";

const provider = new MockLlmProvider({ latencyMs: 0 });

describe("demo script through mock provider → applyExtraction", () => {
  it("scenario 1: identifies three departments, central intelligence, the research relation and creates a model", async () => {
    const { snapshot } = await runScript(scenarioLines(1), provider);
    for (const l of ["Research", "Execuție", "Operațiuni", "Central Intelligence"]) expect(conceptByLabel(snapshot, l), l).toBeDefined();
    expect(snapshot.concepts.filter((c) => c.label === "Research")).toHaveLength(1);

    const research = conceptByLabel(snapshot, "Research")!;
    const ci = conceptByLabel(snapshot, "Central Intelligence")!;
    const researchToCi = snapshot.relations.filter((r) => r.fromId === research.id && r.toId === ci.id && r.status === "active");
    expect(researchToCi.map((r) => r.type).sort()).toEqual(["connects_to", "reports_to"]);

    expect(snapshot.models).toHaveLength(1);
    const model = snapshot.models[0];
    expect(model.name).toMatch(/Departments/);
    expect(model.currentVersion).toBe(2);
    const v2 = snapshot.versions.find((v) => v.modelId === model.id && v.version === 2)!;
    expect(v2.snapshot.conceptIds).toEqual(expect.arrayContaining([research.id, ci.id, conceptByLabel(snapshot, "Execuție")!.id, conceptByLabel(snapshot, "Operațiuni")!.id]));
    expect(v2.snapshot.relationIds).toHaveLength(4);
    expect(snapshot.scenes.filter((s) => s.kind === "diagram" && s.status === "ready")).toHaveLength(1);
    expect(snapshot.segments.map((s) => s.language)).toEqual(["mixed", "ro"]);
    expect(snapshot.segments.every((s) => s.cleanedText && s.rawText === DEMO_SCRIPT[s.seq - 1].text)).toBe(true);
  });

  it("scenario 2: replace creates version 2 (v1 preserved), diff lists added concepts, change recorded", async () => {
    const { snapshot, steps } = await runScript([...scenarioLines(1), ...scenarioLines(2)], provider);
    const model = snapshot.models[0];
    const before = steps[1].snapshot.models[0].currentVersion;
    expect(model.currentVersion).toBe(before + 1);
    const versions = snapshot.versions.filter((v) => v.modelId === model.id).sort((a, b) => a.version - b.version);
    expect(versions.map((v) => v.version)).toEqual([1, 2, 3]);
    expect(versions[0].snapshot.concepts.map((c) => c.label)).not.toContain("Finance");

    const finance = conceptByLabel(snapshot, "Finance")!;
    const marketing = conceptByLabel(snapshot, "Marketing")!;
    const change = snapshot.changes.find((c) => c.kind === "replace")!;
    expect(change.modelId).toBe(model.id);
    expect(change.beforeVersion).toBe(before);
    expect(change.afterVersion).toBe(before + 1);
    expect(change.diff.addedConceptIds).toEqual(expect.arrayContaining([finance.id, marketing.id]));
    expect(change.implications).toEqual(["Reporting lines for the two new departments are not yet defined"]);
    expect(change.unresolved).toEqual(["Who leads Finance and Marketing?"]);
    expect(snapshot.thoughts.some((t) => t.type === "question" && t.provenance === "inferred" && t.text.includes("Finance"))).toBe(true);
    expect(snapshot.thoughts.some((t) => t.type === "proposed_modification")).toBe(true);

    const current = versions[2].snapshot;
    expect(current.concepts.map((c) => c.label)).toEqual(expect.arrayContaining(["Research", "Execuție", "Operațiuni", "Finance", "Marketing", "Central Intelligence"]));
    expect(snapshot.scenes.filter((s) => s.status === "superseded")).toHaveLength(1);
    const latestScene = snapshot.scenes.find((s) => s.parentSceneId)!;
    expect(latestScene.title).toBe("Five departments");
    expect(latestScene.status).toBe("ready");
    expect(snapshot.concepts.filter((c) => c.status !== "active")).toHaveLength(0);
  });

  it("scenario 3: correction retracts the controls relation and leaves no contradictory active relation", async () => {
    // seed a wrong "controls" relation so the correction has something to retract
    const seeded = await runScript(scenarioLines(1), provider);
    const research = conceptByLabel(seeded.snapshot, "Research")!;
    const exec = conceptByLabel(seeded.snapshot, "Execuție")!;
    const controls = {
      id: "rel_seeded_controls",
      sessionId: seeded.snapshot.session.id,
      fromId: research.id,
      toId: exec.id,
      type: "controls" as const,
      label: null,
      status: "active" as const,
      provenance: "stated" as const,
      sourceSegmentIds: ["seg_0001"],
      createdAt: seeded.snapshot.session.createdAt,
      updatedAt: seeded.snapshot.session.createdAt,
    };
    const start = { ...seeded.snapshot, relations: [...seeded.snapshot.relations, controls] };
    const { snapshot, steps } = await runScript(scenarioLines(3), provider, start);

    const between = snapshot.relations.filter((r) => r.fromId === research.id && r.toId === exec.id);
    expect(between.find((r) => r.type === "controls")!.status).toBe("retracted");
    expect(between.filter((r) => r.status === "active").map((r) => r.type)).toEqual(["advises"]);
    expect(snapshot.relations).toHaveLength(start.relations.length + 1); // never deleted

    const correction = snapshot.changes.filter((c) => c.kind === "correction");
    expect(correction).toHaveLength(1);
    expect(correction[0].modelId).toBe(snapshot.models[0].id);
    expect(correction[0].diff.removedRelationIds).toEqual([]); // the seeded relation was never in a version
    expect(correction[0].diff.addedRelationIds).toHaveLength(1);
    expect(snapshot.models[0].currentVersion).toBe(3);
    expect(steps[0].result.events.map((e) => e.type)).toContain("relation.updated");
    expect(snapshot.thoughts.filter((t) => t.type === "decision")).toHaveLength(0);
    expect(snapshot.thoughts.some((t) => t.type === "observation" && t.text.includes("advises"))).toBe(true);
  });

  it("scenario 4: brainstorming produces alternatives and a question, zero decisions, zero actions", async () => {
    const { snapshot, steps } = await runScript(scenarioLines(4), provider);
    const thoughts = steps[0].result.inserts.thoughts;
    expect(thoughts.filter((t) => t.type === "decision")).toHaveLength(0);
    expect(thoughts.filter((t) => t.type === "alternative")).toHaveLength(3);
    expect(thoughts.filter((t) => t.type === "question").map((t) => t.text)).toEqual(["Should we replace the current CRM?"]);
    expect(steps[0].result.inserts.actions).toHaveLength(0);
    const crm = conceptByLabel(snapshot, "CRM")!;
    expect(snapshot.relations.filter((r) => r.type === "alternative_to" && r.toId === crm.id)).toHaveLength(3);
    expect(snapshot.segments[0].language).toBe("mixed");
  });

  it("scenario 5: exactly one decision, two actions with null dueDate and source segments; the CRM question is revised", async () => {
    const { snapshot, steps } = await runScript([...scenarioLines(4), ...scenarioLines(5)], provider);
    const step = steps[1];
    const decisions = step.result.inserts.thoughts.filter((t) => t.type === "decision");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].text).toBe("Keep the spreadsheet CRM for this quarter");
    expect(decisions[0].provenance).toBe("stated");
    expect(decisions[0].sourceSegmentIds).toEqual(["seg_0002"]);

    const actions = step.result.inserts.actions;
    expect(actions.map((a) => a.text)).toEqual(["Write the research department charter", "Schedule a call with the operations lead"]);
    for (const a of actions) {
      expect(a.dueDate).toBeNull();
      expect(a.priority).toBeNull();
      expect(a.status).toBe("open");
      expect(a.sourceSegmentIds.length).toBeGreaterThan(0);
    }

    const question = snapshot.thoughts.find((t) => t.type === "question" && t.text.includes("CRM"))!;
    expect(question.status).toBe("revised");
    const conclusion = snapshot.thoughts.find((t) => t.type === "conclusion")!;
    expect(conclusion.revisesThoughtId).toBe(question.id);
    expect(snapshot.thoughts.filter((t) => t.type === "decision")).toHaveLength(1);
  });

  it("scenario 6: references back, adds the dashboard with an illustration scene", async () => {
    const { snapshot, steps } = await runScript(DEMO_SCRIPT, provider);
    const dashboard = conceptByLabel(snapshot, "Dashboard")!;
    const ci = conceptByLabel(snapshot, "Central Intelligence")!;
    expect(snapshot.relations.some((r) => r.fromId === ci.id && r.toId === dashboard.id && r.type === "contains")).toBe(true);
    const scene = steps[6].result.inserts.scenes[0];
    expect(scene.kind).toBe("illustration");
    expect(scene.status).toBe("planned");
    expect(scene.prompt.length).toBeGreaterThan(40);
    expect(snapshot.concepts.filter((c) => c.label === "Central Intelligence")).toHaveLength(1);
    expect(snapshot.segments[6].language).toBe("ro");
  });

  it("full script: deterministic summary lists decisions, actions, open questions and ideas", async () => {
    const { snapshot } = await runScript(DEMO_SCRIPT, provider);
    const summary = buildDeterministicSummary(snapshot, true);
    expect(summary.simulated).toBe(true);
    expect(summary.decisions.map((d) => d.text)).toEqual(["Keep the spreadsheet CRM for this quarter"]);
    expect(summary.decisions[0].sourceSegmentIds).toEqual(["seg_0006"]);
    expect(summary.actionItems.map((a) => a.text)).toEqual(["Write the research department charter", "Schedule a call with the operations lead"]);
    expect(summary.nextSteps).toHaveLength(2);
    expect(summary.openQuestions).toContain("Who leads Finance and Marketing?");
    expect(summary.openQuestions).not.toContain("Should we replace the current CRM?");
    expect(summary.ideasToExplore).toEqual(expect.arrayContaining(["Use HubSpot", "Build our own CRM", "Keep the spreadsheet for now"]));
    expect(summary.conclusions.some((c) => c.includes("spreadsheet"))).toBe(true);
    expect(summary.systemsToChange.some((s) => s.includes("Departments model"))).toBe(true);
    expect(summary.whatIThoughtAbout).toEqual(expect.arrayContaining(["Research", "CRM", "Dashboard"]));
    expect(summary.suggestions).toContain("Reporting lines for the two new departments are not yet defined");
    expect(summary.headline).toContain("Org design session");
  });

  it("full script: every event carries the session id and the last snapshot is consistent", async () => {
    const { snapshot, steps } = await runScript(DEMO_SCRIPT, provider);
    for (const s of steps) {
      expect(s.result.events.every((e) => e.sessionId === "ses_test")).toBe(true);
      expect(s.result.events.filter((e) => e.type === "segment.updated")).toHaveLength(1);
    }
    expect(snapshot.lastEventSeq).toBe(steps.reduce((n, s) => n + s.result.events.length, 0));
    // every version's relation endpoints are inside that version's concept set
    for (const v of snapshot.versions) {
      const set = new Set(v.snapshot.conceptIds);
      for (const r of v.snapshot.relations) expect(set.has(r.fromId) && set.has(r.toId)).toBe(true);
    }
  });
});
