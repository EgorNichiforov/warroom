/**
 * "Cloud" speech provider: records the microphone, cuts at natural pauses (voice activity
 * detection on the input level), and sends each utterance to the server, which transcribes it
 * with Gemini (Romanian, English, or both mixed). Works in every modern browser that has
 * MediaRecorder (Chrome, Edge, Firefox, Safari, mobile included); no vendor key in the browser.
 */
import type { Language } from "@/lib/contracts/domain";
import type { SpeechProvider, SpeechStartOptions } from "@/lib/speech/types";
import { SpeechEmitter, segmentId } from "./base";

const TICK_MS = 50;
const SILENCE_TO_CUT_MS = 900; // pause length that ends an utterance
const MAX_UTTERANCE_MS = 20_000; // force a cut on long monologues
const MIN_VOICED_MS = 250; // ignore clicks / breaths
const IDLE_RESET_MS = 15_000; // drop long silent recordings so clips stay small

export function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/ogg;codecs=opus"]) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return "";
}

export const isCloudSpeechSupported = () =>
  typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

type Clip = { blob: Blob; mime: string; startedMs: number; endedMs: number };

export class CloudSpeechProvider extends SpeechEmitter implements SpeechProvider {
  readonly name = "cloud" as const;
  readonly real = true;
  readonly supportsCodeSwitching = true;
  readonly description =
    "Records your voice and transcribes each phrase on the server with Gemini. Understands Romanian and English in the same sentence. Works in any modern browser.";

  private opts: SpeechStartOptions | null = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mime = "";
  private running = false;
  private paused = false;

  // VAD state for the current recording window
  private noiseFloor = 0.01;
  private voicedMs = 0;
  private lastVoiceAt = 0;
  private windowStartedAt = 0;
  private utteranceStartAt: number | null = null;

  private queue: Promise<void> = Promise.resolve();
  private pending = 0;

  private sessionMs(at = performance.now()) {
    return Math.max(0, Math.round(at - (this.opts?.sessionStartedAt ?? at)));
  }

  async start(opts: SpeechStartOptions): Promise<void> {
    if (!opts.transcribe) throw new Error("cloud speech requires a transcribe() function");
    if (!isCloudSpeechSupported()) {
      this.setStatus("error", "Recording is not supported in this browser.");
      this.emit("error", "This browser cannot record audio. Use a current Chrome, Edge, Firefox or Safari.", false);
      throw new Error("media_recorder_unavailable");
    }
    this.opts = opts;
    this.setStatus("requesting-mic");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch (e) {
      this.setStatus("error", "Microphone access was denied.");
      this.emit("error", "Microphone access is blocked. Allow the microphone for this site (icon left of the address bar) and press Start again.", false);
      throw e;
    }
    this.mime = pickRecorderMime();
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => undefined);
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    src.connect(this.analyser);
    this.running = true;
    this.paused = false;
    this.startWindow();
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.setStatus("listening");
  }

  private startWindow() {
    if (!this.stream) return;
    this.chunks = [];
    this.voicedMs = 0;
    this.utteranceStartAt = null;
    this.windowStartedAt = performance.now();
    const rec = this.mime ? new MediaRecorder(this.stream, { mimeType: this.mime }) : new MediaRecorder(this.stream);
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) this.chunks.push(ev.data);
    };
    rec.start(250);
    this.recorder = rec;
  }

  /** Stop the current recorder and resolve with its audio (or null if nothing worth sending). */
  private cutWindow(send: boolean): Promise<Clip | null> {
    const rec = this.recorder;
    this.recorder = null;
    if (!rec) return Promise.resolve(null);
    const voiced = this.voicedMs;
    const startedAt = this.utteranceStartAt ?? this.windowStartedAt;
    const endedAt = performance.now();
    const chunks = this.chunks;
    return new Promise((resolve) => {
      rec.onstop = () => {
        if (!send || voiced < MIN_VOICED_MS || !chunks.length) return resolve(null);
        const type = rec.mimeType || this.mime || "audio/webm";
        resolve({ blob: new Blob(chunks, { type }), mime: type, startedMs: this.sessionMs(startedAt), endedMs: this.sessionMs(endedAt) });
      };
      try {
        rec.stop();
      } catch {
        resolve(null);
      }
    });
  }

  private tick() {
    if (!this.running || this.paused || !this.analyser) return;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const rms = Math.sqrt(sum / buf.length);
    this.emit("level", Math.min(1, rms * 8));
    const now = performance.now();
    const threshold = Math.max(0.012, this.noiseFloor * 2.5);
    const voiced = rms > threshold;
    if (!voiced) this.noiseFloor = this.noiseFloor * 0.98 + rms * 0.02; // track background noise
    if (voiced) {
      this.voicedMs += TICK_MS;
      this.lastVoiceAt = now;
      if (this.utteranceStartAt === null) {
        this.utteranceStartAt = now;
      }
      if (this.voicedMs >= MIN_VOICED_MS) this.emit("partial", { text: "…", startedMs: this.sessionMs(this.utteranceStartAt) });
    }
    const inUtterance = this.utteranceStartAt !== null && this.voicedMs >= MIN_VOICED_MS;
    const longPause = now - this.lastVoiceAt >= SILENCE_TO_CUT_MS;
    const tooLong = this.utteranceStartAt !== null && now - this.utteranceStartAt >= MAX_UTTERANCE_MS;
    if (inUtterance && (longPause || tooLong)) {
      void this.finishUtterance(true);
    } else if (!inUtterance && now - this.windowStartedAt >= IDLE_RESET_MS) {
      // only silence / noise so far: restart the recording to keep clips short
      void this.cutWindow(false);
      this.startWindow();
    }
  }

  private async finishUtterance(restart: boolean) {
    const clipP = this.cutWindow(true);
    if (restart && this.running && !this.paused) this.startWindow();
    const clip = await clipP;
    if (clip) this.enqueue(clip);
  }

  /** Transcribe clips one after another so finals arrive in speaking order. */
  private enqueue(clip: Clip) {
    this.pending++;
    this.emit("partial", { text: "(transcribing…)", startedMs: clip.startedMs });
    this.queue = this.queue.then(async () => {
      try {
        const r = await this.opts!.transcribe!(clip.blob, clip.mime);
        const text = r.text.trim();
        if (text) {
          this.emit("final", {
            id: segmentId(),
            text,
            language: (r.language as Language) ?? "unknown",
            startedMs: clip.startedMs,
            endedMs: Math.max(clip.endedMs, clip.startedMs),
            confidence: null,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Transcription failed";
        this.emit("error", `Could not transcribe what you said at ${fmt(clip.startedMs)}: ${msg}`, true);
      } finally {
        this.pending--;
        if (this.pending === 0) this.emit("partial", { text: "", startedMs: this.sessionMs() });
      }
    });
  }

  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    void this.finishUtterance(false);
    this.emit("level", 0);
    this.setStatus("paused");
  }

  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastVoiceAt = 0;
    this.startWindow();
    this.setStatus("listening");
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.running && !this.paused) await this.finishUtterance(false);
    else await this.cutWindow(false);
    this.running = false;
    await this.queue.catch(() => undefined);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    await this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.analyser = null;
    this.emit("level", 0);
    this.setStatus("stopped");
  }
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
