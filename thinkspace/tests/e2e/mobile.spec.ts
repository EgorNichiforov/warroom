/**
 * Mobile layout: iPhone-sized viewport (iPhone 13 metrics, Chromium engine, scale factor 1).
 * History renders, Start thinking works, the bottom tab bar is visible and nothing overflows horizontally.
 */
import { devices, expect, test } from "@playwright/test";
import { segmentRows, shot, startThinking, waitForFinals, waitForWorkspace } from "./helpers";

const iphone = devices["iPhone 13"];

test.use({
  viewport: iphone.viewport,
  userAgent: iphone.userAgent,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});

/**
 * The Next.js dev-overlay badge (<nextjs-portal>, bottom-left) sits on top of the bottom tab bar on a
 * phone and swallows taps. It does not exist in production builds, so we remove it before tapping.
 */
async function tapBottomTab(page: import("@playwright/test").Page, name: string) {
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((el) => el.remove()));
  await page.getByTestId("view-tabs-bottom").getByRole("button", { name, exact: true }).click();
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page, label: string) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement!.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `${label}: document.scrollingElement.scrollWidth <= innerWidth`).toBeLessThanOrEqual(innerWidth);
}

test("phone: history, start thinking, bottom tabs, no horizontal overflow", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/sessions");
  await expect(page.getByTestId("start-thinking")).toBeVisible();
  await expect(page.getByText("History")).toBeVisible();
  await expectNoHorizontalOverflow(page, "/sessions");
  await shot(page, "mobile-history");

  await page.getByTestId("start-thinking").click();
  await page.waitForURL(/\/s\//);
  await waitForWorkspace(page);
  const tabs = page.getByTestId("view-tabs-bottom");
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("button")).toHaveCount(7);
  await expect(page.getByTestId("tab-live")).toHaveCount(0); // top tab strip is desktop-only
  await expectNoHorizontalOverflow(page, "/s/:id idle");

  await startThinking(page);
  await waitForFinals(page, 1, 30_000);
  await expect(segmentRows(page).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "/s/:id recording");
  await shot(page, "mobile-live");

  // bottom tabs switch views
  await tapBottomTab(page, "Map");
  await expect(page.getByTestId("mindmap")).toBeVisible();
  await tapBottomTab(page, "Actions");
  await expect(page.getByTestId("execution-panel")).toBeVisible();
  await expectNoHorizontalOverflow(page, "/s/:id actions");
  await shot(page, "mobile-actions");
  await tapBottomTab(page, "Live");
  await expect(page.getByTestId("transcript-panel")).toBeVisible();

  // controls are reachable on the phone layout
  await page.getByTestId("pause-button").click();
  await expect(page.getByTestId("resume-button")).toBeVisible();
});
