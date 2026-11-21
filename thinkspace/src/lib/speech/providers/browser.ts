/**
 * Web Speech API adapter (Chrome / Edge / Safari). Real, free, no key.
 * Recognizes one language at a time; mixed sentences may be imperfect (see D-05).
 */
import type { Language } from "@/lib/contracts/domain";
import type { SpeechProvider, SpeechStartOptions } from "@/lib/speech/types";
import { SpeechEmitter, baseOf, detectLanguage, segmentId } from "./base";

// Minimal typings for the (prefixed) Web Speech API — not in lib.dom.
interface WSRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface WSRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface WSRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: WSRecognitionErrorEvent) => void) | null;
  onresult: ((ev: WSRecognitionEvent) => void) | null;
  onspeechstart: ((ev: Event) => void) | null;
  onaudiostart: ((ev: Event) => void) | null;
}
type WSRecognitionCtor = new () => WSRecognition;

export function getSpeechRecognitionCtor(): WSRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: WSRecognitionCtor; webkitSpeechRecognition?: WSRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isBrowserSpeechSupported = () => getSpeechRecognitionCtor() !== null;

export class BrowserSpeechProvider extends SpeechEmitter implements SpeechProvider {
  readonly name = "browser" as const;
  readonly real = true;
  readonly supportsCodeSwitching = false;
  readonly description =
    "Built into Chrome/Edge/Safari. Free, no key. Recognizes one language at a time — pick Romanian or English; mixed sentences may be imperfect.";

  private rec: WSRecognition | null = null;
  private opts: SpeechStartOptions | null = null;
  private listening = false; // user intent: should we be running?
  private paused = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private restartAttempts = 0;
  private utteranceStartMs: number | null = null;
  private base: "ro" | "en" = "ro";

  // mic level
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;

  private now() {
    return Math.max(0, Math.round(performance.now() - (this.opts?.sessionStartedAt ?? performance.now())));
  }

