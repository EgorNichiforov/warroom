/**
 * Auth gate for every page and API route (Next.js 16 `proxy`, formerly middleware).
 * In OPEN mode (no passphrase) everything passes. Otherwise a valid session cookie is required:
 * pages redirect to /login?next=…, API requests receive 401 JSON.
 * Route handlers still call `requireOwner()` themselves; this is the optimistic outer check.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isOpenMode, verifySessionToken } from "@/lib/auth";
import { config as appConfig } from "@/lib/config";

export async function proxy(request: NextRequest) {
  if (isOpenMode()) return NextResponse.next();

  const token = request.cookies.get(appConfig.auth.cookieName)?.value;
  const owner = await verifySessionToken(token);
  if (owner) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "authentication required", code: "unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // Everything except: /login, /api/auth/*, /api/health, Next internals, favicon, manifest, icons.
    "/((?!login|api/auth/|api/health|_next/|favicon\\.ico|icon\\.svg|manifest\\.webmanifest|icons/).*)",
  ],
};
