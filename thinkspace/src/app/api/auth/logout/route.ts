import { clearCookieHeader } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  return new Response(null, { status: 204, headers: { "set-cookie": clearCookieHeader(), "cache-control": "no-store" } });
}
