/**
 * Scripted demo speech (simulated — no microphone). Replays a script by "typing"
 * partials (~40 ms per character) and then emitting a final per line.
 * `say(text, language)` feeds extra lines at runtime (used by tests and the demo).
 */
import type { Language } from "@/lib/contracts/domain";
import { DEMO_SCRIPT } from "@/lib/demo/script";
import type { SpeechProvider, SpeechStartOptions } from "@/lib/speech/types";
import { SpeechEmitter, segmentId } from "./base";

type Line = { text: string; language: Language; delayMs?: number };

export type MockSpeechOptions = {
  /** ms per character while typing partials (default 40) */
  charMs?: number;
  /** pause between lines (default 1200) */
  lineGapMs?: number;
  /** replay the default demo script when no script is passed (default true) */
  autoplay?: boolean;
};

export class MockSpeechProvider extends SpeechEmitter implements SpeechProvider {
  readonly name = "mock" as const;
  readonly real = false;
  readonly supportsCodeSwitching = true;
  readonly description = "Scripted demo speech (simulated — no microphone)";

  private queue: Line[] = [];
  private opts: SpeechStartOptions | null = null;
  private running = false;
  private paused = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private wake: (() => void) | null = null;
  private charMs: number;
  private lineGapMs: number;
  private autoplay: boolean;
  private levelTimer: ReturnType<typeof setInterval> | null = null;
  private speaking = false;

  constructor(options: MockSpeechOptions = {}) {
    super();
    this.charMs = options.charMs ?? 40;
    this.lineGapMs = options.lineGapMs ?? 1200;
    this.autoplay = options.autoplay ?? true;
  }

  private now() {
    return Math.max(0, Math.round(performance.now() - (this.opts?.sessionStartedAt ?? performance.now())));
  }

  async start(opts: SpeechStartOptions): Promise<void> {
    this.opts = opts;
    this.running = true;
    this.paused = false;
    const script = opts.script ?? (this.autoplay ? DEMO_SCRIPT : []);
    this.queue.push(...script.map((l) => ({ text: l.text, language: l.language, delayMs: l.delayMs })));
    this.setStatus("connecting");
    this.levelTimer = setInterval(() => {
      if (!this.running || this.paused) return this.emit("level", 0);
      this.emit("level", this.speaking ? 0.25 + Math.random() * 0.45 : 0.02 + Math.random() * 0.04);
    }, 100);
    this.setStatus("listening");
    void this.loop();
  }

  /** Feed a line at runtime; it plays after the current queue. */
  say(text: string, language: Language = "unknown", delayMs?: number) {
    this.queue.push({ text, language, delayMs });
    this.wake?.();
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      this.timer = setTimeout(() => {
        this.timer = null;
        resolve();
      }, ms);
    });
  }

  private waitForWork() {
    return new Promise<void>((resolve) => {
      this.wake = () => {
        this.wake = null;
        resolve();
      };
    });
  }

  private async waitWhilePaused() {
    while (this.paused && this.running) await this.sleep(100);
  }

  private async loop() {
    while (this.running) {
      await this.waitWhilePaused();
      if (!this.running) return;
      const line = this.queue.shift();
      if (!line) {
        await this.waitForWork();
        continue;
      }
      await this.sleep(line.delayMs ?? this.lineGapMs);
      await this.waitWhilePaused();
      if (!this.running) return;
      const startedMs = this.now();
      this.speaking = true;
      const words = line.text.split(" ");
      let typed = "";
      for (const w of words) {
        if (!this.running) return;
        await this.waitWhilePaused();
        typed = typed ? `${typed} ${w}` : w;
        this.emit("partial", { text: typed, language: line.language, startedMs });
        await this.sleep(Math.max(40, (w.length + 1) * this.charMs));
      }
      this.speaking = false;
      if (!this.running) return;
      this.emit("partial", { text: "", startedMs });
      this.emit("final", {
        id: segmentId(),
        text: line.text,
        language: line.language,
        startedMs,
        endedMs: this.now(),
        confidence: 0.96,
      });
    }
  }

  pause(): void {
    if (!this.running) return;
    this.paused = true;
    this.setStatus("paused");
  }

  resume(): void {
    if (!this.running) return;
    this.paused = false;
    this.setStatus("listening");
  }

  async stop(): Promise<void> {
    this.running = false;
    this.paused = false;
    this.queue = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.levelTimer = null;
    this.wake?.();
    this.emit("partial", { text: "", startedMs: this.now() });
    this.emit("level", 0);
    this.setStatus("stopped");
  }
}
