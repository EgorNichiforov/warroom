/**
 * Browser-side speech provider contract. Implementations live in ./providers.
 * The server never sees audio; it only mints short-lived tokens (see /api/speech/token).
 */
import type { Language } from "@/lib/contracts/domain";

export type SpeechProviderName = "cloud" | "browser" | "soniox" | "deepgram" | "mock";

export type SpeechStatus =
  | "idle"
  | "requesting-mic"
  | "connecting"
  | "listening"
  | "paused"
  | "reconnecting"
  | "error"
  | "stopped";

export type PartialTranscript = { text: string; language?: Language; startedMs: number };

export type FinalTranscript = {
  /** client-generated id, stable across retries */
  id: string;
  text: string;
  language: Language;
  startedMs: number;
  endedMs: number;
  confidence: number | null;
};

export type SpeechEvents = {
  status: (status: SpeechStatus, detail?: string) => void;
  partial: (p: PartialTranscript) => void;
  final: (f: FinalTranscript) => void;
  error: (message: string, recoverable: boolean) => void;
  /** 0..1 input level for the mic indicator */
  level: (rms: number) => void;
};

export type SpeechStartOptions = {
  /** BCP-47 hint for providers that need one (Web Speech); code-switching providers get ["ro","en"] */
  language: "ro-RO" | "en-US" | "auto";
  /** session clock origin (performance.now() at session start) so segments get session-relative ms */
  sessionStartedAt: number;
  /** fetches a short-lived token from the server for soniox/deepgram */
  getToken?: () => Promise<{ token: string; expiresAt: string }>;
  /** cloud provider: transcribe one recorded utterance on the server */
  transcribe?: (audio: Blob, mime: string) => Promise<{ text: string; language: string }>;
  /** mock only: scripted lines to replay */
  script?: { text: string; language: Language; delayMs?: number }[];
};

export interface SpeechProvider {
  readonly name: SpeechProviderName;
  readonly real: boolean;
  readonly supportsCodeSwitching: boolean;
  readonly description: string;
  start(opts: SpeechStartOptions): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): Promise<void>;
  on<K extends keyof SpeechEvents>(event: K, handler: SpeechEvents[K]): () => void;
}
