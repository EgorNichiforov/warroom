import { afterAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.THINKSPACE_PASSPHRASE = "correct horse battery";
  process.env.THINKSPACE_SECRET = "";
});

import { closeDb } from "@/lib/db/client";
import { getOwnerId, requireOwner, readCookie, verifySessionToken } from "@/lib/auth";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as listSessions } from "@/app/api/sessions/route";
import { GET as health } from "@/app/api/health/route";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";
import { jsonRequest } from "./helpers";

afterAll(() => closeDb());

describe("passphrase auth", () => {
  it("rejects a wrong passphrase with 401 (after a delay)", async () => {
    const t0 = Date.now();
    const res = await login(jsonRequest("POST", "/api/auth/login", { passphrase: "nope" }));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("unauthorized");
    expect(Date.now() - t0).toBeGreaterThanOrEqual(450);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("accepts the right passphrase, sets a verifiable HttpOnly cookie, and routes honour it", async () => {
    const res = await login(jsonRequest("POST", "/api/auth/login", { passphrase: "correct horse battery" }));
    expect(res.status).toBe(204);
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/^ts_session=/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    const cookiePair = setCookie.split(";")[0];
    const token = readCookie(cookiePair);
    expect(await verifySessionToken(token)).toBe("owner");
    expect(await verifySessionToken(token + "x")).toBeNull();

    const unauth = await listSessions(jsonRequest("GET", "/api/sessions"));
    expect(unauth.status).toBe(401);
    expect(await getOwnerId(jsonRequest("GET", "/api/sessions"))).toBeNull();

    const authed = await listSessions(jsonRequest("GET", "/api/sessions", undefined, { cookie: cookiePair }));
    expect(authed.status).toBe(200);
    expect(await requireOwner(jsonRequest("GET", "/x", undefined, { cookie: cookiePair }))).toBe("owner");

    const h = await health();
    expect((await h.json()).auth).toBe("passphrase");

    const out = await logout();
    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("proxy: API → 401 JSON, pages → redirect to /login?next=…, valid cookie passes", async () => {
    const api = await proxy(new NextRequest("http://localhost/api/sessions"));
    expect(api.status).toBe(401);
    expect((await api.json()).code).toBe("unauthorized");

    const page = await proxy(new NextRequest("http://localhost/sessions/abc?tab=live"));
    expect(page.status).toBeGreaterThanOrEqual(300);
    expect(page.status).toBeLessThan(400);
    const loc = new URL(page.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("next")).toBe("/sessions/abc?tab=live");

    const res = await login(jsonRequest("POST", "/api/auth/login", { passphrase: "correct horse battery" }));
    const cookiePair = res.headers.get("set-cookie")!.split(";")[0];
    const ok = await proxy(new NextRequest("http://localhost/api/sessions", { headers: { cookie: cookiePair } }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("location")).toBeNull();
  });
});
