import { afterAll, describe, expect, it } from "vitest";
import { SessionEvent, SessionSnapshot } from "@/lib/contracts";
import { closeDb } from "@/lib/db/client";
import { POST as ingest } from "@/app/api/sessions/[id]/ingest/route";
import { GET as snapshot } from "@/app/api/sessions/[id]/snapshot/route";
import { GET as search } from "@/app/api/search/route";
import { GET as listSessions } from "@/app/api/sessions/route";
import { appendTestSegments, createTestSession, ctx, jsonRequest, readNdjson } from "./helpers";

afterAll(() => closeDb());

describe("POST /api/sessions/:id/ingest (mock LLM)", () => {
  it("streams ingest.started … ingest.finished and persists the extraction", async () => {
    const s = await createTestSession("Ingest");
    const { segments } = await appendTestSegments(s.id, [
      "I want to build a note-taking system for my team.",
      "The system has three components: capture, review and archive. The review step depends on capture.",
      "Decision: we will start with capture only. Action: write the capture spec by Friday.",
    ]);
    const ids = segments.map((x) => x.id);
    const res = await ingest(jsonRequest("POST", `/api/sessions/${s.id}/ingest`, { segmentIds: ids }), ctx({ id: s.id }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const lines = await readNdjson(res);
    const types = lines.map((l) => l.type);
    expect(types[0]).toBe("ingest.started");
    expect(types.at(-1)).toBe("stream.end");
    expect(types).toContain("ingest.finished");
    expect(types).not.toContain("engine.error");
    const events = lines.filter((l) => l.type !== "stream.end");
    for (const e of events) expect(SessionEvent.safeParse(e).success, JSON.stringify(e)).toBe(true);
    const seqs = events.map((e) => e.seq as number);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    const finished = events.find((e) => e.type === "ingest.finished") as { payload: { segmentIds: string[] } };
    expect(finished.payload.segmentIds).toEqual(ids);

    const snapRes = await snapshot(jsonRequest("GET", `/api/sessions/${s.id}/snapshot`), ctx({ id: s.id }));
    const snap = SessionSnapshot.parse(await snapRes.json());
    expect(snap.thoughts.length).toBeGreaterThan(0);
    expect(snap.segments.every((x) => x.ingestedAt !== null)).toBe(true);
    expect(snap.lastEventSeq).toBe(Math.max(...seqs));

    // derived items (thoughts/concepts/actions) carry counts and deep-link positions
    const { sessions: list } = await (await listSessions(jsonRequest("GET", "/api/sessions?q=Ingest"))).json();
    const mine = list.find((x: { id: string }) => x.id === s.id);
    expect(mine.counts.segments).toBe(3);
    expect(mine.counts.thoughts).toBe(snap.thoughts.length);
    expect(mine.counts.concepts).toBe(snap.concepts.length);
    expect(mine.counts.actions).toBe(snap.actions.length);

    const thought = snap.thoughts.find((t) => t.sourceSegmentIds.length > 0)!;
    const word = thought.text.split(/\s+/).find((w) => w.length > 4)!.replace(/[^\p{L}\p{N}]/gu, "");
    const { results } = await (await search(jsonRequest("GET", `/api/search?q=${encodeURIComponent(word)}`))).json();
    const hit = results.find((r: { kind: string; id: string }) => r.kind === "thought" && r.id === thought.id);
    expect(hit).toBeTruthy();
    const firstSeg = snap.segments.find((x) => x.id === thought.sourceSegmentIds[0])!;
    expect(hit.atMs).toBe(firstSeg.startedMs);
  });

  it("re-ingesting the same text within 5 minutes skips the model (usage null) and errors for unknown ids", async () => {
    const s = await createTestSession("Dedupe");
    const { segments } = await appendTestSegments(s.id, ["Exactly the same words twice."]);
    const first = await readNdjson(await ingest(jsonRequest("POST", `/api/sessions/${s.id}/ingest`, { segmentIds: [segments[0].id] }), ctx({ id: s.id })));
    expect(first.some((l) => l.type === "ingest.finished")).toBe(true);

    const { segments: again } = await appendTestSegments(s.id, ["Exactly the same words twice."], 60_000);
    const second = await readNdjson(await ingest(jsonRequest("POST", `/api/sessions/${s.id}/ingest`, { segmentIds: [again[0].id] }), ctx({ id: s.id })));
    const fin = second.find((l) => l.type === "ingest.finished") as { payload: { usage: unknown } } | undefined;
    expect(fin).toBeTruthy();
    expect(fin!.payload.usage).toBeNull();
    expect(second.map((l) => l.type)).toEqual(["ingest.started", "ingest.finished", "stream.end"]);

    const bad = await readNdjson(await ingest(jsonRequest("POST", `/api/sessions/${s.id}/ingest`, { segmentIds: ["seg_missing"] }), ctx({ id: s.id })));
    expect(bad[0].type).toBe("engine.error");
    expect((bad[0].payload as { retryable: boolean }).retryable).toBe(false);
  });
});
