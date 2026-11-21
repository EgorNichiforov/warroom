import { z } from "zod";
import { createSessionToken, isOpenMode, sessionCookieHeader, verifyPassphrase } from "@/lib/auth";
import { handle, jsonError, parseBody } from "@/lib/server/http";

export const runtime = "nodejs";

const LoginBody = z.object({ passphrase: z.string().min(1).max(512) });
const WRONG_PASSPHRASE_DELAY_MS = 500;

export async function POST(req: Request) {
  return handle(async () => {
    if (isOpenMode()) return new Response(null, { status: 204 });
    const { passphrase } = await parseBody(req, LoginBody);
    const ok = await verifyPassphrase(passphrase);
    if (!ok) {
      // Slow down guessing; a single-owner app does not need a full rate limiter.
      await new Promise((r) => setTimeout(r, WRONG_PASSPHRASE_DELAY_MS));
      return jsonError(401, "wrong passphrase", "unauthorized");
    }
    const token = await createSessionToken();
    return new Response(null, { status: 204, headers: { "set-cookie": sessionCookieHeader(token), "cache-control": "no-store" } });
  });
}
