/**
 * Soniox real-time STT adapter (native Romanian/English code-switching).
 *
 * Implemented against the official docs (https://soniox.com/docs/stt/rt/real-time-transcription);
 * NOT exercised in the build environment (stt-rt.soniox.com is blocked there).
 *
 * Protocol: WebSocket to wss://stt-rt.soniox.com/transcribe-websocket. First message is a
 * JSON config {api_key, model, audio_format, sample_rate, num_channels, language_hints,
 * enable_language_identification, enable_endpoint_detection}; then binary PCM16 LE 16 kHz
 * mono frames. Responses: {tokens:[{text,is_final,language,start_ms,end_ms}], error_code,
 * error_message, finished}. An empty binary frame flushes and ends the stream.
 */
import type { Language } from "@/lib/contracts/domain";
import { PcmCapture } from "@/lib/speech/pcm-capture";
import type { SpeechProvider, SpeechStartOptions } from "@/lib/speech/types";
import { SpeechEmitter, segmentId } from "./base";

const SONIOX_URL = "wss://stt-rt.soniox.com/transcribe-websocket";
const SONIOX_MODEL = "stt-rt-v5";
const MAX_RECONNECTS = 5;
const PAUSE_FINALIZE_MS = 1200;

type SonioxToken = { text: string; is_final: boolean; language?: string; start_ms?: number; end_ms?: number; confidence?: number };
type SonioxMessage = { tokens?: SonioxToken[]; error_code?: number; error_message?: string; finished?: boolean };

const SENTENCE_END = /[.!?…]\s*$/;

export function majorityLanguage(langs: string[]): Language {
  let ro = 0;
  let en = 0;
  for (const l of langs) {
    const base = l.toLowerCase().slice(0, 2);
    if (base === "ro") ro++;
    else if (base === "en") en++;
  }
  if (ro > 0 && en > 0) return "mixed";
  if (ro > 0) return "ro";
  if (en > 0) return "en";
  return "unknown";
}

export class SonioxSpeechProvider extends SpeechEmitter implements SpeechProvider {
  readonly name = "soniox" as const;
  readonly real = true;
  readonly supportsCodeSwitching = true;
  readonly description = "Soniox real-time streaming. Understands Romanian and English in the same sentence. Requires a server-side key.";

  private ws: WebSocket | null = null;
  private capture: PcmCapture | null = null;
  private opts: SpeechStartOptions | null = null;
  private listening = false;
  private paused = false;
  private reconnects = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopping = false;

  // accumulation state
  private finalTokens: SonioxToken[] = [];
  private nonFinalText = "";
  private utteranceStartMs: number | null = null;
  private lastFinalAt = 0;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  /** performance.now() when the socket started streaming audio: token ms are relative to it */
  private audioOrigin = 0;

  private sessionNow() {
    return Math.max(0, Math.round(performance.now() - (this.opts?.sessionStartedAt ?? performance.now())));
  }
  private tokenMsToSession(ms: number | undefined) {
    if (ms === undefined) return this.sessionNow();
    return Math.max(0, Math.round(this.audioOrigin - (this.opts?.sessionStartedAt ?? 0) + ms));
  }

  async start(opts: SpeechStartOptions): Promise<void> {
    if (!opts.getToken) throw new Error("soniox requires getToken");
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
      this.emit("error", e instanceof Error ? e.message : "Could not obtain a Soniox token.", false);
      this.setStatus("error", "Token unavailable");
      this.listening = false;
      return;
    }
    const ws = new WebSocket(SONIOX_URL);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      ws.send(
        JSON.stringify({
          api_key: token,
          model: SONIOX_MODEL,
          audio_format: "pcm_s16le",
          sample_rate: 16000,
          num_channels: 1,
          language_hints: ["ro", "en"],
          enable_language_identification: true,
          enable_endpoint_detection: true,
        }),
      );
      this.audioOrigin = performance.now();
      this.reconnects = 0;
      this.setStatus("listening");
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      let msg: SonioxMessage;
      try {
        msg = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer));
      } catch {
        return;
      }
      if (msg.error_code) {
        this.emit("error", `Soniox error ${msg.error_code}: ${msg.error_message ?? ""}`.trim(), true);
        return;
      }
      if (msg.tokens) this.handleTokens(msg.tokens);
      if (msg.finished) this.flushFinal();
    };
    ws.onerror = () => {
      // onclose follows; nothing else to do here
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (!this.listening || this.stopping) return;
      if (this.reconnects >= MAX_RECONNECTS) {
        this.setStatus("error", "Connection lost");
        this.emit("error", `Soniox connection closed (${ev.code}). Giving up after ${MAX_RECONNECTS} attempts.`, false);
        this.listening = false;
        return;
      }
      this.reconnects++;
      this.setStatus("reconnecting", `Reconnecting (${this.reconnects}/${MAX_RECONNECTS})`);
      this.emit("error", `Soniox connection closed (${ev.code}); reconnecting.`, true);
      this.reconnectTimer = setTimeout(() => void this.connect(), Math.min(8000, 500 * 2 ** this.reconnects));
    };
  }

  private handleTokens(tokens: SonioxToken[]) {
    let endpoint = false;
    let nonFinal = "";
    for (const t of tokens) {
      if (t.text === "<end>") {
        endpoint = true;
        continue;
      }
      if (t.text === "<fin>") continue;
      if (t.is_final) {
        if (this.utteranceStartMs === null) this.utteranceStartMs = this.tokenMsToSession(t.start_ms);
        this.finalTokens.push(t);
        this.lastFinalAt = performance.now();
      } else {
        nonFinal += t.text;
      }
    }
    this.nonFinalText = nonFinal;
    const finalText = this.finalTokens.map((t) => t.text).join("");
    const partial = (finalText + nonFinal).trim();
    if (partial) {
      if (this.utteranceStartMs === null) this.utteranceStartMs = this.sessionNow();
      this.emit("partial", {
        text: partial,
        language: majorityLanguage(this.finalTokens.map((t) => t.language ?? "")),
        startedMs: this.utteranceStartMs,
      });
    }
    if (endpoint || (this.finalTokens.length && SENTENCE_END.test(finalText) && !nonFinal)) {
      this.flushFinal();
    } else if (this.finalTokens.length) {
      if (this.pauseTimer) clearTimeout(this.pauseTimer);
      this.pauseTimer = setTimeout(() => {
        if (performance.now() - this.lastFinalAt >= PAUSE_FINALIZE_MS && !this.nonFinalText) this.flushFinal();
      }, PAUSE_FINALIZE_MS + 50);
    }
  }

  private flushFinal() {
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
    const text = this.finalTokens.map((t) => t.text).join("").trim();
    if (!text) return;
    const last = this.finalTokens[this.finalTokens.length - 1];
    const confs = this.finalTokens.map((t) => t.confidence).filter((c): c is number => typeof c === "number");
    this.emit("final", {
      id: segmentId(),
      text,
      language: majorityLanguage(this.finalTokens.map((t) => t.language ?? "")),
      startedMs: this.utteranceStartMs ?? this.sessionNow(),
      endedMs: this.tokenMsToSession(last?.end_ms),
      confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null,
    });
    this.finalTokens = [];
    this.nonFinalText = "";
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
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(new ArrayBuffer(0)); // flush
      } catch {
        /* ignore */
      }
      // give the server a moment to send trailing finals
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        ws.addEventListener("close", done, { once: true });
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string) as SonioxMessage;
            if (msg.tokens) this.handleTokens(msg.tokens);
            if (msg.finished) done();
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
