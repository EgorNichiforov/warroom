/**
 * Scene rendering: planned scene → ImageProvider (generate, or edit of the parent scene's image for
 * continuity) → asset row → scene `ready`. Enforces THINKSPACE_MAX_IMAGES_PER_SESSION (D-13).
 * Every state change is persisted as an event and emitted to the caller's stream.
 */
import "server-only";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { countAssets, currentAtMs, emitEvents, getAsset, getScene, insertAsset, logUsage, updateScene, type Executor } from "@/lib/db/repo";
import { nowIso } from "@/lib/ids";
import { createImageProvider, ImageProviderError } from "@/lib/providers/image";
import type { NewSessionEvent, SessionEvent } from "@/lib/contracts/events";

export type EmitEvent = (e: SessionEvent) => void;
const RENDER_TIMEOUT_MS = 120_000;

export function createConfiguredImageProvider() {
  return createImageProvider({ provider: config.image.provider, model: config.image.model }, process.env.GEMINI_API_KEY);
}

export async function renderScene(sessionId: string, sceneId: string, emit: EmitEvent, opts: { signal?: AbortSignal } = {}): Promise<void> {
  const db = await getDb();
  const ex = db as Executor;
  const persist = async (events: NewSessionEvent[]) => {
    const out = await emitEvents(ex, sessionId, events);
    for (const e of out) emit(e);
  };
  const atMs = await currentAtMs(ex, sessionId).catch(() => 0);

  const scene = await getScene(sessionId, sceneId);
  if (!scene) {
    emit({ seq: 0, sessionId, atMs, createdAt: nowIso(), type: "engine.error", payload: { stage: "render", message: "scene not found", retryable: false, sceneId } });
    return;
  }

  const used = await countAssets(sessionId, "image");
  if (used >= config.image.maxPerSession) {
    await persist([
      {
        type: "engine.error",
        sessionId,
        atMs,
        payload: {
          stage: "render",
          sceneId,
          retryable: false,
          message: `Image cap reached: this session already has ${used} generated image(s); the limit is ${config.image.maxPerSession} (THINKSPACE_MAX_IMAGES_PER_SESSION). The scene stays as a structured card.`,
        },
      },
    ]);
    return;
  }

  const provider = createConfiguredImageProvider();
  const generating = await updateScene(sessionId, sceneId, { status: "generating", provider: provider.name, error: null });
  if (generating) await persist([{ type: "scene.updated", sessionId, atMs, payload: generating }]);

  try {
    const signal = opts.signal ? AbortSignal.any([AbortSignal.timeout(RENDER_TIMEOUT_MS), opts.signal]) : AbortSignal.timeout(RENDER_TIMEOUT_MS);
    const instruction = scene.prompt || `${scene.title}. ${scene.description}`.trim();

    let parentImage: { bytes: Uint8Array; mime: string; width: number | null; height: number | null } | null = null;
    if (scene.parentSceneId) {
      const parent = await getScene(sessionId, scene.parentSceneId);
      if (parent?.assetId) {
        const a = await getAsset(parent.assetId);
        if (a && a.asset.sessionId === sessionId) parentImage = { bytes: a.bytes, mime: a.asset.mime, width: a.asset.width, height: a.asset.height };
      }
    }

    const { image, usage } = parentImage
      ? await provider.edit(parentImage, instruction, { signal })
      : await provider.generate(instruction, { signal, aspect: "16:9" });

    const asset = await insertAsset({
      sessionId,
      kind: "image",
      mime: image.mime,
      width: image.width,
      height: image.height,
      bytes: image.bytes,
      provider: provider.name,
      simulated: !provider.real,
    });
    const ready = await updateScene(sessionId, sceneId, {
      status: "ready",
      assetId: asset.id,
      provider: provider.name,
      error: null,
      metadata: { ...scene.metadata, renderedAt: nowIso(), continuity: parentImage ? "edit" : "generate", simulated: !provider.real },
    });
    await logUsage({ sessionId, provider: provider.name, model: usage.model, kind: "image", costUsd: usage.costUsd, durationMs: usage.durationMs });
    const events: NewSessionEvent[] = [{ type: "asset.added", sessionId, atMs, payload: asset }];
    if (ready) events.push({ type: "scene.updated", sessionId, atMs, payload: ready });
    await persist(events);
  } catch (err) {
    const retryable = err instanceof ImageProviderError ? err.retryable : true;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[thinkspace/render] failed", err);
    const failed = await updateScene(sessionId, sceneId, { status: "failed", error: message });
    const events: NewSessionEvent[] = [];
    if (failed) events.push({ type: "scene.updated", sessionId, atMs, payload: failed });
    events.push({ type: "engine.error", sessionId, atMs, payload: { stage: "render", message, retryable, sceneId } });
    await persist(events);
  }
}
