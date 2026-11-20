/**
 * Scenario 6 — a long session end to end: full demo script with pause/resume, a typed thought,
 * Stop → summary, reload, timeline scrubber + ?t= deep link, History, search, export, delete.
 * The tests are serial and share one session.
 */
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import {
  DEMO_SCRIPT,
  createSessionViaUi,
  getSnapshot,
  line,
  openSession,
  segmentRows,
  setRange,
  shot,
  startThinking,
  stopAndSummarize,
  thoughtCards,
  trackConsole,
  typeThought,
  waitForFinals,
  waitForIngested,
  waitForSnapshot,
  type SessionSnapshot,
} from "./helpers";

const TYPED = "Also: review the marketing budget before the operations call.";

let sessionId = "";
let sessionTitle = "";
let ended: SessionSnapshot | null = null;
let countsBefore: { segments: number; thoughts: number; actions: number } | null = null;

test.describe.serial("Scenario 6 — long session", () => {
  test("full script with pause/resume and a typed thought, then Stop → summary", async ({ page, request }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    sessionId = await createSessionViaUi(page);
    await startThinking(page);

    // ---- pause / resume mid-way ----
    await waitForFinals(page, 2, 40_000);
    await page.getByTestId("pause-button").click();
    await expect(page.getByTestId("resume-button")).toBeVisible();
    await expect(page.getByTestId("recording-indicator")).toHaveCount(0);
    await expect(page.getByTestId("pill-mic")).toContainText("paused");
    const clock = page.getByTestId("clock");
    const clockText = await clock.textContent();
    await page.waitForTimeout(1_300);
    expect(await clock.textContent(), "clock stops while paused").toBe(clockText);
    const rowsWhilePaused = await segmentRows(page).count();
    await page.waitForTimeout(1_500);
    expect(await segmentRows(page).count(), "no new finals while paused").toBe(rowsWhilePaused);
    await waitForSnapshot(request, sessionId, (s) => s.session.status === "paused", { message: "session paused on the server" });
    await page.getByTestId("resume-button").click();
    await expect(page.getByTestId("recording-indicator")).toBeVisible();

    // ---- typed thought gets a segment and is ingested ----
    await typeThought(page, TYPED);
    await expect(segmentRows(page).filter({ hasText: TYPED })).toHaveCount(1);
    const withTyped = await waitForIngested(request, sessionId, [TYPED]);
    const typedSeg = withTyped.segments.find((s) => s.rawText === TYPED)!;
    expect(typedSeg.provider).toBe("typed");
    expect(withTyped.thoughts.some((t) => t.sourceSegmentIds.includes(typedSeg.id)), "typed segment produced a thought").toBe(true);

    // ---- rest of the script ----
    await waitForFinals(page, DEMO_SCRIPT.length + 1, 90_000);
    await waitForIngested(request, sessionId, DEMO_SCRIPT.map((l) => l.text), 40_000);
    await shot(page, "scenario6-live-mid-session");
    await page.getByTestId("tab-transcript").click();
    await expect(segmentRows(page).filter({ hasText: TYPED }).locator("span", { hasText: /^typed$/ })).toHaveCount(1);

    // ---- stop → confirm → summary ----
    await stopAndSummarize(page);
    const summary = page.getByTestId("summary");
    await expect(summary).toContainText("Decisions");
    await expect(summary).toContainText("Keep the spreadsheet CRM for this quarter");
    await expect(summary).toContainText("Action items");
    await expect(summary).toContainText("Write the research department charter");
    await expect(summary).toContainText("Open questions");
    await expect(summary).toContainText("Who leads Finance and Marketing?");
    await expect(page.getByTestId("summary-section")).toContainText("simulated");
    await expect(page.getByTestId("pill-mic")).toContainText("mic off");
    await shot(page, "scenario6-summary");

    ended = await waitForSnapshot(request, sessionId, (s) => s.session.status === "ended" && !!s.session.summary, { message: "session ended with summary" });
    sessionTitle = ended.session.title;
    expect(ended.session.endedAt).not.toBeNull();
    expect(ended.session.durationMs).toBeGreaterThan(20_000);
    expect(ended.segments).toHaveLength(DEMO_SCRIPT.length + 1);
    expect(ended.scenes.some((s) => s.kind === "illustration" && s.status === "ready" && s.assetId)).toBe(true);
    countsBefore = { segments: ended.segments.length, thoughts: ended.thoughts.length, actions: ended.actions.length };

    expect(log.pageErrors, "uncaught page errors").toEqual([]);
    if (log.errors.length) test.info().annotations.push({ type: "console", description: log.errors.join(" | ") });
  });

  test("reload restores everything", async ({ page, request }) => {
    expect(sessionId).toBeTruthy();
    await openSession(page, sessionId);
    await expect(page.getByTestId("continue-button")).toBeVisible();
    await expect(page.getByTestId("pill-mic")).toContainText("mic off");

    await page.getByTestId("tab-transcript").click();
    await expect(segmentRows(page)).toHaveCount(countsBefore!.segments);
    await page.getByTestId("tab-live").click();
    await expect(thoughtCards(page)).toHaveCount(ended!.thoughts.filter((t) => t.status === "active").length);
    await page.getByTestId("tab-actions").click();
    await expect(page.getByTestId("action-row")).toHaveCount(countsBefore!.actions);
    await expect(page.getByTestId("summary")).toContainText("Keep the spreadsheet CRM for this quarter");
    await page.getByTestId("tab-canvas").click();
    await expect(page.getByTestId("scene-image")).toBeVisible();
    await shot(page, "scenario6-canvas");

    const after = await getSnapshot(request, sessionId);
    expect({ segments: after.segments.length, thoughts: after.thoughts.length, actions: after.actions.length }).toEqual(countsBefore);
    expect(after.concepts.length).toBe(ended!.concepts.length);
    expect(after.relations.length).toBe(ended!.relations.length);
    expect(after.versions.length).toBe(ended!.versions.length);
  });

  test("timeline scrubber hides later items and ?t= deep links work", async ({ page }) => {
    await openSession(page, sessionId);
    const segs = [...ended!.segments].sort((a, b) => a.endedMs - b.endedMs);
    // just after the 2nd spoken line ended, aligned to the scrubber's 250 ms step. A segment counts as
    // "existing" once its `segment.added` event happened, which the server stamps with endedMs.
    const cursor = Math.ceil((segs[1].endedMs + 1) / 250) * 250;
    const expectedVisible = segs.filter((s) => s.endedMs <= cursor).length;
    expect(expectedVisible).toBeGreaterThanOrEqual(2);
    expect(expectedVisible).toBeLessThan(segs.length);

    await page.getByTestId("tab-timeline").click();
    const rowsLive = await page.getByTestId("timeline-row").count();
    await setRange(page.getByTestId("timeline").locator('input[type="range"]'), cursor);
    await expect(page.getByTestId("timeline")).toContainText("Viewing the past");
    expect(await page.getByTestId("timeline-row").count()).toBeLessThan(rowsLive);
    await expect.poll(() => new URL(page.url()).searchParams.get("t")).toBe(String(cursor));

    await page.getByTestId("tab-transcript").click();
    await expect(page.getByTestId("viewing-past")).toBeVisible();
    await expect(segmentRows(page)).toHaveCount(expectedVisible);
    await shot(page, "scenario6-viewing-past");
    await page.getByTestId("viewing-past").getByRole("button", { name: "Jump to live" }).click();
    await expect(page.getByTestId("viewing-past")).toHaveCount(0);
    await expect(segmentRows(page)).toHaveCount(countsBefore!.segments);

    // deep link
    await openSession(page, sessionId, `?view=transcript&t=${cursor}`);
    await expect(page.getByTestId("viewing-past")).toBeVisible();
    await expect(segmentRows(page)).toHaveCount(expectedVisible);
    await expect(page.getByTestId("tab-transcript")).toHaveAttribute("aria-selected", "true");
  });

  test("History lists the session, search finds it, export downloads Markdown, delete removes it", async ({ page, request }) => {
    const log = trackConsole(page);
    await page.goto("/sessions");
    const card = page.getByTestId("session-card").filter({ hasText: sessionTitle });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Ended");
    await shot(page, "scenario6-history");

    // search (case-insensitive) → result link opens the session
    await page.getByTestId("search-input").fill("central intelligence");
    const results = page.getByTestId("search-results");
    await expect(results).toBeVisible();
    await expect(results).not.toContainText("Searching…");
    const hit = results.locator(`a[href^="/s/${sessionId}"]`).filter({ hasText: /Central Intelligence|central intelligence/i }).first();
    await expect(hit).toBeVisible();
    await hit.click();
    await page.waitForURL(new RegExp(`/s/${sessionId}`));
    await expect(page.locator('[data-testid="workspace"][data-loaded="1"]')).toBeVisible();

    // export md
    await page.goto("/sessions");
    await page.getByTestId("search-input").fill("");
    const [download] = await Promise.all([page.waitForEvent("download"), card.getByRole("link", { name: "Markdown" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^thinkspace-\d{4}-\d{2}-\d{2}-.*\.md$/);
    const md = fs.readFileSync((await download.path())!, "utf8");
    expect(md).toContain(`# ${sessionTitle}`);
    expect(md).toContain(line(1)); // Romanian transcript line, diacritics intact
    expect(md).toContain("## Transcript");
    expect(md).toContain("Keep the spreadsheet CRM for this quarter");

    // delete
    await card.getByRole("button", { name: "Delete session" }).click();
    await page.getByTestId("confirm-button").click();
    await expect(card).toHaveCount(0);
    await expect.poll(async () => (await request.get(`/api/sessions/${sessionId}`)).status()).toBe(404);
    await page.reload();
    await expect(page.getByTestId("session-list")).toBeVisible();
    await expect(page.getByTestId("session-card").filter({ hasText: sessionTitle })).toHaveCount(0);

    expect(log.pageErrors, "uncaught page errors").toEqual([]);
    if (log.errors.length) test.info().annotations.push({ type: "console", description: log.errors.join(" | ") });
  });
});
