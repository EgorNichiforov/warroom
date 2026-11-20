/**
 * Mint short-lived speech tokens so vendor API keys never reach the browser (D-05).
 *
 * NOTE: neither endpoint could be exercised from the build environment (its network policy blocks
 * api.soniox.com and api.deepgram.com); the request/response shapes follow the official docs:
 *  - Soniox temporary API keys: https://soniox.com/docs/speech-to-text/guides/temporary-api-keys
 *      POST https://api.soniox.com/v1/auth/temporary-api-key
 *      Authorization: Bearer <SONIOX_API_KEY>, body {usage_type:"transcribe_websocket", expires_in_seconds}
 *      → {api_key, expires_at}
 *  - Deepgram temporary tokens: https://developers.deepgram.com/reference/token-based-auth-api/grant-token
 *      POST https://api.deepgram.com/v1/auth/grant  (the API key needs the Member role)
 *      Authorization: Token <DEEPGRAM_API_KEY>, body {ttl_seconds}
 *      → {access_token, expires_in}; the browser sends the token as the "bearer" WebSocket subprotocol.
 */
import "server-only";
import { config } from "@/lib/config";
import { jsonError } from "@/lib/server/http";

export type SpeechToken = { provider: "soniox" | "deepgram"; token: string; expiresAt: string };

const TTL_SECONDS = 600;
const UPSTREAM_TIMEOUT_MS = 10_000;

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`upstream ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("upstream returned a non-JSON body");
  }
}

export async function mintSpeechToken(provider: "soniox" | "deepgram"): Promise<Response> {
  const key = provider === "soniox" ? config.speech.sonioxKey : config.speech.deepgramKey;
  if (!key) return jsonError(501, "provider not configured", "not_configured");
  try {
    let token: SpeechToken;
    if (provider === "soniox") {
      const data = await post(
        "https://api.soniox.com/v1/auth/temporary-api-key",
        { authorization: `Bearer ${key}` },
        { usage_type: "transcribe_websocket", expires_in_seconds: TTL_SECONDS },
      );
      const apiKey = typeof data.api_key === "string" ? data.api_key : null;
      if (!apiKey) throw new Error("response did not include api_key");
      const expiresAt = typeof data.expires_at === "string" ? new Date(data.expires_at).toISOString() : new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
      token = { provider, token: apiKey, expiresAt };
    } else {
      const data = await post("https://api.deepgram.com/v1/auth/grant", { authorization: `Token ${key}` }, { ttl_seconds: TTL_SECONDS });
      const accessToken = typeof data.access_token === "string" ? data.access_token : null;
      if (!accessToken) throw new Error("response did not include access_token");
      const expiresIn = typeof data.expires_in === "number" ? data.expires_in : TTL_SECONDS;
      token = { provider, token: accessToken, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
    }
    return Response.json(token, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[thinkspace/speech-token] ${provider} failed:`, message);
    return jsonError(502, `could not obtain a ${provider} token: ${message}`, "upstream_error");
  }
}
