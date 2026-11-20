import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.THINKSPACE_MAX_IMAGES_PER_SESSION = "2";
});

import { SessionEvent } from "@/lib/contracts";
import { closeDb } from "@/lib/db/client";
import { insertScene } from "@/lib/db/repo";
import { POST as render } from "@/app/api/sessions/[id]/scenes/[sceneId]/render/route";
import { GET as asset } from "@/app/api/assets/[assetId]/route";
import { GET as snapshot } from "@/app/api/sessions/[id]/snapshot/route";
import { createTestSession, ctx, jsonRequest, readNdjson } from "./helpers";

afterAll(() => closeDb());
afterEach(() => {
  delete process.env.MOCK_IMAGE_FAIL;
});

async function plannedScene(sessionId: string, title: string, parentSceneId: string | null = null) {
  return insertScene({
    id: `scn_${Math.random().toString(36).slice(2, 10)}`,
    sessionId,
    title,
    description: `${title} description`,
    kind: "illustration",
    prompt: `A wide illustration of ${title}`,
    status: "planned",
    assetId: null,
    parentSceneId,
    conceptIds: [],
    sourceSegmentIds: [],
    provider: null,
    error: null,
    metadata: {},
  });
}

describe("POST /api/sessions/:id/scenes/:sceneId/render (mock image provider)", () => {
  it("renders a planned scene, stores an SVG asset and serves it; child scenes use edit()", async () => {
    const s = await createTestSession("Render");
    const scene = await plannedScene(s.id, "a lighthouse");
    const res = await render(jsonRequest("POST", `/api/sessions/${s.id}/scenes/${scene.id}/render`), ctx({ id: s.id, sceneId: scene.id }));
    expect(res.status).toBe(200);
    const lines = await readNdjson(res);
    const types = lines.map((l) => l.type);
    expect(types).toEqual(["scene.updated", "asset.added", "scene.updated", "stream.end"]);
    for (const e of lines.filter((l) => l.type !== "stream.end")) expect(SessionEvent.safeParse(e).success, JSON.stringify(e)).toBe(true);
    const added = lines.find((l) => l.type === "asset.added")!.payload as { id: string; url: string; mime: string; simulated: boolean };
    expect(added.simulated).toBe(true);
    expect(added.mime).toBe("image/svg+xml");
    expect(added.url).toBe(`/api/assets/${added.id}`);
    const ready = lines[2].payload as { status: string; assetId: string };
    expect(ready.status).toBe("ready");
    expect(ready.assetId).toBe(added.id);

    const bytes = await asset(jsonRequest("GET", added.url), ctx({ assetId: added.id }));
    expect(bytes.status).toBe(200);
    expect(bytes.headers.get("content-type")).toBe("image/svg+xml");
    expect(bytes.headers.get("cache-control")).toContain("immutable");
    const svg = await bytes.text();
    expect(svg).toContain("SIMULATED IMAGE");
    expect(svg).toContain("a lighthouse");

    const child = await plannedScene(s.id, "a lighthouse at night", scene.id);
    const lines2 = await readNdjson(await render(jsonRequest("POST", `/api/sessions/${s.id}/scenes/${child.id}/render`), ctx({ id: s.id, sceneId: child.id })));
    const ready2 = lines2.filter((l) => l.type === "scene.updated").at(-1)!.payload as { metadata: { continuity: string } };
    expect(ready2.metadata.continuity).toBe("edit");

    // cap (2) reached → engine.error, not retryable
    const third = await plannedScene(s.id, "too many");
    const lines3 = await readNdjson(await render(jsonRequest("POST", `/api/sessions/${s.id}/scenes/${third.id}/render`), ctx({ id: s.id, sceneId: third.id })));
    expect(lines3[0].type).toBe("engine.error");
    expect((lines3[0].payload as { retryable: boolean; message: string }).retryable).toBe(false);
    expect((lines3[0].payload as { message: string }).message).toMatch(/cap/i);

    const snap = await (await snapshot(jsonRequest("GET", `/api/sessions/${s.id}/snapshot`), ctx({ id: s.id }))).json();
    expect(snap.assets).toHaveLength(2);
    expect(snap.scenes.find((x: { id: string }) => x.id === third.id).status).toBe("planned");

    const missing = await asset(jsonRequest("GET", "/api/assets/ast_nope"), ctx({ assetId: "ast_nope" }));
    expect(missing.status).toBe(404);
    const noScene = await render(jsonRequest("POST", `/api/sessions/${s.id}/scenes/scn_nope/render`), ctx({ id: s.id, sceneId: "scn_nope" }));
    expect(noScene.status).toBe(404);
  });

  it("marks the scene failed and emits a retryable engine.error when the provider fails", async () => {
    process.env.MOCK_IMAGE_FAIL = "1";
    const s = await createTestSession("Render fail");
    const scene = await plannedScene(s.id, "doomed");
    const lines = await readNdjson(await render(jsonRequest("POST", `/api/sessions/${s.id}/scenes/${scene.id}/render`), ctx({ id: s.id, sceneId: scene.id })));
    const types = lines.map((l) => l.type);
    expect(types).toEqual(["scene.updated", "scene.updated", "engine.error", "stream.end"]);
    expect((lines[1].payload as { status: string; error: string }).status).toBe("failed");
    expect((lines[2].payload as { retryable: boolean; sceneId: string }).retryable).toBe(true);
    expect((lines[2].payload as { sceneId: string }).sceneId).toBe(scene.id);
  });
});
