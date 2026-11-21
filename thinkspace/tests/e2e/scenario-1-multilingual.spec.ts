/**
 * Scenario 1 — multilingual thinking.
 * The demo provider speaks the first two script lines (mixed RO/EN, then RO). After the engine
 * ingests them: transcript shows both lines with language tags, raw text preserved exactly
 * (diacritics intact), concepts Research + Central Intelligence, a Research → Central Intelligence
 * relation, a system model and a scene on the canvas.
 */
import { expect, test } from "@playwright/test";
import {
  conceptByLabel,
  createSessionViaUi,
  line,
  relationsBetween,
  segmentRows,
  shot,
  startThinking,
  thoughtCards,
  trackConsole,
  waitForFinals,
  waitForIngested,
} from "./helpers";

test.describe("Scenario 1 — multilingual thinking", () => {
  test("two mixed-language lines become transcript, concepts, a relation, a model and a scene", async ({ page, request }) => {
    test.setTimeout(120_000);
    const log = trackConsole(page);
    const id = await createSessionViaUi(page);

    // ---- performance probe: a MutationObserver stamps the first final segment row and the first thought card ----
    await page.evaluate(() => {
      const w = window as unknown as { __perf: Record<string, number> };
      w.__perf = { start: performance.now() };
      const obs = new MutationObserver(() => {
        if (w.__perf.firstFinal === undefined && document.querySelector('[data-testid="segment-row"]')) w.__perf.firstFinal = performance.now();
        if (w.__perf.firstThought === undefined && document.querySelector('[data-testid="thought-card"]')) w.__perf.firstThought = performance.now();
        if (w.__perf.firstFinal !== undefined && w.__perf.firstThought !== undefined) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
    await startThinking(page);
    await waitForFinals(page, 1, 30_000);
    await expect.poll(async () => thoughtCards(page).count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
    const perf = await page.evaluate(() => (window as unknown as { __perf: Record<string, number> }).__perf);
    const firstThoughtMs = Math.round(perf.firstThought - perf.firstFinal);
    const firstFinalMs = Math.round(perf.firstFinal - perf.start);
    test.info().annotations.push({ type: "perf", description: `first final rendered ${firstFinalMs} ms after Start; first thought rendered ${firstThoughtMs} ms after the first final` });
    console.log(`[perf] first final → first thought: ${firstThoughtMs} ms (first final rendered ${firstFinalMs} ms after Start)`);

    await waitForFinals(page, 2, 30_000);
    const snap = await waitForIngested(request, id, [line(0), line(1)]);

    // ---- transcript: both lines, exact raw text, language tags ----
    await shot(page, "scenario1-live");
    await page.getByTestId("tab-transcript").click();
    const row1 = segmentRows(page).filter({ hasText: "Deci, mă gândesc" });
    const row2 = segmentRows(page).filter({ hasText: "Departamentele ar fi" });
    await expect(row1).toHaveCount(1);
    await expect(row2).toHaveCount(1);
    await expect(row1.locator("p").first()).toHaveText(line(0));
    await expect(row2.locator("p").first()).toHaveText(line(1));
    await expect(row1.locator("span", { hasText: /^MIXED$/ })).toHaveCount(1);
    await expect(row2.locator("span", { hasText: /^RO$/ })).toHaveCount(1);

    // API: raw text preserved byte-for-byte, languages tagged
    const seg1 = snap.segments.find((s) => s.rawText === line(0));
    const seg2 = snap.segments.find((s) => s.rawText === line(1));
    expect(seg1?.language).toBe("mixed");
    expect(seg2?.language).toBe("ro");
    expect(seg2?.rawText).toContain("execuție și operațiuni");
    expect(seg2?.rawText).toContain("raportează către");

    // ---- concepts + relation ----
    const research = conceptByLabel(snap, "Research");
    const ci = conceptByLabel(snap, "Central Intelligence");
    expect(research, "Research concept").toBeDefined();
    expect(ci, "Central Intelligence concept").toBeDefined();
    expect(snap.concepts.filter((c) => c.label === "Research")).toHaveLength(1);
    const rels = relationsBetween(snap, "Research", "Central Intelligence").filter((r) => r.status === "active");
    expect(rels.length, "active Research → Central Intelligence relation").toBeGreaterThanOrEqual(1);
    for (const l of ["Execuție", "Operațiuni"]) expect(conceptByLabel(snap, l), l).toBeDefined();

    // ---- mind map shows the nodes ----
    await page.getByTestId("tab-mindmap").click();
    await expect(page.locator('[data-testid="graph-node"][data-label="Research"]')).toBeVisible();
    await expect(page.locator('[data-testid="graph-node"][data-label="Central Intelligence"]')).toBeVisible();
    await shot(page, "scenario1-mindmap");

    // ---- system model ----
    expect(snap.models.length, "a system model exists").toBeGreaterThanOrEqual(1);
    expect(snap.models[0].name).toMatch(/Departments/);
    expect(snap.versions.some((v) => v.modelId === snap.models[0].id)).toBe(true);

    // ---- scene on the canvas ----
    expect(snap.scenes.length, "a scene exists").toBeGreaterThanOrEqual(1);
    await page.getByTestId("tab-canvas").click();
    await expect(page.getByTestId("scene-card")).toBeVisible();
    await expect(page.getByTestId("scene-card")).toContainText(/departments/i);

    expect(log.pageErrors, "uncaught page errors").toEqual([]);
    if (log.errors.length) test.info().annotations.push({ type: "console", description: log.errors.join(" | ") });
  });
});