  async start(opts: SpeechStartOptions): Promise<void> {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      this.setStatus("error", "Speech recognition is not available in this browser.");
      this.emit("error", "Speech recognition is not available in this browser. Use Chrome, Edge or Safari, or pick another provider.", false);
      throw new Error("web_speech_unavailable");
    }
    this.opts = opts;
    this.base = baseOf(opts.language);
    this.listening = true;
    this.paused = false;
    this.restartAttempts = 0;
    this.setStatus("requesting-mic");
    await this.openLevelMeter();
    this.setStatus("connecting");
    this.spawn(Ctor);
  }

  private spawn(Ctor: WSRecognitionCtor) {
    if (!this.listening || this.paused) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = this.opts?.language === "en-US" ? "en-US" : "ro-RO";

    rec.onstart = () => {
      this.restartAttempts = 0;
      this.setStatus("listening");
    };
    rec.onresult = (ev) => this.handleResult(ev);
    rec.onerror = (ev) => this.handleError(ev);
    rec.onend = () => {
      if (this.rec !== rec) return;
      this.rec = null;
      if (this.listening && !this.paused) {
        // Chrome stops after silence / ~60s. Restart with backoff.
        const delay = Math.min(4000, 250 * 2 ** Math.min(this.restartAttempts, 4));
        this.restartAttempts++;
        if (this.currentStatus !== "reconnecting") this.setStatus("reconnecting", "Recognizer stopped; restarting");
        this.restartTimer = setTimeout(() => {
          this.restartTimer = null;
          const C = getSpeechRecognitionCtor();
          if (C) this.spawn(C);
        }, delay);
      } else {
        this.setStatus(this.paused ? "paused" : "stopped");
      }
    };
    this.rec = rec;
    try {
      rec.start();
    } catch (e) {
      // "already started" races are harmless
      console.warn("[browser-speech] start failed", e);
    }
  }

  private handleResult(ev: WSRecognitionEvent) {
    const results = ev.results;
    let interim = "";
    for (let i = ev.resultIndex; i < results.length; i++) {
      const r = results[i];
      const alt = r[0];
      if (!alt) continue;
      const text = alt.transcript.trim();
      if (!text) continue;
      if (r.isFinal) {
        const endedMs = this.now();
        const startedMs = this.utteranceStartMs ?? Math.max(0, endedMs - Math.min(8000, text.length * 60));
        this.utteranceStartMs = null;
        const language: Language = detectLanguage(text, this.base);
        this.emit("final", {
          id: segmentId(),
          text,
          language,
          startedMs: Math.min(startedMs, endedMs),
          endedMs,
          confidence: typeof alt.confidence === "number" && alt.confidence > 0 ? Math.min(1, alt.confidence) : null,
        });
      } else {
        interim += (interim ? " " : "") + text;
      }
    }
    if (interim) {
      if (this.utteranceStartMs === null) this.utteranceStartMs = this.now();
      this.emit("partial", { text: interim, language: this.base, startedMs: this.utteranceStartMs });
    } else {
      this.emit("partial", { text: "", startedMs: this.now() });
    }
  }

  private handleError(ev: WSRecognitionErrorEvent) {
    switch (ev.error) {
      case "not-allowed":
      case "service-not-allowed":
        this.listening = false;
        this.setStatus("error", "Microphone access was denied.");
        this.emit("error", "Microphone access is blocked. Allow the microphone for this site in your browser and press Start again.", false);
        break;
      case "audio-capture":
        this.listening = false;
        this.setStatus("error", "No microphone found.");
        this.emit("error", "No microphone was found. Connect one or use 'Type a thought'.", false);
        break;
      case "network":
        this.setStatus("reconnecting", "Network error; reconnecting");
        this.emit("error", "Speech service network error — reconnecting.", true);
        break;
      case "no-speech":
      case "aborted":
        // benign; onend will restart
        break;
      case "language-not-supported":
        this.listening = false;
        this.setStatus("error", "Language not supported.");
        this.emit("error", "This browser does not support the selected recognition language.", false);
        break;
      default:
        this.emit("error", `Speech recognition error: ${ev.error}`, true);
    }
  }

  pause(): void {
    if (!this.listening) return;
    this.paused = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const rec = this.rec;
    this.rec = null;
    try {
      rec?.stop();
    } catch {
      /* ignore */
    }
    this.emit("partial", { text: "", startedMs: this.now() });
    this.emit("level", 0);
    this.setStatus("paused");
  }

  resume(): void {
    if (!this.listening || !this.paused) return;
    this.paused = false;
    this.restartAttempts = 0;
    this.setStatus("connecting");
    const C = getSpeechRecognitionCtor();
    if (C) this.spawn(C);
  }

  async stop(): Promise<void> {
    this.listening = false;
    this.paused = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const rec = this.rec;
    this.rec = null;
    try {
      rec?.stop();
    } catch {
      /* ignore */
    }
    this.closeLevelMeter();
    this.emit("partial", { text: "", startedMs: this.now() });
    this.setStatus("stopped");
  }

  // ----- mic level meter (getUserMedia + AnalyserNode) -----
  private async openLevelMeter() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioCtx = new AudioContext();
      const src = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      src.connect(this.analyser);
      const data = new Uint8Array(this.analyser.fftSize);
      this.levelTimer = setInterval(() => {
        if (!this.analyser || this.paused) return;
        this.analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        this.emit("level", Math.min(1, Math.sqrt(sum / data.length) * 4));
      }, 80);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        this.listening = false;
        this.setStatus("error", "Microphone access was denied.");
        this.emit("error", "Microphone access is blocked. Allow the microphone for this site in your browser and press Start again.", false);
        throw e;
      }
      // Level meter is optional; recognition can still run.
      console.warn("[browser-speech] level meter unavailable", e);
    }
  }

  private closeLevelMeter() {
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.levelTimer = null;
    this.analyser = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = null;
    this.emit("level", 0);
  }
}
