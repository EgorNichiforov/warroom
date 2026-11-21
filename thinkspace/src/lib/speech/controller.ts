/**
 * ThinkingController — glue between a SpeechProvider, the session store and the API.
 *
 *  speech partial  → store.livePartial (one live row)
 *  speech final    → store.addLocalSegment + save queue (POST segments; batch ≤10, flush every 800 ms,
 *                    retried with backoff while offline, never dropped)
 *  saved finals    → ingest scheduling (D-13): POST ingest when ≥2 finals are pending, or 2.5 s after the
 *                    first pending final, or on pause/stop (typed thoughts: immediately). One ingest at a
 *                    time; events applied as streamed. Ingests that fail for network reasons are re-queued
 *                    automatically when connectivity returns.
 *  after ingest    → request renders for planned photo/illustration/metaphor scenes (1 at a time).
 *
 * Survives provider switching mid-session: queues are independent of the provider instance.
 */
import { isBrowserSpeechSupported } from "@/lib/speech/providers/browser";
import { ApiError, api, isAbortError, onApiConnectivity, runStream } from "@/lib/api";
import type { SegmentInput } from "@/lib/api";
import type { Language, Scene, SessionEvent, TranscriptSegment } from "@/lib/contracts";
import { newId } from "@/lib/ids";
import { formatClock, useSessionStore } from "@/store/session-store";
import { createSpeechProvider } from "./index";
import type { FinalTranscript, PartialTranscript, SpeechProvider, SpeechProviderName, SpeechStartOptions } from "./types";

const FLUSH_MS = 800;
const BATCH_MAX = 10;
const INGEST_MIN_SEGMENTS = 2;
const INGEST_WINDOW_MS = 2500;
const DURATION_PATCH_MS = 15000;
const RENDERABLE_KINDS = new Set<Scene["kind"]>(["photo", "illustration", "metaphor"]);

export type ControllerOptions = {
  provider: SpeechProviderName;
  language: SpeechStartOptions["language"];
};

type QueueItem = SegmentInput & { urgent?: boolean };

export class ThinkingController {
  readonly sessionId: string;
  private provider: SpeechProvider | null = null;
  private providerUnsubs: (() => void)[] = [];
  private providerName: SpeechProviderName = "browser";
  private language: SpeechStartOptions["language"] = "auto";
  private disposed = false;

  // clock mapping for provider timestamps
  private sessionStartedAt = 0; // performance.now() origin given to the provider
  private pauseAccumMs = 0;
  private pausedAt: number | null = null;

