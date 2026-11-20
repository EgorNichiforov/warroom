/**
 * Scenario 2 — system modification (3 → 5 departments).
 * Speech plays lines 1–3, then we pause so the model stops changing. The Systems tab must show
 * ≥2 versions, version 1 still viewable, Compare highlighting Finance/Marketing as added, and a
 * change log entry for the replace with its implication and unresolved question. The snapshot
 * keeps v1 (no Finance/Marketing) and the pre-replace version with the three departments.
 */
import { expect, test } from "@playwright/test";
import { createSessionViaUi, line, setRange, shot, startThinking, waitForFinals, waitForSnapshot } from "./helpers";

test.describe("Scenario 2 — system modification", () => {
  test("replace creates a new version, old version preserved, diff and change log shown", async ({ page, request }) => {
    test.setTimeout(120_000);
    const id = await createSessionViaUi(page);
    await startThinking(page);
    await waitForFinals(page, 3, 60_000);
    // freeze the script here so later lines (correction, CRM…) do not keep adding versions
    await page.getByTestId("pause-button").click();
    await expect(page.getByTestId("resume-button")).toBeVisible();

    const snap = await waitForSnapshot(request, id, (s) => s.changes.some((c) => c.kind === "replace") && s.segments.filter((x) => x.ingestedAt).length >= 3, {
      timeout: 40_000,
      message: "replace change recorded",
    });

    // ---- snapshot: versions ----
    const model = snap.models.find((m) => m.name.includes("Departments"))!;
    expect(model, "Departments model").toBeDefined();
    const versions = snap.versions.filter((v) => v.modelId === model.id).sort((a, b) => a.version - b.version);
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(versions[0].version).toBe(1);
    const labelsOf = (v: (typeof versions)[number]) => v.snapshot.concepts.map((c) => c.label);
    expect(labelsOf(versions[0])).not.toContain("Finance");
    expect(labelsOf(versions[0])).not.toContain("Marketing");

    const replace = snap.changes.find((c) => c.kind === "replace")!;
    expect(replace.modelId).toBe(model.id);
    expect(replace.beforeVersion).not.toBeNull();
    expect(replace.afterVersion).toBe(replace.beforeVersion! + 1);
    const before = versions.find((v) => v.version === replace.beforeVersion)!;
    const after = versions.find((v) => v.version === replace.afterVersion)!;
    expect(labelsOf(before), "pre-replace version keeps the three departments").toEqual(expect.arrayContaining(["Research", "Execuție", "Operațiuni"]));
    expect(labelsOf(before)).not.toContain("Finance");
    expect(labelsOf(after)).toEqual(expect.arrayContaining(["Research", "Execuție", "Operațiuni", "Finance", "Marketing", "Central Intelligence"]));
    expect(model.currentVersion).toBeGreaterThanOrEqual(replace.afterVersion!);
    const finance = snap.concepts.find((c) => c.label === "Finance")!;
    const marketing = snap.concepts.find((c) => c.label === "Marketing")!;
    expect(replace.diff.addedConceptIds).toEqual(expect.arrayContaining([finance.id, marketing.id]));
    expect(replace.implications).toContain("Reporting lines for the two new departments are not yet defined");
    expect(replace.unresolved).toContain("Who leads Finance and Marketing?");

    // ---- Systems tab ----
    await page.getByTestId("tab-systems").click();
    const panel = page.getByTestId("systems-panel");
    await expect(panel.getByTestId("model-item")).toContainText(`v${model.currentVersion}`);
    const slider = panel.getByTestId("version-slider");
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute("max", String(versions.at(-1)!.version));

    // version 1 still viewable
    await setRange(slider, 1);
    await expect(panel.locator('[data-testid="graph-node"][data-label="Research"]')).toBeVisible();
    await expect(panel.locator('[data-testid="graph-node"][data-label="Finance"]')).toHaveCount(0);
    await expect(panel.getByText(/^v1$/)).toBeVisible();

    // compare the replace: before = v(before), after = v(after); Finance + Marketing highlighted as added
    await setRange(slider, replace.afterVersion!);
    await panel.getByTestId("compare-toggle").click();
    await expect(panel.getByText(`Before · v${replace.beforeVersion}`.replace(" · ", " · "))).toBeVisible();
    await expect(panel.getByText(/\d+ added/)).toBeVisible();
    const added = panel.locator('[data-testid="graph-node"][data-diff="added"]');
    await expect(added).toHaveCount(2);
    await expect(panel.locator('[data-testid="graph-node"][data-diff="added"][data-label="Finance"]')).toBeVisible();
    await expect(panel.locator('[data-testid="graph-node"][data-diff="added"][data-label="Marketing"]')).toBeVisible();
    // the "before" pane does not show the new departments
    await expect(panel.locator('[data-testid="graph-node"][data-label="Finance"]')).toHaveCount(1);
    await shot(page, "scenario2-systems-compare");

    // change log lists the replace with implications and the unresolved question
    const changeLog = panel.getByTestId("change-log");
    await expect(changeLog).toBeVisible();
    const replaceRow = changeLog.locator("li", { hasText: "Replaced three-department model with five departments" });
    await expect(replaceRow).toHaveCount(1);
    await expect(replaceRow).toContainText("replace");
    await expect(replaceRow).toContainText(`v${replace.beforeVersion} → v${replace.afterVersion}`);
    await expect(replaceRow).toContainText("Reporting lines for the two new departments are not yet defined");
    await expect(replaceRow).toContainText("Who leads Finance and Marketing?");

    // sanity: the segment that caused it is the third script line
    const seg3 = snap.segments.find((s) => s.rawText === line(2));
    expect(seg3).toBeDefined();
    expect(replace.sourceSegmentIds).toContain(seg3!.id);
  });
});
