/**
 * Shared helpers for the Playwright e2e suite.
 *
 * The app runs with SPEECH_PROVIDER=mock (the "Demo script (simulated)" provider replays
 * src/lib/demo/script.ts), LLM_PROVIDER=mock and IMAGE_PROVIDER=mock, open auth.
 * Nothing here is specific to one scenario; every spec creates its own session.
 */
import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import type { SessionSnapshot } from "../../src/lib/contracts/domain";
import { DEMO_SCRIPT } from "../../src/lib/demo/script";

export { DEMO_SCRIPT };
export type { SessionSnapshot };

export const SCREENS_DIR = path.resolve(__dirname, "__screens__");

/** Create a session through the API and return its id. */
export async function createSession(request: APIRequestContext, title?: string): Promise<{ id: string; title: string }> {
  const res = await request.post("/api/sessions", { data: title ? { title } : {} });
  expect(res.status(), "POST /api/sessions").toBe(201);
  const { session } = (await res.json()) as { session: { id: string; title: string } };
  return session;
}

/** Create a session through the UI (History → Start thinking) and return its id. */
export async function createSessionViaUi(page: Page): Promise<string> {
  await page.goto("/sessions");
  await page.getByTestId("start-thinking").click();
  await page.waitForURL(/\/s\/[^/?]+/);
  const id = page.url().split("/s/")[1].split("?")[0];
  await waitForWorkspace(page);
  return id;
}

/** Open /s/:id (optionally with a query string) and wait for the snapshot to load. */
export async function openSession(page: Page, id: string, query = ""): Promise<void> {
  await page.goto(`/s/${id}${query}`);
  await waitForWorkspace(page);
}

export async function waitForWorkspace(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="workspace"][data-loaded="1"]')).toBeVisible({ timeout: 30_000 });
}

/** Select the scripted demo provider ("mock") in the provider dropdown. */
export async function selectMockProvider(page: Page): Promise<void> {
  const select = page.getByTestId("provider-select");
  await expect(select).toBeVisible();
  await select.selectOption("mock");
  await expect(select).toHaveValue("mock");
}

/** Press "Start thinking", accept the one-time privacy note, wait for the RECORDING indicator. */
export async function startThinking(page: Page): Promise<void> {
  await selectMockProvider(page);
  await page.getByTestId("start-button").click();
  const confirm = page.getByTestId("confirm-button");
  if (await confirm.isVisible({ timeout: 1_500 }).catch(() => false)) await confirm.click();
  await expect(page.getByTestId("recording-indicator")).toBeVisible({ timeout: 15_000 });
}

export const segmentRows = (page: Page): Locator => page.getByTestId("segment-row");
export const thoughtCards = (page: Page): Locator => page.getByTestId("thought-card");

/** Wait until at least `n` final transcript segments are rendered. */
export async function waitForFinals(page: Page, n: number, timeoutMs = 60_000): Promise<void> {
  await expect
    .poll(async () => segmentRows(page).count(), { timeout: timeoutMs, message: `waiting for ${n} final segments` })
    .toBeGreaterThanOrEqual(n);
}

export async function getSnapshot(request: APIRequestContext, id: string): Promise<SessionSnapshot> {
  const res = await request.get(`/api/sessions/${id}/snapshot`);
  expect(res.status(), `GET /api/sessions/${id}/snapshot`).toBe(200);
  return (await res.json()) as SessionSnapshot;
}

/** Poll the snapshot until `pred` holds; returns the matching snapshot. */
export async function waitForSnapshot(
  request: APIRequestContext,
  id: string,
  pred: (s: SessionSnapshot) => boolean,
  opts: { timeout?: number; message?: string } = {},
): Promise<SessionSnapshot> {
  let last: SessionSnapshot | null = null;
  await expect
    .poll(
      async () => {
        last = await getSnapshot(request, id);
        return pred(last);
      },
      { timeout: opts.timeout ?? 30_000, message: opts.message ?? "waiting for snapshot condition" },
    )
    .toBe(true);
  return last!;
}

/** Wait until every segment whose rawText matches one of `texts` has been ingested. */
export async function waitForIngested(request: APIRequestContext, id: string, texts: string[], timeoutMs = 30_000): Promise<SessionSnapshot> {
  return waitForSnapshot(
    request,
    id,
    (s) => texts.every((t) => s.segments.some((seg) => seg.rawText === t && seg.ingestedAt !== null)),
    { timeout: timeoutMs, message: `waiting for ${texts.length} segment(s) to be ingested` },
  );
}

/** "Type a thought" → Add. Returns the typed text. */
export async function typeThought(page: Page, text: string): Promise<string> {
  const input = page.getByTestId("type-thought-input");
  await input.fill(text);
  await page.getByTestId("type-thought-submit").click();
  await expect(input).toHaveValue("");
  return text;
}

/** Type a line and wait until the engine has ingested it. */
export async function typeAndIngest(page: Page, request: APIRequestContext, id: string, text: string): Promise<SessionSnapshot> {
  await typeThought(page, text);
  return waitForIngested(request, id, [text]);
}

/** Stop → confirm; waits for the session to be ended and the summary to render. */
export async function stopAndSummarize(page: Page): Promise<void> {
  await page.getByTestId("stop-button").click();
  await page.getByTestId("confirm-button").click();
  await expect(page.getByTestId("summary")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("continue-button")).toBeVisible();
}

/** Set an <input type="range"> value the way a user drag would (React sees the change). */
export async function setRange(locator: Locator, value: number): Promise<void> {
  await locator.evaluate((el, v) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, String(v));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

/** Take a screenshot into tests/e2e/__screens__/<name>.png (local only; gitignored). */
export async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENS_DIR, `${name}.png`), fullPage: false });
}

export type ConsoleLog = { errors: string[]; pageErrors: string[] };

/** Collect console errors and uncaught page errors for a page. */
export function trackConsole(page: Page): ConsoleLog {
  const log: ConsoleLog = { errors: [], pageErrors: [] };
  page.on("console", (m) => {
    if (m.type() === "error") log.errors.push(m.text().split("\n")[0].slice(0, 300));
  });
  page.on("pageerror", (e) => log.pageErrors.push(e.message));
  return log;
}

export const conceptByLabel = (s: SessionSnapshot, label: string) => s.concepts.find((c) => c.label.toLowerCase() === label.toLowerCase());

/** Relations between two labelled concepts (any direction given explicitly). */
export const relationsBetween = (s: SessionSnapshot, from: string, to: string) => {
  const a = conceptByLabel(s, from);
  const b = conceptByLabel(s, to);
  if (!a || !b) return [];
  return s.relations.filter((r) => r.fromId === a.id && r.toId === b.id);
};

export const line = (i: number) => DEMO_SCRIPT[i].text;