  // save queue
  private unsent: QueueItem[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private saveBackoff = 0;

  // ingest
  private pendingIngest: string[] = [];
  private urgentIngest = new Set<string>();
  private firstPendingAt: number | null = null;
  private ingestTimer: ReturnType<typeof setTimeout> | null = null;
  private ingesting = false;
  private ingestAbort: AbortController | null = null;

  // segment ids whose ingest failed because of the network; re-queued on reconnect
  private networkFailedIngest = new Set<string>();
  private autoTitled = false;

  // render
  private renderRequested = new Set<string>();
  private rendering = false;

  // duration patch
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private lastPatchedDuration = -1;

  private offlineListeners: (() => void)[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  private get store() {
    return useSessionStore.getState();
  }

  // ---------------- lifecycle ----------------

  /** Attach connectivity listeners; returns dispose. Re-attachable (React StrictMode runs effects twice). */
  attach() {
    this.disposed = false;
    for (const u of this.offlineListeners) u();
    this.offlineListeners = [];
    if (typeof window !== "undefined") {
      const on = () => this.onReconnect();
      const off = () => this.store.setConnection("offline");
      window.addEventListener("online", on);
      window.addEventListener("offline", off);
      if (!navigator.onLine) off();
      this.offlineListeners.push(
        () => window.removeEventListener("online", on),
        () => window.removeEventListener("offline", off),
        onApiConnectivity((err) => {
          if (err) this.store.setConnection("offline");
          else if (this.store.connection === "offline") this.onReconnect();
        }),
      );
    }
    return () => this.dispose();
  }

  /** Connectivity is back: flush unsaved segments and re-ingest everything that failed while offline. */
  private onReconnect() {
    this.store.setConnection("online");
    this.saveBackoff = 0;
    this.scheduleFlush(0);
    this.reingestFailed();
  }

  /** Re-queue every final segment whose ingest failed for network reasons (and any saved-but-never-ingested one). */
  private reingestFailed() {
    const ids = new Set(this.networkFailedIngest);
    this.networkFailedIngest.clear();
    const s = this.store;
    for (const seg of Object.values(s.segments)) {
      if (seg.isFinal && seg.ingestedAt === null && seg.seq > 0 && !this.unsent.some((u) => u.id === seg.id) && !this.pendingIngest.includes(seg.id)) {
        // only segments we know were never processed and are not waiting on an engine.error retry
        if (ids.has(seg.id) || !s.errors.some((e) => !e.dismissed && e.segmentIds?.includes(seg.id))) ids.add(seg.id);
      }
    }
    if (ids.size) this.queueIngest(Array.from(ids), true);
  }

  async dispose() {
    this.disposed = true;
    for (const u of this.offlineListeners) u();
    this.offlineListeners = [];
    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.ingestTimer) clearTimeout(this.ingestTimer);
    if (this.durationTimer) clearInterval(this.durationTimer);
    this.ingestAbort?.abort();
    await this.teardownProvider();
    this.store.stopClock();
  }

  get isListening() {
    return this.store.thinking === "listening";
  }

  /** Start thinking: explicit user action only (D-14). */
  async start(opts: ControllerOptions) {
    const s = this.store;
    this.providerName = opts.provider;
    this.language = opts.language;
    s.setSpeechProvider(opts.provider);
    s.setSpeechLanguage(opts.language);
    s.setThinking("listening");
    if (s.session && s.session.status !== "active") {
      void this.patchSession({ status: "active" });
    }
    await this.startProvider();
    s.startClock();
    this.startDurationPatching();
  }

  pause() {
    const s = this.store;
    if (s.thinking !== "listening") return;
    this.provider?.pause();
    this.pausedAt = performance.now();
    s.setLivePartial(null);
    s.setMicLevel(0);
    s.setThinking("paused");
    s.stopClock();
    this.stopDurationPatching();
    void this.patchSession({ status: "paused", durationMs: this.store.durationMs });
    void this.flushNow().then(() => this.ingestNow());
  }

  async resume() {
    const s = this.store;
    if (s.thinking !== "paused") return;
    s.setThinking("listening");
    if (this.provider) {
      if (this.pausedAt !== null) this.pauseAccumMs += performance.now() - this.pausedAt;
      this.pausedAt = null;
      this.provider.resume();
    } else {
      await this.startProvider();
    }
    s.startClock();
    this.startDurationPatching();
    void this.patchSession({ status: "active" });
  }

  /**
   * Stop the session: stop the mic, flush & ingest everything pending, PATCH status/duration.
   * With `end` (default true) the session is marked ended and the summary is generated.
   */
  async stop(opts: { end?: boolean } = {}) {
    const end = opts.end ?? true;
    const s = this.store;
    s.setThinking("processing");
    await this.teardownProvider();
    s.setLivePartial(null);
    s.setMicLevel(0);
    s.stopClock();
    this.stopDurationPatching();
    await this.flushNow();
    await this.ingestNow();
    const durationMs = this.store.durationMs;
    if (end) {
      await this.patchSession({ status: "ended", durationMs });
      s.setThinking("ended");
      await this.runSummary();
    } else {
      await this.patchSession({ status: "paused", durationMs });
      s.setThinking("idle");
    }
  }

  /** Switch provider; while listening, swaps live; while paused/idle, takes effect on next start/resume. */
  async switchProvider(name: SpeechProviderName, language?: SpeechStartOptions["language"]) {
    this.providerName = name;
    if (language) this.language = language;
    this.store.setSpeechProvider(name);
    if (language) this.store.setSpeechLanguage(language);
    const wasListening = this.store.thinking === "listening";
    if (this.provider) await this.teardownProvider();
    if (wasListening) await this.startProvider();
  }

  setLanguage(language: SpeechStartOptions["language"]) {
    this.language = language;
    this.store.setSpeechLanguage(language);
  }

  // ---------------- provider wiring ----------------

  private async startProvider() {
    const s = this.store;
    const provider = createSpeechProvider(this.providerName);
    this.provider = provider;
    this.pauseAccumMs = 0;
    this.pausedAt = null;
    this.sessionStartedAt = performance.now() - s.durationMs;
    this.providerUnsubs = [
      provider.on("status", (status, detail) => {
        if (this.provider !== provider) return;
        s.setSpeechStatus(status, detail);
      }),
      provider.on("partial", (p) => {
        if (this.provider !== provider) return;
        this.onPartial(p);
      }),
      provider.on("final", (f) => {
        if (this.provider !== provider) return;
        this.onFinal(f, provider.name);
      }),
      provider.on("error", (message, recoverable) => {
        if (this.provider !== provider) return;
        s.pushError({ stage: "extract", message: `Speech: ${message}`, retryable: recoverable });
        if (!recoverable && this.store.thinking === "listening" && provider.name !== "browser" && provider.name !== "mock" && provider.name !== "cloud" && isBrowserSpeechSupported()) {
          // A paid provider failed for good (no credit, bad key, not configured): keep listening
          // with the free built-in recognizer instead of leaving the user talking to nothing.
          s.pushError({ stage: "extract", message: `Switched to the built-in browser recognizer because ${provider.name} is unavailable.`, retryable: false });
          void this.switchProvider("browser", this.language === "auto" ? "ro-RO" : this.language);
          return;
        }
        if (!recoverable && this.store.thinking === "listening") {
          // mic lost: keep the session, drop to paused so the user can switch provider
          this.store.setThinking("paused");
          this.store.stopClock();
          this.stopDurationPatching();
          this.pausedAt = performance.now();
          void this.teardownProvider();
        }
      }),
      provider.on("level", (rms) => {
        if (this.provider !== provider) return;
        s.setMicLevel(rms);
      }),
    ];
    const needsToken = provider.name === "soniox" || provider.name === "deepgram";
    const getToken = needsToken
      ? async () => {
          try {
            return await api.speech.token(provider.name as "soniox" | "deepgram");
          } catch (e) {
            if (e instanceof ApiError && (e.status === 501 || e.code === "not_configured"))
              throw new Error(`${provider.name} is not configured on the server (no API key). Pick another provider.`);
            throw e;
          }
        }
      : undefined;
    try {
      const sessionId = this.sessionId;
      const transcribe = provider.name === "cloud" ? (audio: Blob, mime: string) => api.speech.transcribe(sessionId, audio, mime) : undefined;
      await provider.start({ language: this.language, sessionStartedAt: this.sessionStartedAt, getToken, transcribe });
    } catch (e) {
      // provider already emitted a user-facing error
      await this.teardownProvider();
      this.store.setThinking(this.store.session?.status === "ended" ? "ended" : "idle");
      this.store.stopClock();
      throw e;
    }
  }

  private async teardownProvider() {
    const p = this.provider;
    this.provider = null;
    for (const u of this.providerUnsubs) u();
    this.providerUnsubs = [];
    if (p) {
      try {
        await p.stop();
      } catch {
        /* ignore */
      }
    }
    this.store.setSpeechStatus(this.store.thinking === "paused" ? "paused" : "stopped");
    this.store.setMicLevel(0);
  }

  /** Provider ms (relative to the origin we gave it) → session ms (pauses excluded). */
  private toSessionMs(ms: number) {
    const paused = this.pauseAccumMs + (this.pausedAt !== null ? performance.now() - this.pausedAt : 0);
    const v = Math.round(ms - paused);
    return Math.max(0, Math.min(v, this.store.durationMs + 1000));
  }

  private onPartial(p: PartialTranscript) {
    if (!p.text) {
      this.store.setLivePartial(null);
      return;
    }
    this.store.setLivePartial({ text: p.text, language: p.language, startedMs: this.toSessionMs(p.startedMs) });
  }

  private onFinal(f: FinalTranscript, providerName: string) {
    this.store.setLivePartial(null);
    const text = f.text.trim();
    if (!text) return;
    const startedMs = this.toSessionMs(f.startedMs);
    const endedMs = Math.max(startedMs, this.toSessionMs(f.endedMs));
    this.pushSegment({
      id: f.id,
      startedMs,
      endedMs,
      rawText: text,
      language: f.language,
      isFinal: true,
      provider: providerName,
      confidence: f.confidence,
    });
  }

  /** "Type a thought": a final segment with provider 'typed' and language 'unknown', ingested right away. */
  typeThought(text: string, language: Language = "unknown") {
    const t = text.trim();
    if (!t) return;
    const s = this.store;
    // session clock: while idle the clock is stopped, so typed thoughts advance it by a reading-time estimate
    const lastEnd = Object.values(s.segments).reduce((m, x) => Math.max(m, x.endedMs), 0);
    const startedMs = Math.max(s.durationMs, s.clockRunning ? 0 : lastEnd);
    const endedMs = s.clockRunning ? startedMs : startedMs + Math.max(1000, Math.min(15000, t.length * 50));
    if (!s.clockRunning) {
      s.setDuration(endedMs);
      void this.patchSession({ durationMs: endedMs });
    }
    this.pushSegment(
      { id: newId("seg"), startedMs, endedMs, rawText: t, language, isFinal: true, provider: "typed", confidence: null },
      { urgent: true },
    );
  }

  private pushSegment(input: SegmentInput, opts: { urgent?: boolean } = {}) {
    const s = this.store;
    const nowIso = new Date().toISOString();
    const local: TranscriptSegment = {
      id: input.id,
      sessionId: this.sessionId,
      seq: 0,
      startedMs: input.startedMs,
      endedMs: input.endedMs,
      rawText: input.rawText,
      cleanedText: null,
      translation: null,
      language: input.language ?? "unknown",
      isFinal: true,
      editedByUser: false,
      provider: input.provider,
      confidence: input.confidence ?? null,
      ingestedAt: null,
      createdAt: nowIso,
    };
    s.addLocalSegment(local);
    this.unsent.push({ ...input, urgent: opts.urgent });
    s.setSaveStatus("unsaved", this.unsent.length);
    this.scheduleFlush(opts.urgent ? 0 : FLUSH_MS);
  }

  // ---------------- save queue ----------------

  private scheduleFlush(delay: number) {
    if (this.flushTimer) {
      if (delay === 0) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      } else return;
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, delay);
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.disposed) return;
    if (this.unsent.length === 0) {
      this.store.setSaveStatus("saved", 0);
      return;
    }
    this.flushing = true;
    const batch = this.unsent.slice(0, BATCH_MAX);
    this.store.setSaveStatus("saving", this.unsent.length);
    try {
      const res = await api.segments.append(
        this.sessionId,
        batch.map((b) => ({ id: b.id, startedMs: b.startedMs, endedMs: b.endedMs, rawText: b.rawText, language: b.language, isFinal: b.isFinal, provider: b.provider, confidence: b.confidence })),
      );
      this.unsent = this.unsent.filter((x) => !batch.some((b) => b.id === x.id));
      const wasRetrying = this.saveBackoff > 0;
      this.saveBackoff = 0;
      if (this.store.connection === "offline") this.store.setConnection("online");
      for (const seg of res.segments) this.store.upsertSegment(seg);
      this.applyEvents(res.events);
      const saved = res.segments.length ? res.segments.map((x) => x.id) : batch.map((b) => b.id);
      const urgent = batch.some((b) => b.urgent);
      this.queueIngest(saved, urgent);
      this.store.setSaveStatus(this.unsent.length ? "unsaved" : "saved", this.unsent.length);
      this.flushing = false;
      if (this.unsent.length) this.scheduleFlush(0);
      else if (wasRetrying) this.reingestFailed();
    } catch (e) {
      this.flushing = false;
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429 && e.status !== 408) {
        // Not retryable (validation/auth) — surface, keep the text visible locally, drop from the queue.
        this.unsent = this.unsent.filter((x) => !batch.some((b) => b.id === x.id));
        this.store.pushError({ stage: "apply", message: `Could not save transcript: ${e.message}`, retryable: false });
        this.store.setSaveStatus(this.unsent.length ? "unsaved" : "saved", this.unsent.length);
        if (e.isUnauthorized) redirectToLogin();
        return;
      }
      // network / 5xx: retry with backoff, never drop
      if (e instanceof ApiError && e.isNetwork) this.store.setConnection("offline");
      this.saveBackoff = Math.min(10000, this.saveBackoff ? this.saveBackoff * 2 : 1000);
      this.store.setSaveStatus("unsaved", this.unsent.length);
      this.scheduleFlush(this.saveBackoff);
    }
  }

  /** Flush everything now (pause/stop). Waits for the queue to drain or a retry to be scheduled. */
  async flushNow(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    let guard = 0;
    while (this.unsent.length && guard++ < 6) {
      await this.flush();
      if (this.saveBackoff) break; // offline; the retry timer will handle it
    }
  }

  // ---------------- ingest ----------------

  private queueIngest(ids: string[], urgent: boolean) {
    const fresh = ids.filter((id) => !this.pendingIngest.includes(id));
    if (!fresh.length) return;
    this.pendingIngest.push(...fresh);
    if (urgent) for (const id of fresh) this.urgentIngest.add(id);
    if (this.firstPendingAt === null) this.firstPendingAt = performance.now();
    if (urgent || this.pendingIngest.length >= INGEST_MIN_SEGMENTS) {
      void this.runIngest();
      return;
    }
    if (!this.ingestTimer) {
      const wait = Math.max(0, INGEST_WINDOW_MS - (performance.now() - this.firstPendingAt));
      this.ingestTimer = setTimeout(() => {
        this.ingestTimer = null;
        void this.runIngest();
      }, wait);
    }
  }

  /** Ingest whatever is pending right now (pause/stop). Resolves when the ingest completes. */
  async ingestNow(): Promise<void> {
    if (this.ingestTimer) {
      clearTimeout(this.ingestTimer);
      this.ingestTimer = null;
    }
    await this.runIngest();
    // if another ingest was already running, wait for it and the follow-up
    while (this.ingesting) await new Promise((r) => setTimeout(r, 100));
  }

  private async runIngest(): Promise<void> {
    if (this.ingesting || this.disposed) return;
    if (!this.pendingIngest.length) return;
    if (this.ingestTimer) {
      clearTimeout(this.ingestTimer);
      this.ingestTimer = null;
    }
    const ids = this.pendingIngest.splice(0, 50);
    for (const id of ids) this.urgentIngest.delete(id);
    this.firstPendingAt = this.pendingIngest.length ? performance.now() : null;
    await this.ingest(ids);
    if (this.pendingIngest.length) {
      if (this.pendingIngest.length >= INGEST_MIN_SEGMENTS || [...this.urgentIngest].some((u) => this.pendingIngest.includes(u))) {
        void this.runIngest();
      } else if (!this.ingestTimer) {
        this.ingestTimer = setTimeout(() => {
          this.ingestTimer = null;
          void this.runIngest();
        }, INGEST_WINDOW_MS);
      }
    }
  }

  private async ingest(segmentIds: string[]) {
    const s = this.store;
    this.ingesting = true;
    const baseThinking = s.thinking;
    if (baseThinking === "idle" || baseThinking === "paused") s.setThinking("processing");
    this.ingestAbort = new AbortController();
    let sawError = false;
    try {
      await runStream(
        () => api.streams.ingest(this.sessionId, segmentIds, this.ingestAbort?.signal),
        (e) => {
          if (e.type === "engine.error") sawError = true;
          this.applyEvent(e);
        },
        this.ingestAbort.signal,
      );
    } catch (e) {
      if (!isAbortError(e)) {
        const network = (e instanceof ApiError && e.isNetwork) || (e instanceof TypeError && /fetch/i.test(e.message));
        if (network || this.store.connection === "offline") {
          // offline: no toast (the connection banner explains); re-ingested automatically on reconnect
          for (const id of segmentIds) this.networkFailedIngest.add(id);
          this.store.setConnection("offline");
        } else if (!sawError) {
          const first = segmentIds.map((id) => this.store.segments[id]).find(Boolean);
          const where = first ? ` for what you said at ${formatClock(first.startedMs)}` : "";
          const detail = e instanceof ApiError ? e.message : "the engine did not respond";
          s.pushError({ stage: "extract", message: `Understanding failed${where}: ${detail}`, retryable: true, segmentIds });
        }
        if (e instanceof ApiError && e.isUnauthorized) redirectToLogin();
      }
    } finally {
      this.ingesting = false;
      this.ingestAbort = null;
      const now = this.store.thinking;
      if (now === "processing") this.store.setThinking(baseThinking === "processing" ? "idle" : baseThinking);
    }
    void this.renderPlannedScenes();
  }

  /** Re-run ingest for segments after an engine.error. */
  retryIngest(segmentIds: string[]) {
    if (!segmentIds.length) return;
    this.queueIngest(segmentIds, true);
  }

  // ---------------- scenes ----------------

  /** set when the image provider reports it cannot work at all (e.g. no quota): stop auto-rendering */
  private imagesUnavailable = false;

  private async renderPlannedScenes() {
    if (this.rendering || this.disposed || this.imagesUnavailable) return;
    this.rendering = true;
    try {
      for (;;) {
        const next = Object.values(this.store.scenes).find(
          (sc) => sc.status === "planned" && RENDERABLE_KINDS.has(sc.kind) && !this.renderRequested.has(sc.id),
        );
        if (!next) break;
        this.renderRequested.add(next.id);
        await this.renderScene(next.id);
      }
    } finally {
      this.rendering = false;
    }
  }

  async renderScene(sceneId: string) {
    this.renderRequested.add(sceneId);
    try {
      await runStream(
        () => api.streams.render(this.sessionId, sceneId),
        (e) => {
          if (e.type === "engine.error" && e.payload.stage === "render" && !e.payload.retryable && /not available on this Gemini key/.test(e.payload.message)) {
            this.imagesUnavailable = true;
          }
          this.applyEvent(e);
        },
      );
    } catch (e) {
      if (!isAbortError(e)) {
        this.store.pushError({
          stage: "render",
          message: e instanceof ApiError ? e.message : "Scene render failed",
          retryable: true,
          sceneId,
        });
      }
    }
  }

  /** Manual retry for a failed scene. */
  retryRender(sceneId: string) {
    this.renderRequested.delete(sceneId);
    void this.renderScene(sceneId);
  }

  // ---------------- summary ----------------

  async runSummary() {
    const s = this.store;
    if (s.summaryRunning) return;
    s.setSummaryRunning(true);
    try {
      await runStream(
        () => api.streams.summary(this.sessionId),
        (e) => this.applyEvent(e),
      );
    } catch (e) {
      if (!isAbortError(e)) {
        s.pushError({ stage: "summary", message: e instanceof ApiError ? e.message : "Summary failed", retryable: true });
      }
    } finally {
      this.store.setSummaryRunning(false);
    }
  }

  // ---------------- session patches ----------------

  private async patchSession(body: { status?: "active" | "paused" | "ended"; durationMs?: number; title?: string }) {
    try {
      const res = await api.sessions.update(this.sessionId, body);
      this.store.setSession(res.session);
      this.applyEvents(res.events ?? []);
      if (body.durationMs !== undefined) this.lastPatchedDuration = body.durationMs;
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) redirectToLogin();
      // non-fatal; the next patch will carry the duration
    }
  }

  private startDurationPatching() {
    if (this.durationTimer) return;
    this.durationTimer = setInterval(() => {
      const d = this.store.durationMs;
      if (d !== this.lastPatchedDuration) void this.patchSession({ durationMs: d });
    }, DURATION_PATCH_MS);
  }

  private stopDurationPatching() {
    if (this.durationTimer) clearInterval(this.durationTimer);
    this.durationTimer = null;
  }

  // ---------------- helpers ----------------

  private applyEvent(e: SessionEvent) {
    this.store.applyEvent(e);
    if (e.type === "ingest.finished") this.maybeAutoTitle(e.payload.focus);
  }

  /** Give default-titled sessions a meaningful name from the first non-empty focus. */
  private maybeAutoTitle(focus: string) {
    if (this.autoTitled) return;
    const f = focus.trim();
    const current = this.store.session?.title ?? "";
    if (!f || !current.startsWith("Thinking session —")) return;
    this.autoTitled = true;
    let title = f.replace(/[.!?…]+$/, "");
    if (title.length > 80) {
      const cut = title.slice(0, 80);
      const sp = cut.lastIndexOf(" ");
      title = (sp > 40 ? cut.slice(0, sp) : cut).replace(/[,;:\s]+$/, "") + "…";
    }
    void this.patchSession({ title: title.slice(0, 80) });
  }

  /** Called after the snapshot is loaded: finish renders that were left planned (e.g. after a reload). */
  resumePendingWork() {
    void this.renderPlannedScenes();
  }
  private applyEvents(events: SessionEvent[]) {
    for (const e of events) this.applyEvent(e);
  }
}

export function redirectToLogin() {
  if (typeof window === "undefined") return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  // Hard navigation on purpose: this runs outside React (fetch queue), and the login page must reset client state.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (!window.location.pathname.startsWith("/login")) window.location.href = `/login?next=${next}`;
}
