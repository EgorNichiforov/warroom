/** Server-side configuration. Never import from client components. */
import "server-only";

const env = (k: string, d = "") => process.env[k] ?? d;
const num = (k: string, d: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : d;
};

export const config = {
  appVersion: "0.1.0",
  databaseUrl: env("DATABASE_URL"),
  pgliteDir: env("THINKSPACE_PGLITE_DIR", ".data/pglite"),
  auth: {
    passphrase: env("THINKSPACE_PASSPHRASE"),
    secret: env("THINKSPACE_SECRET", ""),
    cookieName: "ts_session",
    ttlSeconds: 60 * 60 * 24 * 30,
  },
  llm: {
    provider: env("LLM_PROVIDER", process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock"),
    model: env("THINKSPACE_LLM_MODEL", "claude-opus-5-5"),
    summaryModel: env("THINKSPACE_SUMMARY_MODEL", env("THINKSPACE_LLM_MODEL", "claude-opus-5-5")),
    liveEffort: env("THINKSPACE_LLM_EFFORT", "low"),
    summaryEffort: env("THINKSPACE_SUMMARY_EFFORT", "medium"),
    maxContextSegments: num("THINKSPACE_CONTEXT_SEGMENTS", 12),
  },
  image: {
    provider: env("IMAGE_PROVIDER", process.env.GEMINI_API_KEY ? "gemini" : "mock"),
    model: env("THINKSPACE_IMAGE_MODEL", "gemini-3.1-flash-image"),
    maxPerSession: num("THINKSPACE_MAX_IMAGES_PER_SESSION", 12),
  },
  speech: {
    defaultProvider: env("SPEECH_PROVIDER", "cloud"),
    sonioxKey: env("SONIOX_API_KEY"),
    deepgramKey: env("DEEPGRAM_API_KEY"),
  },
  retention: {
    /** days; 0 = keep forever */
    sessionDays: num("THINKSPACE_RETENTION_DAYS", 0),
  },
};

export type AppConfig = typeof config;
