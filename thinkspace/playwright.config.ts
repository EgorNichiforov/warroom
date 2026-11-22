import { defineConfig, devices } from "@playwright/test";

const PORT = 3123;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    permissions: ["microphone"],
    ...devices["Desktop Chrome"],
    launchOptions: { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  },
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      THINKSPACE_PGLITE_DIR: ".data/pglite-e2e",
      LLM_PROVIDER: "mock",
      IMAGE_PROVIDER: "mock",
      SPEECH_PROVIDER: "mock",
      THINKSPACE_PASSPHRASE: "",
    },
  },
});
