/** Shared helpers for API route tests: build Requests, route contexts and parse NDJSON streams. */
export const BASE = "http://localhost";

export function jsonRequest(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(BASE + path, {
    method,
    headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

export async function readNdjson(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text();
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

export async function createTestSession(title = "Test session"): Promise<{ id: string; title: string }> {
  const { POST } = await import("@/app/api/sessions/route");
  const res = await POST(jsonRequest("POST", "/api/sessions", { title }));
  if (res.status !== 201) throw new Error(`create session failed: ${res.status} ${await res.text()}`);
  const { session } = (await res.json()) as { session: { id: string; title: string } };
  return session;
}

export async function appendTestSegments(sessionId: string, texts: string[], startMs = 0) {
  const { POST } = await import("@/app/api/sessions/[id]/segments/route");
  const segments = texts.map((t, i) => ({
    id: `seg_${sessionId.slice(-6)}_${startMs + i}`,
    startedMs: startMs + i * 4000,
    endedMs: startMs + i * 4000 + 3500,
    rawText: t,
    language: "en",
    isFinal: true,
    provider: "mock",
  }));
  const res = await POST(jsonRequest("POST", `/api/sessions/${sessionId}/segments`, { segments }), ctx({ id: sessionId }));
  if (res.status !== 200) throw new Error(`append failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { segments: Array<{ id: string }>; events: unknown[] };
}
