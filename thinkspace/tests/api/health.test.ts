import { afterAll, expect, it } from "vitest";
import { HealthResponse } from "@/lib/contracts/api";
import { closeDb } from "@/lib/db/client";
import { GET } from "@/app/api/health/route";

afterAll(() => closeDb());

it("GET /api/health matches the HealthResponse contract (mock providers, open auth, pglite)", async () => {
  const res = await GET();
  expect(res.status).toBe(200);
  const body = await res.json();
  const parsed = HealthResponse.safeParse(body);
  expect(parsed.success, JSON.stringify(parsed.error)).toBe(true);
  expect(body.db).toBe("pglite");
  expect(body.auth).toBe("open");
  expect(body.providers.llm.real).toBe(false);
  expect(body.providers.image).toMatchObject({ name: "mock", real: false, model: "placeholder-svg" });
  expect(body.providers.speech.available).toEqual(expect.arrayContaining(["browser", "mock"]));
  expect(body.providers.speech.available).not.toContain("soniox");
});
