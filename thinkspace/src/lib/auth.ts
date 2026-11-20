/**
 * Single-owner authentication (DECISIONS D-12).
 * - OPEN mode when THINKSPACE_PASSPHRASE is empty: everything passes, owner id is "owner".
 * - Otherwise: passphrase login → HS256 JWT in an HttpOnly cookie, verified by src/proxy.ts
 *   and by `requireOwner()` inside every API route.
 *
 * Only Web APIs (WebCrypto, jose) are used so this module works in the proxy as well as in
 * route handlers.
 */
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { config } from "@/lib/config";

export const OWNER_ID = "owner";

/** Fixed salt used only to derive a signing secret from the passphrase when no secret is set. */
const DERIVE_SALT = "thinkspace-cookie-secret-v1";

const encoder = new TextEncoder();
let cachedKey: Promise<Uint8Array> | null = null;
let warnedDerived = false;

export function isOpenMode(): boolean {
  return !config.auth.passphrase;
}

export function authMode(): "passphrase" | "open" {
  return isOpenMode() ? "open" : "passphrase";
}

async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return new Uint8Array(digest);
}

/** HMAC key for the session cookie. */
export function getSecretKey(): Promise<Uint8Array> {
  if (!cachedKey) {
    cachedKey = (async () => {
      if (config.auth.secret) return encoder.encode(config.auth.secret);
      if (!warnedDerived) {
        warnedDerived = true;
        console.warn(
          "[thinkspace/auth] THINKSPACE_SECRET is empty; deriving the cookie signing secret from the passphrase. Set THINKSPACE_SECRET (openssl rand -hex 32) for production.",
        );
      }
      return sha256(`${DERIVE_SALT}:${config.auth.passphrase}`);
    })();
  }
  return cachedKey;
}

/** Constant-time comparison (both sides hashed to a fixed length first, so length never leaks). */
export async function verifyPassphrase(candidate: string): Promise<boolean> {
  if (isOpenMode()) return true;
  const [a, b] = await Promise.all([sha256(candidate), sha256(config.auth.passphrase)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createSessionToken(ownerId: string = OWNER_ID): Promise<string> {
  const key = await getSecretKey();
  return new SignJWT({ sub: ownerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${config.auth.ttlSeconds}s`)
    .sign(key);
}

/** Returns the owner id encoded in a valid token, or null. */
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const key = await getSecretKey();
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload.sub === OWNER_ID ? OWNER_ID : null;
  } catch {
    return null;
  }
}

/** Reads the session cookie from a raw Cookie header. */
export function readCookie(cookieHeader: string | null, name: string = config.auth.cookieName): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

/** Owner id for a request, or null when unauthenticated (never null in OPEN mode). */
export async function getOwnerId(req: Request): Promise<string | null> {
  if (isOpenMode()) return OWNER_ID;
  return verifySessionToken(readCookie(req.headers.get("cookie")));
}

/** For route handlers: resolves the owner id or throws a 401 JSON Response. */
export async function requireOwner(req: Request): Promise<string> {
  const owner = await getOwnerId(req);
  if (!owner) {
    throw Response.json({ error: "authentication required", code: "unauthorized" }, { status: 401 });
  }
  return owner;
}

function cookieAttributes(maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function sessionCookieHeader(token: string): string {
  return `${config.auth.cookieName}=${encodeURIComponent(token)}; ${cookieAttributes(config.auth.ttlSeconds)}`;
}

export function clearCookieHeader(): string {
  return `${config.auth.cookieName}=; ${cookieAttributes(0)}`;
}
