export type GeneratedImage = { bytes: Uint8Array; mime: string; width: number | null; height: number | null };

export type ImageUsage = { costUsd: number; model: string; durationMs: number };

export interface ImageProvider {
  readonly name: string;
  readonly real: boolean;
  readonly model: string;
  /** Create a new image from a prompt. */
  generate(prompt: string, opts?: { signal?: AbortSignal; aspect?: "16:9" | "4:3" | "1:1" }): Promise<{ image: GeneratedImage; usage: ImageUsage }>;
  /** Edit an existing image with an instruction (keeps visual continuity). */
  edit(previous: GeneratedImage, instruction: string, opts?: { signal?: AbortSignal }): Promise<{ image: GeneratedImage; usage: ImageUsage }>;
}

export class ImageProviderError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly cause?: unknown) {
    super(message);
    this.name = "ImageProviderError";
  }
}
