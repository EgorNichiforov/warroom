/**
 * Microphone capture → 16 kHz mono PCM16 LE frames, shared by the soniox and deepgram
 * adapters. Uses an AudioWorklet (inline module via Blob URL) and falls back to a
 * ScriptProcessorNode where worklets are unavailable. Also reports an RMS level (0..1).
 *
 * Nothing is recorded: frames go straight to the provider socket and are discarded.
 */

export type PcmCaptureHandlers = {
  onFrame: (pcm: ArrayBuffer) => void;
  onLevel?: (rms: number) => void;
};

const TARGET_RATE = 16000;
const FRAME_SAMPLES = 1600; // 100 ms at 16 kHz

const WORKLET_SOURCE = `
class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(${FRAME_SAMPLES});
    this.len = 0;
    this.counter = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    let sum = 0;
    for (let i = 0; i < ch.length; i++) {
      const v = ch[i];
      sum += v * v;
      this.buf[this.len++] = v;
      if (this.len === this.buf.length) {
        const out = new Int16Array(this.buf.length);
        for (let j = 0; j < this.buf.length; j++) {
          const s = Math.max(-1, Math.min(1, this.buf[j]));
          out[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.port.postMessage({ type: 'frame', pcm: out.buffer }, [out.buffer]);
        this.len = 0;
      }
    }
    if (++this.counter % 4 === 0) {
      this.port.postMessage({ type: 'level', rms: Math.sqrt(sum / ch.length) });
    }
    return true;
  }
}
registerProcessor('ts-pcm-worklet', PcmWorklet);
`;

function floatToPcm16(input: Float32Array): ArrayBuffer {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

/** Linear resample to 16 kHz when the AudioContext refused our sampleRate. */
function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = pos - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

export class PcmCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private workletUrl: string | null = null;
  private paused = false;
  private handlers: PcmCaptureHandlers;

  constructor(handlers: PcmCaptureHandlers) {
    this.handlers = handlers;
  }

  get sampleRate() {
    return TARGET_RATE;
  }

  async start(): Promise<void> {
    if (this.ctx) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    let ctx: AudioContext;
    try {
      ctx = new AudioContext({ sampleRate: TARGET_RATE });
    } catch {
      ctx = new AudioContext();
    }
    this.ctx = ctx;
    if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
    this.source = ctx.createMediaStreamSource(this.stream);

    const nativeRate = ctx.sampleRate;
    const canWorklet = typeof AudioWorkletNode !== "undefined" && !!ctx.audioWorklet && nativeRate === TARGET_RATE;

    if (canWorklet) {
      try {
        this.workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "application/javascript" }));
        await ctx.audioWorklet.addModule(this.workletUrl);
        this.worklet = new AudioWorkletNode(ctx, "ts-pcm-worklet", { numberOfInputs: 1, numberOfOutputs: 0 });
        this.worklet.port.onmessage = (ev: MessageEvent<{ type: string; pcm?: ArrayBuffer; rms?: number }>) => {
          if (this.paused) return;
          if (ev.data.type === "frame" && ev.data.pcm) this.handlers.onFrame(ev.data.pcm);
          else if (ev.data.type === "level" && typeof ev.data.rms === "number") this.handlers.onLevel?.(Math.min(1, ev.data.rms * 4));
        };
        this.source.connect(this.worklet);
        return;
      } catch (e) {
        console.warn("[pcm] AudioWorklet unavailable, falling back to ScriptProcessor", e);
      }
    }

    // Fallback: ScriptProcessorNode (deprecated but universally available)
    const bufferSize = 4096;
    this.processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    let pending = new Float32Array(0);
    this.processor.onaudioprocess = (ev) => {
      if (this.paused) return;
      const input = ev.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      this.handlers.onLevel?.(Math.min(1, Math.sqrt(sum / input.length) * 4));
      const resampled = resample(input, nativeRate, TARGET_RATE);
      const merged = new Float32Array(pending.length + resampled.length);
      merged.set(pending, 0);
      merged.set(resampled, pending.length);
      let offset = 0;
      while (merged.length - offset >= FRAME_SAMPLES) {
        this.handlers.onFrame(floatToPcm16(merged.subarray(offset, offset + FRAME_SAMPLES)));
        offset += FRAME_SAMPLES;
      }
      pending = merged.slice(offset);
    };
    this.source.connect(this.processor);
    // ScriptProcessor needs a destination to keep firing; keep it silent.
    const silence = ctx.createGain();
    silence.gain.value = 0;
    this.processor.connect(silence);
    silence.connect(ctx.destination);
  }

  pause() {
    this.paused = true;
    this.handlers.onLevel?.(0);
  }

  resume() {
    this.paused = false;
    void this.ctx?.resume().catch(() => undefined);
  }

  async stop(): Promise<void> {
    this.paused = false;
    try {
      this.worklet?.port.close();
      this.worklet?.disconnect();
      this.processor?.disconnect();
      this.source?.disconnect();
    } catch {
      /* ignore */
    }
    this.worklet = null;
    this.processor = null;
    this.source = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.workletUrl) URL.revokeObjectURL(this.workletUrl);
    this.workletUrl = null;
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx && ctx.state !== "closed") await ctx.close().catch(() => undefined);
    this.handlers.onLevel?.(0);
  }
}
