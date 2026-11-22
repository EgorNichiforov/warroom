/**
 * Canonical demo / test script. Used by the mock speech provider, the mock LLM tests and
 * the Playwright scenarios. Lines mirror the mandatory scenarios in the product brief.
 * Everything produced from this script is labeled "simulated" in the UI.
 */
import type { Language } from "@/lib/contracts/domain";

export type ScriptLine = { text: string; language: Language; delayMs?: number; scenario: number };

export const DEMO_SCRIPT: ScriptLine[] = [
  // Scenario 1 — multilingual thinking
  {
    scenario: 1,
    language: "mixed",
    text: "Deci, mă gândesc la un sistem în care avem trei departamente. But I think research should be connected directly to the central intelligence.",
  },
  {
    scenario: 1,
    language: "ro",
    text: "Departamentele ar fi: research, execuție și operațiuni. Fiecare raportează către central intelligence.",
  },
  // Scenario 2 — system modification
  {
    scenario: 2,
    language: "en",
    text: "Actually, let's replace the three-department model with five departments: research, execution, operations, finance and marketing.",
  },
  // Scenario 3 — correction
  {
    scenario: 3,
    language: "en",
    text: "No, that's not what I meant. Research shouldn't control execution. It should only advise it.",
  },
  // Scenario 4 — brainstorming, no decision
  {
    scenario: 4,
    language: "mixed",
    text: "Mă întreb dacă ar trebui să înlocuim sistemul actual de CRM. We could use HubSpot, or maybe build our own, or keep the spreadsheet for now. I'm not sure yet.",
  },
  // Scenario 5 — explicit decision and actions
  {
    scenario: 5,
    language: "en",
    text: "OK, I've decided: we are keeping the spreadsheet for this quarter. Next step: I need to write the research department charter and schedule a call with the operations lead.",
  },
  // Scenario 6 — reference back and continuation
  {
    scenario: 6,
    language: "ro",
    text: "Să revenim la prima idee: central intelligence trebuie să aibă un dashboard unde vede toate cele cinci departamente.",
  },
];

export const scenarioLines = (n: number) => DEMO_SCRIPT.filter((l) => l.scenario === n);
