/**
 * Scenario 4 — brainstorming is not a decision; Scenario 5 — explicit decision + actions.
 * Lines are fed through "Type a thought" (same engine path, immediate ingest).
 */
import { expect, test } from "@playwright/test";
import { createSession, line, openSession, shot, typeAndIngest, waitForSnapshot } from "./helpers";

test.describe("Scenario 4 + 5 — brainstorming vs decision, action extraction", () => {
  test("alternatives without a decision, then exactly one decision and two undated actions that persist", async ({ page, request }) => {
    test.setTimeout(120_000);
    const { id } = await createSession(request, "E2E scenario 4-5 — decisions");
    await openSession(page, id);

    // ---- scenario 4: brainstorming ----
    const s4 = await typeAndIngest(page, request, id, line(4));
    const alternatives = s4.thoughts.filter((t) => t.type === "alternative" && t.status === "active");
    expect(alternatives.map((t) => t.text).sort()).toEqual(["Build our own CRM", "Keep the spreadsheet for now", "Use HubSpot"]);
    expect(s4.thoughts.filter((t) => t.type === "decision"), "no false decision").toHaveLength(0);
    const question = s4.thoughts.find((t) => t.type === "question" && t.status === "active");
    expect(question?.text).toBe("Should we replace the current CRM?");
    expect(s4.actions, "no actions invented").toHaveLength(0);

    await page.getByTestId("tab-actions").click();
    const panel = page.getByTestId("execution-panel");
    await expect(panel.getByTestId("questions")).toContainText("Should we replace the current CRM?");
    await expect(panel.getByTestId("decisions")).toHaveCount(0);
    await expect(panel.getByTestId("actions")).toHaveCount(0);
    await expect(panel.getByTestId("summary-section")).toContainText("Generated automatically when you stop the session");

    // ---- scenario 5: decision + actions ----
    await page.getByTestId("tab-live").click(); // the "Type a thought" input lives in the Live/Transcript views
    const s5 = await typeAndIngest(page, request, id, line(5));
    await page.getByTestId("tab-actions").click();
    const decisions = s5.thoughts.filter((t) => t.type === "decision" && t.status === "active");
    expect(decisions, "exactly one decision").toHaveLength(1);
    expect(decisions[0].text).toBe("Keep the spreadsheet CRM for this quarter");
    expect(decisions[0].provenance).toBe("stated");
    const seg5 = s5.segments.find((s) => s.rawText === line(5))!;
    expect(decisions[0].sourceSegmentIds).toEqual([seg5.id]);

    expect(s5.actions).toHaveLength(2);
    expect(s5.actions.map((a) => a.text).sort()).toEqual(["Schedule a call with the operations lead", "Write the research department charter"]);
    for (const a of s5.actions) {
      expect(a.dueDate, "no invented deadline").toBeNull();
      expect(a.priority).toBeNull();
      expect(a.status).toBe("open");
      expect(a.sourceSegmentIds).toEqual([seg5.id]);
    }
    // the brainstorm question is settled (revised, not deleted)
    const q = s5.thoughts.find((t) => t.id === question!.id)!;
    expect(q.status).toBe("revised");
    expect(s5.thoughts.some((t) => t.type === "conclusion" && t.revisesThoughtId === q.id)).toBe(true);

    // ---- Decisions & Actions tab ----
    await expect(panel.getByTestId("decisions")).toContainText("Keep the spreadsheet CRM for this quarter");
    await expect(panel.getByTestId("actions").getByTestId("action-row")).toHaveCount(2);
    await expect(panel.getByTestId("questions")).toHaveCount(0); // settled question is no longer open
    // source links on the actions point at the transcript (00:00 — typed at session clock 0)
    const firstRow = panel.getByTestId("action-row").first();
    await expect(firstRow.getByTitle("Show source in transcript")).toBeVisible();
    await expect(firstRow).not.toContainText("due ");
    await shot(page, "scenario5-decisions-actions");

    // ---- mark an action done; persists across reload ----
    const charterRow = panel.getByTestId("action-row").filter({ hasText: "Write the research department charter" });
    await charterRow.getByRole("checkbox").check();
    await expect(charterRow).toHaveAttribute("data-status", "done");
    await waitForSnapshot(request, id, (s) => s.actions.find((a) => a.text === "Write the research department charter")?.status === "done", { message: "action persisted as done" });

    await page.reload();
    await expect(page.locator('[data-testid="workspace"][data-loaded="1"]')).toBeVisible();
    await page.getByTestId("tab-actions").click();
    const rowAfter = page.getByTestId("action-row").filter({ hasText: "Write the research department charter" });
    await expect(rowAfter).toHaveAttribute("data-status", "done");
    await expect(rowAfter.getByRole("checkbox")).toBeChecked();
    await expect(page.getByTestId("action-row").filter({ hasText: "Schedule a call" })).toHaveAttribute("data-status", "open");
  });
});
