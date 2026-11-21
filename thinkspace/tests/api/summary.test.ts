import { afterAll, describe, expect, it } from "vitest";
import { SessionEvent, SessionSummary } from "@/lib/contracts";
import { closeDb } from "@/lib/db/client";
import { POST as ingest } from "@/app/api/sessions/[id]/ingest/route";
import { POST as summary } from "@/app/api/sessions/[id]/summary/route";
import { GET as getSession } from "@/app/api/sessions/[id]/route";
import { appendTestSegments, createTestSession, ctx, jsonRequest, readNdjson } from "./helpers";

afterAll(() => closeDb());

describe("POST /api/sessions/:id/summary (mock LLM)", () => {
  it("streams summary.ready + session.updated and ends the session", async () => {
    const s = await createTestSession("Summary");
    const { segments } = await appendTestSegments(s.id, ["I decided to ship the capture feature first.", "Open question: who owns review?"]);
    await readNdjson(await ingest(jsonRequest("POST", `/api/sessions/${s.id}/ingest`, { segmentIds: segments.map((x) => x.id) }), ctx({ id: s.id })));

    const res = await summary(jsonRequest("POST", `/api/sessions/${s.id}/summary`), ctx({ id: s.id }));
    expect(res.status).toBe(200);
    const lines = await readNdjson(res);
    const types = lines.map((l) => l.type);
    expect(types).toContain("summary.ready");
    expect(types).toContain("session.updated");
    expect(types.at(-1)).toBe("stream.end");
    for (const e of lines.filter((l) => l.type !== "stream.end")) expect(SessionEvent.safeParse(e).success, JSON.stringify(e)).toBe(true);
    const ready = lines.find((l) => l.type === "summary.ready")!.payload;
    expect(SessionSummary.safeParse(ready).success).toBe(true);

    const after = await (await getSession(jsonRequest("GET", `/api/sessions/${s.id}`), ctx({ id: s.id }))).json();
    expect(after.session.status).toBe("ended");
    expect(after.session.endedAt).toBeTruthy();
    expect(SessionSummary.safeParse(after.session.summary).success).toBe(true);
  });
});
