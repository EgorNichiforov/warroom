/**
 * Deepgram Nova-3 multilingual (code-switching) streaming adapter.
 *
 * Implemented against the official docs (https://developers.deepgram.com/docs/multilingual-code-switching);
 * NOT exercised in the build environment (api.deepgram.com is blocked there).
 *
 * Browser WebSockets cannot set headers, so auth uses a short-lived grant token minted by
 * POST /api/speech/token (server calls /v1/auth/grant). The grant token is a JWT and is sent
 * as the WebSocket subprotocol ["bearer", accessToken]; if that handshake is rejected (401),
 * we retry once with the token as the `access_token` query parameter.
 */
import type { Language } from "@/lib/contracts/domain";
import { PcmCapture } from "@/lib/speech/pcm-capture";
import type { SpeechProvider, SpeechStartOptions } from "@/lib/speech/types";
import { SpeechEmitter, segmentId } from "./base";
import { majorityLanguage } from "./soniox";

const DG_BASE = "wss://api.deepgram.com/v1/listen";
const DG_PARAMS = {
  model: "nova-3",
  language: "multi",
  encoding: "linear16",
  sample_rate: "16000",
  channels: "1",
  interim_results: "true",
  smart_format: "true",
  endpointing: "800",
  utterance_end_ms: "1500",
  punctuate: "true",
};
const KEEPALIVE_MS = 8000;
const MAX_RECONNECTS = 5;

type DgWord = { word: string; start: number; end: number; confidence: number; language?: string; punctuated_word?: string };
type DgResults = {
  type: "Results";
  is_final: boolean;
  speech_final: boolean;
  start: number;
  duration: number;
  channel: { alternatives: { transcript: string; confidence: number; words: DgWord[]; languages?: string[] }[] };
};
type DgMessage = DgResults | { type: "UtteranceEnd"; last_word_end: number } | { type: "Metadata" } | { type: "Error"; description?: string; message?: string };

function buildUrl(token: string | null) {
  const u = new URL(DG_BASE);
  for (const [k, v] of Object.entries(DG_PARAMS)) u.searchParams.set(k, v);
  if (token) u.searchParams.set("access_token", token);
  return u.toString();
}

export class DeepgramSpeechProvider extends SpeechEmitter implements SpeechProvider {
  readonly name = "deepgram" as const;
  readonly real = true;
  readonly supportsCodeSwitching = true;
  readonly description = "Deepgram Nova-3 multilingual streaming. Handles Romanian/English code-switching. Requires a server-side key.";

  private ws: WebSocket | null = null;
  private capture: PcmCapture | null = null;
  private opts: SpeechStartOptions | null = null;
  private listening = false;
  private paused = false;
  private stopping = false;
  private reconnects = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  private useQueryAuth = false;
  private openedOnce = false;

  // utterance accumulation
  private finals: { text: string; languages: string[]; confidence: number }[] = [];
  private utteranceStartMs: number | null = null;
  private audioOrigin = 0;

  private sessionNow() {
    return Math.max(0, Math.round(performance.now() - (this.opts?.sessionStartedAt ?? performance.now())));
  }
  private secToSession(sec: number) {
    return Math.max(0, Math.round(this.audioOrigin - (this.opts?.sessionStartedAt ?? 0) + sec * 1000));
  }

  async start(opts: SpeechStartOptions): Promise<void> {
    if (!opts.getToken) throw new Error("deepgram requires getToken");
    this.opts = opts;
    this.listening = true;
    this.paused = false;
    this.stopping = false;
    this.reconnects = 0;
    this.setStatus("requesting-mic");
    this.capture = new PcmCapture({
      onFrame: (pcm) => {
        if (this.paused) return;
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(pcm);
      },
      onLevel: (rms) => this.emit("level", rms),
    });
    try {
      await this.capture.start();
    } catch (e) {
      this.listening = false;
      this.setStatus("error", "Microphone access was denied.");
      this.emit("error", "Microphone access is blocked. Allow the microphone for this site and press Start again.", false);
      throw e;
    }
    await this.connect();
  }

