/**
 * Typed fetch client for the THINKSPACE HTTP API (see docs/ARCHITECTURE.md and
 * src/lib/contracts/api.ts). Everything is JSON; auth is a cookie set by
 * POST /api/auth/login. Streaming endpoints return NDJSON (one SessionEvent per line).
 */
import type {
  ActionItem,
  Language,
  Session,
  SessionEvent,
  SessionSnapshot,
  SessionStatus,
  Thought,
  TranscriptSegment,
} from "@/lib/contracts";
import type { HealthResponse } from "@/lib/contracts/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
  /** true for fetch failures (offline, DNS, aborted connection) — status 0. */
  get isNetwork() {
    return this.status === 0;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
}

type Listener = (err: ApiError | null) => void;
const listeners = new Set<Listener>();
/** Subscribe to connectivity signals: ApiError(status 0) on network failure, null on any success. */
export function onApiConnectivity(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function notify(err: ApiError | null) {
  for (const l of listeners) l(err);
}

export type StreamEndLine = { type: "stream.end" } | { type: "stream.error"; message: string };
export type NdjsonLine = SessionEvent | StreamEndLine;

async function parseError(res: Response): Promise<ApiError> {
  let message = `${res.status} ${res.statusText}`;
  let code: string | undefined;
  let details: unknown;
  try {
    const body = (await res.json()) as { error?: string; code?: string; message?: string; details?: unknown };
    message = body.error ?? body.message ?? message;
    code = body.code;
    details = body.details;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, message, code, details);
}

async function request<T>(path: string, init: RequestInit & { signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    const err = new ApiError(0, e instanceof Error ? e.message : "Network error", "network");
    notify(err);
    throw err;
  }
  if (!res.ok) {
    const err = await parseError(res);
    // 5xx counts as a backend problem but the network is up
    notify(null);
    throw err;
  }
  notify(null);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Opens a streaming request and returns the raw Response (caller reads with readNdjson). */
async function openStream(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson, application/json" },
      body: JSON.stringify(body ?? {}),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    const err = new ApiError(0, e instanceof Error ? e.message : "Network error", "network");
    notify(err);
    throw err;
  }
  if (!res.ok) throw await parseError(res);
  notify(null);
  return res;
}

/**
 * Reads an NDJSON body line by line. Calls onEvent for every parsed object.
 * Resolves when the stream ends; rejects on `stream.error`, abort, or malformed body.
 * Blank lines are ignored. A `stream.end` line terminates the read.
 */
export async function readNdjson<T = NdjsonLine>(
  res: Response,
  onEvent: (line: T) => void,
  opts: { signal?: AbortSignal } = {},
): Promise<void> {
  if (!res.body) throw new ApiError(res.status, "Response has no body", "no_body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const abort = () => {
    reader.cancel().catch(() => undefined);
  };
  opts.signal?.addEventListener("abort", abort, { once: true });

  const handleLine = (raw: string): boolean => {
    const line = raw.trim();
    if (!line) return false;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new ApiError(res.status, `Malformed NDJSON line: ${line.slice(0, 80)}`, "bad_ndjson");
    }
    const obj = parsed as { type?: string; message?: string };
    if (obj.type === "stream.end") return true;
    if (obj.type === "stream.error") throw new ApiError(res.status, obj.message ?? "Stream error", "stream_error");
    onEvent(parsed as T);
    return false;
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (handleLine(raw)) return;
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) handleLine(buffer);
  } finally {
    opts.signal?.removeEventListener("abort", abort);
  }
}

// ---------- Request bodies ----------

export type SegmentInput = {
  id: string;
  startedMs: number;
  endedMs: number;
  rawText: string;
  language?: Language;
  isFinal: boolean;
  provider: string;
  confidence?: number | null;
};

export type SearchResult = {
  sessionId: string;
  sessionTitle: string;
  kind: string;
  id: string;
  text: string;
  atMs: number | null;
  createdAt: string;
};

export type SpeechTokenResponse = { token: string; expiresAt: string };

// ---------- Client ----------

