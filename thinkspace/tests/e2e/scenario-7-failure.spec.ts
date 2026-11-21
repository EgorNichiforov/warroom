/**
 * Scenario 7 — service failure.
 * (a) The mock LLM fails on text containing "[[fail]]": an engine.error toast with Retry appears,
 *     the segment is not lost (transcript + snapshot), status pills settle; editing the text and
 *     pressing Retry succeeds.
 * (b) Offline: the connection pill shows offline, unsaved count grows, back online everything is saved.
 */
import { expect, test } from "@playwright/test";
import { createSession, getSnapshot, openSession, segmentRows, shot, startThinking, thoughtCards, typeThought, waitForFinals, waitForSnapshot } from "./helpers";

test.describe("Scenario 7 — service failure", () => {
  test("LLM failure is surfaced with Retry, the segment is kept, and a retry after editing succeeds", async ({ page, request }) => {
    test.setTimeout(90_000);
    const { id } = await createSession(request, "E2E scenario 7a — engine failure");
    await openSession(page, id);

    const failing = "[[fail]] the engine should choke on this line";
    await typeThought(page, failing);

    const toast = page.getByTestId("error-toasts").getByRole("alert").filter({ hasText: /Simulated LLM failure/ });
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await expect(toast).toContainText(/extract/i);
    await expect(toast).toContainText("retryable");
    await expect(toast.getByTestId("retry-button")).toBeVisible();
    await shot(page, "scenario7-engine-error");

    // the segment is not lost
    await expect(segmentRows(page).filter({ hasText: failing })).toHaveCount(1);
    const snap = await waitForSnapshot(request, id, (s) => s.segments.some((x) => x.rawText === failing), { message: "failed segment persisted" });
    const seg = snap.segments.find((x) => x.rawText === failing)!;
    expect(seg.ingestedAt).toBeNull();
    expect(snap.thoughts).toHaveLength(0);
    // the error is persisted in the event log too
    const events = (await request.get(`/api/sessions/${id}/events?since=0`).then((r) => r.json())) as { events: { type: string; payload: { stage?: string; retryable?: boolean } }[] };
    const err = events.events.find((e) => e.type === "engine.error");
    expect(err?.payload.stage).toBe("extract");
    expect(err?.payload.retryable).toBe(true);

    // status pills settle: nothing stuck in "thinking…", transcript saved
    await expect(page.getByTestId("pill-processing")).toHaveCount(0);
    await expect(page.getByTestId("pill-save")).toHaveText("saved");
    await expect(page.getByTestId("pill-connection")).toHaveText("online");

    // retrying the same text fails again (second toast), nothing lost
    await toast.getByTestId("retry-button").click();
    await expect(page.getByTestId("error-toasts").getByRole("alert").filter({ hasText: /Simulated LLM failure/ })).toHaveCount(1, { timeout: 20_000 });

    // edit the segment text, then Retry → success
    await page.getByTestId("tab-transcript").click();
    const row = page.locator(`[data-segment-id="${seg.id}"]`); // by id: the text changes while editing
    await row.locator("p").first().dblclick();
    const editor = row.getByLabel("Edit segment text");
    await expect(editor).toBeVisible();
    const fixed = "We should also define a budget review process";
    await editor.fill(fixed);
    await row.getByRole("button", { name: "Save" }).click();
    await expect(segmentRows(page).filter({ hasText: fixed })).toHaveCount(1);
    await expect(segmentRows(page).filter({ hasText: fixed }).locator("span", { hasText: /^edited$/ })).toHaveCount(1);

    const retry = page.getByTestId("error-toasts").getByRole("alert").filter({ hasText: /Simulated LLM failure/ }).getByTestId("retry-button");
    await retry.click();
    await page.getByTestId("tab-live").click();
    await expect(thoughtCards(page).filter({ hasText: fixed })).toHaveCount(1, { timeout: 20_000 });
    const after = await waitForSnapshot(request, id, (s) => s.segments.some((x) => x.id === seg.id && x.ingestedAt !== null), { message: "segment ingested after retry" });
    const segAfter = after.segments.find((x) => x.id === seg.id)!;
    expect(segAfter.rawText).toBe(fixed);
    expect(segAfter.editedByUser).toBe(true);
    expect(after.thoughts.length).toBeGreaterThanOrEqual(1);
  });

  test("offline: transcript keeps recording locally and is saved once back online", async ({ page, context, request }) => {
    test.setTimeout(90_000);
    const { id } = await createSession(request, "E2E scenario 7b — offline");
    await openSession(page, id);
    await startThinking(page);
    await waitForFinals(page, 1, 30_000);
    await expect(page.getByTestId("pill-save")).toHaveText("saved", { timeout: 10_000 });

    await context.setOffline(true);
    await waitForFinals(page, 2, 30_000);
    await expect(page.getByTestId("pill-connection")).toHaveText("offline", { timeout: 15_000 });
    await expect(page.getByTestId("pill-save")).toHaveText(/unsaved · [1-9]\d*/, { timeout: 15_000 });
    await expect(page.getByTestId("error-toasts")).toContainText("Connection lost");
    await expect(page.getByTestId("recording-indicator")).toBeVisible();
    await shot(page, "scenario7-offline");
    const rowsOffline = await segmentRows(page).allInnerTexts();
    expect(rowsOffline.length).toBeGreaterThanOrEqual(2);
    const serverBefore = await getSnapshot(request, id);
    expect(serverBefore.segments.length).toBeLessThan(rowsOffline.length);

    await context.setOffline(false);
    await expect(page.getByTestId("pill-connection")).toHaveText("online", { timeout: 20_000 });
    await expect(page.getByTestId("pill-save")).toHaveText("saved", { timeout: 20_000 });
    await expect(page.getByTestId("error-toasts")).not.toContainText("Connection lost");

    // every segment shown while offline is now on the server
    const shown = await segmentRows(page).locator("p").allTextContents();
    const after = await waitForSnapshot(request, id, (s) => shown.every((t) => s.segments.some((x) => x.rawText === t.trim())), { message: "offline segments saved" });
    expect(after.segments.length).toBeGreaterThanOrEqual(shown.length);
    await page.getByTestId("pause-button").click();

    // observation only (reported in PROGRESS.md): does an ingest that failed while offline recover without a manual Retry?
    const recovered = await waitForSnapshot(request, id, (s) => s.segments.every((x) => x.ingestedAt !== null), { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.info().annotations.push({ type: "observation", description: `ingests that failed while offline auto-recovered after reconnect: ${recovered}` });
    console.log(`[observation] offline ingests auto-recovered after reconnect: ${recovered}`);
  });
});