  private async connect(): Promise<void> {
    if (!this.listening || !this.opts?.getToken) return;
    this.setStatus(this.reconnects > 0 ? "reconnecting" : "connecting");
    let token: string;
    try {
      token = (await this.opts.getToken()).token;
    } catch (e) {
      this.emit("error", e instanceof Error ? e.message : "Could not obtain a Deepgram token.", false);
      this.setStatus("error", "Token unavailable");
      this.listening = false;
      return;
    }
    const ws = this.useQueryAuth ? new WebSocket(buildUrl(token)) : new WebSocket(buildUrl(null), ["bearer", token]);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    this.openedOnce = false;

    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.openedOnce = true;
      this.audioOrigin = performance.now();
      this.reconnects = 0;
      this.setStatus("listening");
      this.keepAlive = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "KeepAlive" }));
      }, KEEPALIVE_MS);
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      let msg: DgMessage;
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (msg.type === "Results") this.handleResults(msg);
      else if (msg.type === "UtteranceEnd") this.flushFinal();
      else if (msg.type === "Error") this.emit("error", `Deepgram: ${msg.description ?? msg.message ?? "error"}`, true);
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.keepAlive) clearInterval(this.keepAlive);
      this.keepAlive = null;
      if (!this.listening || this.stopping) return;
      // Handshake rejected (likely 401 on subprotocol auth): retry once with query-param auth.
      if (!this.openedOnce && !this.useQueryAuth) {
        this.useQueryAuth = true;
        void this.connect();
        return;
      }
      if (this.reconnects >= MAX_RECONNECTS) {
        this.setStatus("error", "Connection lost");
        this.emit("error", `Deepgram connection closed (${ev.code}). Giving up after ${MAX_RECONNECTS} attempts.`, false);
        this.listening = false;
        return;
      }
      this.reconnects++;
      this.setStatus("reconnecting", `Reconnecting (${this.reconnects}/${MAX_RECONNECTS})`);
      this.emit("error", `Deepgram connection closed (${ev.code}); reconnecting.`, true);
      this.reconnectTimer = setTimeout(() => void this.connect(), Math.min(8000, 500 * 2 ** this.reconnects));
    };
  }

  private handleResults(msg: DgResults) {
    const alt = msg.channel?.alternatives?.[0];
    if (!alt) return;
    const transcript = alt.transcript?.trim() ?? "";
    const langs = alt.words?.map((w) => w.language ?? "").filter(Boolean) ?? alt.languages ?? [];
    if (this.utteranceStartMs === null && (transcript || this.finals.length)) this.utteranceStartMs = this.secToSession(msg.start);
    if (msg.is_final) {
      if (transcript) this.finals.push({ text: transcript, languages: langs, confidence: alt.confidence ?? 0 });
      if (msg.speech_final) {
        this.flushFinal(this.secToSession(msg.start + msg.duration));
        return;
      }
    }
    const accumulated = [...this.finals.map((f) => f.text), msg.is_final ? "" : transcript].filter(Boolean).join(" ");
    if (accumulated) {
      this.emit("partial", {
        text: accumulated,
        language: majorityLanguage([...this.finals.flatMap((f) => f.languages), ...langs]),
        startedMs: this.utteranceStartMs ?? this.sessionNow(),
      });
    }
  }

  private flushFinal(endedMs?: number) {
    const text = this.finals.map((f) => f.text).join(" ").trim();
    if (!text) return;
    const langs = this.finals.flatMap((f) => f.languages);
    const conf = this.finals.reduce((a, f) => a + f.confidence, 0) / this.finals.length;
    const language: Language = majorityLanguage(langs);
    this.emit("final", {
      id: segmentId(),
      text,
      language,
      startedMs: this.utteranceStartMs ?? this.sessionNow(),
      endedMs: endedMs ?? this.sessionNow(),
      confidence: Number.isFinite(conf) && conf > 0 ? Math.min(1, conf) : null,
    });
    this.finals = [];
    this.utteranceStartMs = null;
    this.emit("partial", { text: "", startedMs: this.sessionNow() });
  }

  pause(): void {
    if (!this.listening) return;
    this.paused = true;
    this.capture?.pause();
    this.flushFinal();
    this.setStatus("paused");
  }

  resume(): void {
    if (!this.listening) return;
    this.paused = false;
    this.capture?.resume();
    if (this.ws?.readyState === WebSocket.OPEN) this.setStatus("listening");
    else if (!this.ws && !this.reconnectTimer) void this.connect();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.listening = false;
    this.paused = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.keepAlive = null;
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "CloseStream" }));
      } catch {
        /* ignore */
      }
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        ws.addEventListener("close", done, { once: true });
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string) as DgMessage;
            if (msg.type === "Results") this.handleResults(msg);
          } catch {
            /* ignore */
          }
        };
        setTimeout(done, 1500);
      });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    } else {
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    }
    this.flushFinal();
    await this.capture?.stop();
    this.capture = null;
    this.emit("level", 0);
    this.setStatus("stopped");
  }
}
