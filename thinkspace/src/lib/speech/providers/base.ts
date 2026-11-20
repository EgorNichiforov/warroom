/** Small typed emitter shared by all speech providers. */
import type { Language } from "@/lib/contracts/domain";
import type { SpeechEvents, SpeechStatus } from "@/lib/speech/types";
import { newId } from "@/lib/ids";

type Handlers = { [K in keyof SpeechEvents]: Set<SpeechEvents[K]> };

export class SpeechEmitter {
  private handlers: Handlers = {
    status: new Set(),
    partial: new Set(),
    final: new Set(),
    error: new Set(),
    level: new Set(),
  };
  protected status: SpeechStatus = "idle";

  on<K extends keyof SpeechEvents>(event: K, handler: SpeechEvents[K]): () => void {
    const set = this.handlers[event] as Set<SpeechEvents[K]>;
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  protected emit<K extends keyof SpeechEvents>(event: K, ...args: Parameters<SpeechEvents[K]>) {
    const set = this.handlers[event] as Set<(...a: Parameters<SpeechEvents[K]>) => void>;
    for (const h of set) {
      try {
        h(...args);
      } catch (e) {
        console.error(`[speech] handler for ${event} threw`, e);
      }
    }
  }

  protected setStatus(status: SpeechStatus, detail?: string) {
    this.status = status;
    this.emit("status", status, detail);
  }

  get currentStatus() {
    return this.status;
  }
}

/** Prefixed segment id generated on the client so retries are idempotent. */
export const segmentId = () => newId("seg");

// ---------- Language heuristics (Romanian vs English) ----------

const RO_DIACRITICS = /[ăâîșşțţĂÂÎȘŞȚŢ]/;
const RO_STOP = new Set([
  "și", "si", "sau", "dar", "este", "sunt", "care", "pentru", "într", "din", "cu", "la", "de", "pe", "un", "o", "nu",
  "da", "că", "ca", "să", "sa", "mai", "foarte", "avem", "avea", "trebuie", "deci", "dacă", "daca", "când", "cand",
  "unde", "cum", "acum", "aici", "acest", "această", "aceasta", "fiecare", "către", "catre", "între", "intre", "fără",
  "prin", "după", "dupa", "mă", "ma", "ne", "vă", "va", "îl", "le", "lor", "noi", "voi", "ei", "ele", "vreau", "cred",
  "gândesc", "gandesc", "poate", "ar", "fi", "fost", "era", "vom", "voi", "primul", "prima", "sistem", "sistemul",
]);
const EN_STOP = new Set([
  "the", "and", "or", "but", "is", "are", "was", "were", "be", "been", "to", "of", "in", "on", "for", "with", "that",
  "this", "it", "we", "you", "they", "i", "should", "would", "could", "can", "will", "think", "maybe", "not", "have",
  "has", "had", "do", "does", "did", "what", "which", "who", "how", "when", "where", "there", "here", "let's", "lets",
  "actually", "okay", "ok", "so", "then", "than", "also", "just", "need", "needs", "want", "about", "into", "from",
]);

export function scoreLanguages(text: string): { ro: number; en: number } {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  let ro = 0;
  let en = 0;
  for (const w of words) {
    if (RO_STOP.has(w)) ro++;
    if (EN_STOP.has(w)) en++;
    if (RO_DIACRITICS.test(w)) ro += 1.5;
  }
  return { ro, en };
}

/**
 * Detects the language of a final transcript. `base` is the recognizer's configured
 * language; the result becomes "mixed" when clear markers of the other language appear.
 */
export function detectLanguage(text: string, base: "ro" | "en" | null): Language {
  const { ro, en } = scoreLanguages(text);
  const strongRo = ro >= 2;
  const strongEn = en >= 2;
  if (base === "ro") return strongEn && en >= ro * 0.5 ? "mixed" : "ro";
  if (base === "en") return strongRo && ro >= en * 0.5 ? "mixed" : "en";
  if (strongRo && strongEn) return "mixed";
  if (ro > en) return "ro";
  if (en > ro) return "en";
  return "unknown";
}

export const baseOf = (lang: "ro-RO" | "en-US" | "auto"): "ro" | "en" => (lang === "en-US" ? "en" : "ro");
