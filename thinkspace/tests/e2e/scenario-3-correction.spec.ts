/**
 * Scenario 3 — correction ("No, that's not what I meant… advise, not control").
 * Lines 1, 2 and the correction line are fed through "Type a thought" (same engine path as speech,
 * ingested immediately, no 40 ms/char replay) so the test stays fast and deterministic.
 * Asserts: no active `controls` Research→Execuție, an active `advises` exists, the correction is
 * recorded as a change; history is kept (retracted/revised items stay in the snapshot with their
 * status) and the Thoughts panel reveals them with "Show revised".
 */
import { expect, test } from "@playwright/test";
import { conceptByLabel, createSession, line, openSession, relationsBetween, shot, thoughtCards, typeAndIngest } from "./helpers";

test.describe("Scenario 3 — correction", () => {
  test("correction replaces control with advise, keeps history, and revised items are hidden/shown", async ({ page, request }) => {
    test.setTimeout(120_000);
    const { id } = await createSession(request, "E2E scenario 3 — correction");
    await openSession(page, id);

    await typeAndIngest(page, request, id, line(0));
    await typeAndIngest(page, request, id, line(1));
    const beforeCount = (await request.get(`/api/sessions/${id}/snapshot`).then((r) => r.json())).relations.length as number;
    const snap = await typeAndIngest(page, request, id, line(3)); // "No, that's not what I meant…"

    // typed segments get language annotated by the engine
    expect(snap.segments.find((s) => s.rawText === line(0))?.language).toBe("mixed");
    expect(snap.segments.find((s) => s.rawText === line(3))?.language).toBe("en");

    const research = conceptByLabel(snap, "Research")!;
    const exec = conceptByLabel(snap, "Execuție")!;
    expect(research).toBeDefined();
    expect(exec).toBeDefined();
    const between = relationsBetween(snap, "Research", "Execuție");
    expect(between.filter((r) => r.status === "active" && r.type === "controls"), "no active controls relation").toHaveLength(0);
    expect(between.filter((r) => r.status === "active").map((r) => r.type), "only advises is active").toEqual(["advises"]);
    // nothing is deleted: relation count only grows
    expect(snap.relations.length).toBeGreaterThan(beforeCount);
    // the mock never produced a `controls` relation for the demo script, so there is nothing to retract here;
    // the correction is still recorded as a change on the model
    const correction = snap.changes.filter((c) => c.kind === "correction");
    expect(correction, "correction change recorded").toHaveLength(1);
    expect(correction[0].modelId).toBe(snap.models[0].id);
    expect(correction[0].description).toMatch(/advises execution/i);
    expect(correction[0].diff.addedRelationIds).toHaveLength(1);
    expect(snap.thoughts.filter((t) => t.type === "decision"), "a correction is not a decision").toHaveLength(0);
    expect(snap.thoughts.some((t) => t.type === "observation" && /advises/.test(t.text))).toBe(true);

    // ---- Systems tab shows the correction in the change log ----
    await page.getByTestId("tab-systems").click();
    const row = page.getByTestId("change-log").locator("li", { hasText: "Research advises execution instead of controlling it" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("correction");

    // ---- history kept: retract a thought from the panel, it stays in the snapshot as retracted ----
    await page.getByTestId("tab-live").click();
    const card = thoughtCards(page).filter({ hasText: "Research advises execution; it does not control it" });
    await expect(card).toHaveCount(1);
    await card.hover();
    await card.getByTitle("Retract this thought").click();
    const after = await expect
      .poll(async () => {
        const s = (await request.get(`/api/sessions/${id}/snapshot`).then((r) => r.json())) as typeof snap;
        return s.thoughts.find((t) => t.text === "Research advises execution; it does not control it")?.status;
      })
      .toBe("retracted")
      .then(async () => (await request.get(`/api/sessions/${id}/snapshot`).then((r) => r.json())) as typeof snap);
    expect(after.thoughts.length, "retracted thought still exists").toBe(snap.thoughts.length);

    // hidden by default, visible with "Show revised" (struck through + status pill)
    await expect(card).toHaveCount(0);
    const thoughtsPanel = page.getByTestId("thoughts-panel");
    await thoughtsPanel.getByRole("switch", { name: "Show revised" }).click();
    await expect(card).toHaveCount(1);
    await expect(card.locator("span", { hasText: /^retracted$/ })).toHaveCount(1);
    await expect(card.locator("p").first()).toHaveClass(/line-through/);
    await shot(page, "scenario3-show-revised");
  });
});
