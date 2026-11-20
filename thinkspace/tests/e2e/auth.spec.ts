/**
 * Passphrase auth. Needs THINKSPACE_PASSPHRASE, which the shared e2e server does not set, so this
 * spec boots its own `next dev` on port 3124.
 *
 * `next dev` holds an exclusive lock on <project>/.next/dev, so a second instance cannot run from
 * the project directory. We build a throwaway project in the OS temp dir: hard-linked node_modules
 * (`cp -al`, falls back to a plain copy), copies of src/public/drizzle and the config files.
 */
import { expect, request as playwrightRequest, test } from "@playwright/test";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 3124;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSPHRASE = "test-pass";
const SECRET = "0123456789abcdef0123456789abcdef"; // 32 chars
const ROOT = path.resolve(__dirname, "..", "..");

let server: ChildProcess | null = null;
let shadow = "";
let serverLog = "";

function buildShadowProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "thinkspace-e2e-auth-"));
  try {
    execFileSync("cp", ["-al", path.join(ROOT, "node_modules"), path.join(dir, "node_modules")], { stdio: "ignore" });
  } catch {
    fs.cpSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), { recursive: true, verbatimSymlinks: true });
  }
  for (const d of ["src", "public", "drizzle"]) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
  for (const f of ["package.json", "tsconfig.json", "next.config.ts", "next-env.d.ts", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  }
  return dir;
}

async function waitForHealth(timeoutMs: number): Promise<void> {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(`auth server exited with ${server.exitCode}\n${serverLog}`);
    try {
      const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const body = (await res.json()) as { auth: string };
        if (body.auth === "passphrase") return;
        lastError = `health auth=${body.auth}`;
      } else lastError = `health status ${res.status}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`auth server not healthy after ${timeoutMs} ms: ${lastError}\n${serverLog}`);
}

test.describe("Passphrase auth (separate server on :3124)", () => {
  test.beforeAll(async () => {
    test.setTimeout(180_000);
    shadow = buildShadowProject();
    const env = {
      ...process.env,
      THINKSPACE_PASSPHRASE: PASSPHRASE,
      THINKSPACE_SECRET: SECRET,
      THINKSPACE_PGLITE_DIR: path.join(ROOT, ".data", "pglite-e2e-auth"),
      LLM_PROVIDER: "mock",
      IMAGE_PROVIDER: "mock",
      SPEECH_PROVIDER: "mock",
      DATABASE_URL: "",
      PORT: String(PORT),
    };
    server = spawn(path.join(shadow, "node_modules", ".bin", "next"), ["dev", "--port", String(PORT)], {
      cwd: shadow,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (d: Buffer) => (serverLog += d.toString()));
    server.stderr?.on("data", (d: Buffer) => (serverLog += d.toString()));
    await waitForHealth(120_000);
    // warm the dev compiler for the pages/routes the test touches (cold compiles can take tens of seconds)
    for (const p of ["/login", "/sessions"]) {
      await fetch(`${BASE}${p}`, { redirect: "manual", signal: AbortSignal.timeout(60_000) }).catch(() => undefined);
    }
    await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passphrase: "warm-up" }), signal: AbortSignal.timeout(60_000) }).catch(() => undefined);
  });

  test.afterAll(async () => {
    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        server.kill("SIGTERM");
      }
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          try {
            process.kill(-server!.pid!, "SIGKILL");
          } catch {
            /* already gone */
          }
          resolve();
        }, 10_000);
        server!.once("exit", () => {
          clearTimeout(t);
          resolve();
        });
      });
    }
    if (shadow) fs.rmSync(shadow, { recursive: true, force: true });
  });

  test("pages redirect to /login, wrong passphrase errors, right one signs in, API without cookie is 401", async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    try {
      await page.goto("/sessions", { timeout: 90_000 });
      await page.waitForURL(/\/login\?next=%2Fsessions/, { timeout: 60_000 });
      const input = page.getByTestId("passphrase-input");
      await expect(input).toBeVisible();

      await input.fill("definitely-wrong");
      await expect(input).toHaveValue("definitely-wrong");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("alert")).toHaveText("That passphrase is not right.", { timeout: 60_000 });
      expect(page.url()).toContain("/login");

      await input.fill(PASSPHRASE);
      await expect(input).toHaveValue(PASSPHRASE);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL(/\/sessions$/, { timeout: 60_000 });
      await expect(page.getByTestId("start-thinking")).toBeVisible();
      await expect(page.getByText("open mode")).toHaveCount(0);
      const cookies = await context.cookies();
      expect(cookies.some((c) => c.name === "ts_session")).toBe(true);

      // the signed-in browser can use the API
      const listed = await page.request.get("/api/sessions");
      expect(listed.status()).toBe(200);
    } finally {
      await context.close();
    }

    // a fresh client without the cookie is rejected
    const anon = await playwrightRequest.newContext({ baseURL: BASE });
    try {
      const res = await anon.get("/api/sessions");
      expect(res.status()).toBe(401);
      expect(await res.json()).toMatchObject({ code: "unauthorized" });
      const created = await anon.post("/api/sessions", { data: {} });
      expect(created.status()).toBe(401);
      const health = await anon.get("/api/health");
      expect(health.status()).toBe(200);
      const login = await anon.post("/api/auth/login", { data: { passphrase: "nope" } });
      expect(login.status()).toBe(401);
    } finally {
      await anon.dispose();
    }
  });
});