export const api = {
  health: (signal?: AbortSignal) => request<HealthResponse>("/api/health", { signal }),

  auth: {
    login: (passphrase: string) =>
      request<void>("/api/auth/login", { method: "POST", body: JSON.stringify({ passphrase }) }),
  },

  sessions: {
    list: (q?: string, signal?: AbortSignal) =>
      request<{ sessions: Session[] }>(`/api/sessions${q ? `?q=${encodeURIComponent(q)}` : ""}`, { signal }),
    create: (body: { title?: string; languageHint?: string } = {}) =>
      request<{ session: Session }>("/api/sessions", { method: "POST", body: JSON.stringify(body) }),
    get: (id: string, signal?: AbortSignal) => request<{ session: Session }>(`/api/sessions/${id}`, { signal }),
    update: (
      id: string,
      body: { title?: string; status?: SessionStatus; durationMs?: number; languageHint?: string | null },
    ) =>
      request<{ session: Session; events: SessionEvent[] }>(`/api/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: string) => request<void>(`/api/sessions/${id}`, { method: "DELETE" }),
    snapshot: (id: string, signal?: AbortSignal) =>
      request<SessionSnapshot>(`/api/sessions/${id}/snapshot`, { signal }),
    events: (id: string, since = 0, signal?: AbortSignal) =>
      request<{ events: SessionEvent[] }>(`/api/sessions/${id}/events?since=${since}`, { signal }),
    exportUrl: (id: string, format: "json" | "md") => `/api/sessions/${id}/export?format=${format}`,
  },

  segments: {
    append: (sessionId: string, segments: SegmentInput[], signal?: AbortSignal) =>
      request<{ segments: TranscriptSegment[]; events: SessionEvent[] }>(`/api/sessions/${sessionId}/segments`, {
        method: "POST",
        body: JSON.stringify({ segments }),
        signal,
      }),
    update: (
      sessionId: string,
      segId: string,
      body: { rawText?: string; cleanedText?: string | null; language?: Language },
    ) =>
      request<{ segment: TranscriptSegment; events: SessionEvent[] }>(
        `/api/sessions/${sessionId}/segments/${segId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
  },

  /** NDJSON streams: open and read with readNdjson. */
  streams: {
    ingest: (sessionId: string, segmentIds: string[], signal?: AbortSignal) =>
      openStream(`/api/sessions/${sessionId}/ingest`, { segmentIds }, signal),
    render: (sessionId: string, sceneId: string, signal?: AbortSignal) =>
      openStream(`/api/sessions/${sessionId}/scenes/${sceneId}/render`, {}, signal),
    summary: (sessionId: string, signal?: AbortSignal) => openStream(`/api/sessions/${sessionId}/summary`, {}, signal),
  },

  actions: {
    update: (
      sessionId: string,
      actionId: string,
      body: {
        text?: string;
        status?: ActionItem["status"];
        priority?: ActionItem["priority"];
        dueDate?: string | null;
      },
    ) =>
      request<{ action: ActionItem; events: SessionEvent[] }>(`/api/sessions/${sessionId}/actions/${actionId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },

  thoughts: {
    update: (sessionId: string, thoughtId: string, body: { text?: string; status?: Thought["status"] }) =>
      request<{ thought: Thought; events: SessionEvent[] }>(`/api/sessions/${sessionId}/thoughts/${thoughtId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },

  assets: {
    url: (assetId: string) => `/api/assets/${assetId}`,
  },

  search: (q: string, signal?: AbortSignal) =>
    request<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`, { signal }),

  speech: {
    token: (provider: "soniox" | "deepgram") =>
      request<SpeechTokenResponse>("/api/speech/token", { method: "POST", body: JSON.stringify({ provider }) }),
  },
};

/** Convenience: run a streaming endpoint to completion, applying each SessionEvent. */
export async function runStream(
  open: () => Promise<Response>,
  onEvent: (e: SessionEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await open();
  await readNdjson<NdjsonLine>(
    res,
    (line) => {
      if (line.type === "stream.end" || line.type === "stream.error") return;
      onEvent(line);
    },
    { signal },
  );
}

export const isAbortError = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
