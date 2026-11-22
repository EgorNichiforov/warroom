/**
 * Simulated image provider: deterministic SVG scenes derived from the prompt.
 * Clearly labeled "SIMULATED IMAGE" so nobody mistakes it for a generated picture.
 * Set MOCK_IMAGE_FAIL=1 to make every call fail with a retryable ImageProviderError (tests).
 */
import { ImageProviderError, type GeneratedImage, type ImageProvider, type ImageUsage } from "./types";

const WIDTH = 1280;
const HEIGHT = 720;
const DELAY_MS = 300;

/** FNV-1a 32-bit hash, stable across runs. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Tiny seeded PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string);

const PALETTES = [
  ["#5b8def", "#9b6bff", "#38bdf8"],
  ["#f97316", "#facc15", "#fb7185"],
  ["#22c55e", "#14b8a6", "#a3e635"],
  ["#e879f9", "#c084fc", "#60a5fa"],
];

export function buildSimulatedSvg(prompt: string, seedSalt = ""): string {
  const seed = hash(prompt + "\u0000" + seedSalt);
  const rand = rng(seed);
  const palette = PALETTES[seed % PALETTES.length];
  const title = escapeXml(prompt.replace(/\s+/g, " ").trim().slice(0, 60) || "Untitled scene");
  const shapes: string[] = [];
  const n = 5 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const color = palette[i % palette.length];
    const kind = Math.floor(rand() * 3);
    const x = Math.floor(rand() * WIDTH);
    const y = 120 + Math.floor(rand() * (HEIGHT - 240));
    const size = 60 + Math.floor(rand() * 220);
    const opacity = (0.25 + rand() * 0.45).toFixed(2);
    if (kind === 0) shapes.push(`<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${color}" opacity="${opacity}"/>`);
    else if (kind === 1)
      shapes.push(
        `<rect x="${x - size / 2}" y="${y - size / 3}" width="${size}" height="${Math.floor(size / 1.5)}" rx="${Math.floor(size / 8)}" fill="${color}" opacity="${opacity}" transform="rotate(${Math.floor(rand() * 40 - 20)} ${x} ${y})"/>`,
      );
    else
      shapes.push(
        `<polygon points="${x},${y - size / 2} ${x + size / 2},${y + size / 2} ${x - size / 2},${y + size / 2}" fill="${color}" opacity="${opacity}"/>`,
      );
  }
  // a few connecting lines so it reads as a "scene", not confetti
  const lines: string[] = [];
  for (let i = 0; i < 3; i++) {
    lines.push(
      `<line x1="${Math.floor(rand() * WIDTH)}" y1="${Math.floor(rand() * HEIGHT)}" x2="${Math.floor(rand() * WIDTH)}" y2="${Math.floor(rand() * HEIGHT)}" stroke="${palette[i % palette.length]}" stroke-width="3" opacity="0.35"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Simulated image: ${title}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#151b33"/></linearGradient></defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
${lines.join("\n")}
${shapes.join("\n")}
<text x="48" y="80" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="40" font-weight="600" fill="#f8fafc">${title}</text>
<rect x="48" y="${HEIGHT - 88}" width="300" height="44" rx="8" fill="#f8fafc" opacity="0.92"/>
<text x="198" y="${HEIGHT - 58}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="22" font-weight="700" letter-spacing="2" fill="#0b1020">SIMULATED IMAGE</text>
<text x="${WIDTH - 48}" y="${HEIGHT - 56}" text-anchor="end" font-family="ui-monospace, monospace" font-size="18" fill="#94a3b8">mock · seed ${seed.toString(16)}</text>
</svg>`;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new ImageProviderError("aborted", true));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new ImageProviderError("aborted", true));
      },
      { once: true },
    );
  });

export class MockImageProvider implements ImageProvider {
  readonly name = "mock";
  readonly real = false;
  readonly model = "placeholder-svg";

  private async produce(prompt: string, salt: string, signal?: AbortSignal): Promise<{ image: GeneratedImage; usage: ImageUsage }> {
    const started = Date.now();
    if (process.env.MOCK_IMAGE_FAIL === "1") {
      throw new ImageProviderError("simulated image provider failure (MOCK_IMAGE_FAIL=1)", true);
    }
    await sleep(DELAY_MS, signal);
    const svg = buildSimulatedSvg(prompt, salt);
    return {
      image: { bytes: new TextEncoder().encode(svg), mime: "image/svg+xml", width: WIDTH, height: HEIGHT },
      usage: { costUsd: 0, model: this.model, durationMs: Date.now() - started },
    };
  }

  generate(prompt: string, opts?: { signal?: AbortSignal; aspect?: "16:9" | "4:3" | "1:1" }) {
    return this.produce(prompt, "", opts?.signal);
  }

  edit(previous: GeneratedImage, instruction: string, opts?: { signal?: AbortSignal }) {
    // Different seed (salted by the previous image's size) and the instruction appended to the title.
    const prev = new TextDecoder().decode(previous.bytes);
    const m = /seed ([0-9a-f]+)/.exec(prev);
    const salt = `edit:${m?.[1] ?? previous.bytes.length}`;
    const base = /aria-label="Simulated image: ([^"]*)"/.exec(prev)?.[1] ?? "";
    return this.produce(`${base ? base + " → " : ""}${instruction}`, salt, opts?.signal);
  }
}
