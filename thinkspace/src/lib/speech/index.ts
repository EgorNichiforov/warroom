/** Speech provider factory + metadata for the provider selector. */
import type { SpeechProvider, SpeechProviderName } from "./types";
import { BrowserSpeechProvider, isBrowserSpeechSupported } from "./providers/browser";
import { DeepgramSpeechProvider } from "./providers/deepgram";
import { MockSpeechProvider } from "./providers/mock";
import { SonioxSpeechProvider } from "./providers/soniox";

export type { SpeechProvider, SpeechProviderName } from "./types";
export { MockSpeechProvider } from "./providers/mock";
export { isBrowserSpeechSupported } from "./providers/browser";

export function createSpeechProvider(name: SpeechProviderName): SpeechProvider {
  switch (name) {
    case "browser":
      return new BrowserSpeechProvider();
    case "soniox":
      return new SonioxSpeechProvider();
    case "deepgram":
      return new DeepgramSpeechProvider();
    case "mock":
      return new MockSpeechProvider();
  }
}

export const SPEECH_PROVIDER_INFO: Record<
  SpeechProviderName,
  { label: string; real: boolean; supportsCodeSwitching: boolean; needsToken: boolean; description: string }
> = {
  browser: {
    label: "Browser (Web Speech)",
    real: true,
    supportsCodeSwitching: false,
    needsToken: false,
    description:
      "Built into Chrome/Edge/Safari. Free, no key. Recognizes one language at a time — pick Romanian or English; mixed sentences may be imperfect.",
  },
  soniox: {
    label: "Soniox (RO+EN)",
    real: true,
    supportsCodeSwitching: true,
    needsToken: true,
    description: "Soniox real-time streaming. Understands Romanian and English in the same sentence. Requires a server-side key.",
  },
  deepgram: {
    label: "Deepgram Nova-3 (multi)",
    real: true,
    supportsCodeSwitching: true,
    needsToken: true,
    description: "Deepgram Nova-3 multilingual streaming. Handles Romanian/English code-switching. Requires a server-side key.",
  },
  mock: {
    label: "Demo script (simulated)",
    real: false,
    supportsCodeSwitching: true,
    needsToken: false,
    description: "Scripted demo speech (simulated — no microphone)",
  },
};

export const isSpeechProviderName = (v: string): v is SpeechProviderName =>
  v === "browser" || v === "soniox" || v === "deepgram" || v === "mock";

/** Which providers can actually run here, given what the server offers. */
export function usableProviders(serverAvailable: string[] | undefined): SpeechProviderName[] {
  const list = (serverAvailable ?? ["browser", "mock"]).filter(isSpeechProviderName);
  if (!list.includes("mock")) list.push("mock");
  return list.filter((p) => (p === "browser" ? isBrowserSpeechSupported() || typeof window === "undefined" : true));
}
