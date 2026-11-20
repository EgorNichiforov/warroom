import { afterAll, describe, expect, it } from "vitest";
import { SessionSnapshot, SessionEvent, TranscriptSegment } from "@/lib/contracts";
import { closeDb } from "@/lib/db/client";
import * as sessions from "@/app/api/sessions/route";
import * as session from "@/app/api/sessions/[id]/route";
import * as snapshot from "@/app/api/sessions/[id]/snapshot/route";
import * as events from "@/app/api/sessions/[id]/events/route";
import * as segments from "@/app/api/sessions/[id]/segments/route";
import * as segment from "@/app/api/sessions/[id]/segments/[segId]/route";
import * as exportRoute from "@/app/api/sessions/[id]/export/route";
import * as search from "@/app/api/search/route";
import { appendTestSegments, createTestSession, ctx, jsonRequest } from "./helpers";

afterAll(() => closeDb());

describe("sessions API", () => {
  it("creates with a default title, lists, gets, patches and deletes (cascade)", async () => {
    const created = await sessions.POST(jsonRequest("POST", "/api/sessions", {}));
    expect(created.status).toBe(201);
    const { session: s } = await created.json();
    expect(s.title).toMatch(/^Thinking session — /);
    expect(s.status).toBe("active");
    expect(() => new Date(s.createdAt).toISOString()).not.toThrow();
    expect(s.createdAt).toMatch(/Z$/);

    const listed = await sessions.GET(jsonRequest("GET", "/api/sessions"));
    const { sessions: all } = await listed.json();
    expect(all.some((x: { id: string }) => x.id === s.id)).toBe(true);

    const filtered = await sessions.GET(jsonRequest("GET", "/api/sessions?q=zzz-no-match"));
    expect((await filtered.json()).sessions).toHaveLength(0);

    const got = await session.GET(jsonRequest("GET", `/api/sessions/${s.id}`), ctx({ id: s.id }));
    expect(got.status).toBe(200);
    expect((await got.json()).session.id).toBe(s.id);

    const patched = await session.PATCH(jsonRequest("PATCH", `/api/sessions/${s.id}`, { title: "Renamed", status: "ended" }), ctx({ id: s.id }));
    expect(patched.status).toBe(200);
    const pj = await patched.json();
    expect(pj.session.title).toBe("Renamed");
    expect(pj.session.status).toBe("ended");
    expect(pj.session.endedAt).toBeTruthy();
    expect(pj.events).toHaveLength(1);
    expect(pj.events[0].type).toBe("session.updated");
    expect(pj.events[0].seq).toBe(1);

    const bad = await session.PATCH(jsonRequest("PATCH", `/api/sessions/${s.id}`, { status: "bogus" }), ctx({ id: s.id }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).code).toBe("validation_error");

    await appendTestSegments(s.id, ["cascade me"]);
    const del = await session.DELETE(jsonRequest("DELETE", `/api/sessions/${s.id}`), ctx({ id: s.id }));
    expect(del.status).toBe(204);
    const gone = await session.GET(jsonRequest("GET", `/api/sessions/${s.id}`), ctx({ id: s.id }));
    expect(gone.status).toBe(404);
    const snapGone = await snapshot.GET(jsonRequest("GET", `/api/sessions/${s.id}/snapshot`), ctx({ id: s.id }));
    expect(snapGone.status).toBe(404);
  });

  it("appends segments idempotently, upgrades partial rows, and edits mark editedByUser", async () => {
    const s = await createTestSession("Segments");
    const body = {
      segments: [
        { id: "seg_a", startedMs: 0, endedMs: 1000, rawText: "hello partial", isFinal: false, provider: "mock" },
        { id: "seg_b", startedMs: 1000, endedMs: 2000, rawText: "second final", language: "ro", isFinal: true, provider: "mock" },
      ],
    };
    const first = await segments.POST(jsonRequest("POST", `/api/sessions/${s.id}/segments`, body), ctx({ id: s.id }));
    expect(first.status).toBe(200);
    const fj = await first.json();
    expect(fj.segments.map((x: TranscriptSegment) => x.seq)).toEqual([1, 2]);
    expect(fj.segments[0].language).toBe("unknown");
    expect(fj.events.map((e: SessionEvent) => e.type)).toEqual(["segment.added", "segment.added"]);
    for (const e of fj.events) expect(() => SessionEvent.parse(e)).not.toThrow();

    // re-POST identical: final row untouched, partial row updated (becomes final)
    const again = await segments.POST(
      jsonRequest("POST", `/api/sessions/${s.id}/segments`, {
        segments: [
          { ...body.segments[0], rawText: "hello final", isFinal: true },
          body.segments[1],
        ],
      }),
      ctx({ id: s.id }),
    );
    const aj = await again.json();
    expect(aj.segments).toHaveLength(2);
    expect(aj.segments[0].rawText).toBe("hello final");
    expect(aj.segments[0].isFinal).toBe(true);
    expect(aj.segments[0].seq).toBe(1);
    expect(aj.events.map((e: SessionEvent) => e.type)).toEqual(["segment.updated"]);

    // a final row is immutable here
    const third = await segments.POST(
      jsonRequest("POST", `/api/sessions/${s.id}/segments`, { segments: [{ ...body.segments[1], rawText: "CHANGED" }] }),
      ctx({ id: s.id }),
    );
    const tj = await third.json();
    expect(tj.segments[0].rawText).toBe("second final");
    expect(tj.events).toHaveLength(0);

    const edited = await segment.PATCH(
      jsonRequest("PATCH", `/api/sessions/${s.id}/segments/seg_b`, { rawText: "second final, edited", language: "en" }),
      ctx({ id: s.id, segId: "seg_b" }),
    );
    expect(edited.status).toBe(200);
    const ej = await edited.json();
    expect(ej.segment.editedByUser).toBe(true);
    expect(ej.segment.rawText).toBe("second final, edited");
    expect(ej.segment.cleanedText).toBeNull();
    expect(ej.events[0].type).toBe("segment.updated");

    const missing = await segment.PATCH(jsonRequest("PATCH", `/api/sessions/${s.id}/segments/nope`, { rawText: "x" }), ctx({ id: s.id, segId: "nope" }));
    expect(missing.status).toBe(404);

    const ev = await events.GET(jsonRequest("GET", `/api/sessions/${s.id}/events?since=2`), ctx({ id: s.id }));
    const evj = await ev.json();
    expect(evj.events.map((e: SessionEvent) => e.seq)).toEqual([3, 4]);
  });

  it("snapshot validates against the SessionSnapshot contract", async () => {
    const s = await createTestSession("Snapshot");
    await appendTestSegments(s.id, ["one", "two"]);
    const res = await snapshot.GET(jsonRequest("GET", `/api/sessions/${s.id}/snapshot`), ctx({ id: s.id }));
    expect(res.status).toBe(200);
    const parsed = SessionSnapshot.safeParse(await res.json());
    expect(parsed.success, JSON.stringify(parsed.error, null, 2)).toBe(true);
    if (parsed.success) {
      expect(parsed.data.segments).toHaveLength(2);
      expect(parsed.data.lastEventSeq).toBe(2);
      expect(parsed.data.session.durationMs).toBe(7500);
    }
  });

  it("exports markdown and json", async () => {
    const s = await createTestSession("Export title XYZ");
    await appendTestSegments(s.id, ["Vreau să construiesc un sistem de notițe.", "Then I will decide later."]);
    const md = await exportRoute.GET(jsonRequest("GET", `/api/sessions/${s.id}/export?format=md`), ctx({ id: s.id }));
    expect(md.status).toBe(200);
    expect(md.headers.get("content-disposition")).toMatch(/attachment; filename=".*\.md"/);
    const text = await md.text();
    expect(text).toContain("# Export title XYZ");
    expect(text).toContain("## Transcript");
    expect(text).toContain("**00:00** `en` Vreau să construiesc");
    expect(text).toContain("**00:04**");

    const js = await exportRoute.GET(jsonRequest("GET", `/api/sessions/${s.id}/export?format=json`), ctx({ id: s.id }));
    expect(js.headers.get("content-type")).toContain("application/json");
    expect(SessionSnapshot.safeParse(await js.json()).success).toBe(true);

    const bad = await exportRoute.GET(jsonRequest("GET", `/api/sessions/${s.id}/export?format=pdf`), ctx({ id: s.id }));
    expect(bad.status).toBe(400);
  });

  it("search finds segments and sessions (case-insensitive)", async () => {
    const s = await createTestSession("Searchable Title");
    await appendTestSegments(s.id, ["The quick brown FOX jumps"]);
    const res = await search.GET(jsonRequest("GET", "/api/search?q=brown%20fox"));
    const { results } = await res.json();
    const seg = results.find((r: { kind: string; sessionId: string }) => r.kind === "segment" && r.sessionId === s.id);
    expect(seg).toBeTruthy();
    expect(seg.sessionTitle).toBe("Searchable Title");
    expect(seg.atMs).toBe(0);
    const res2 = await search.GET(jsonRequest("GET", "/api/search?q=searchable"));
    const r2 = await res2.json();
    expect(r2.results.some((r: { kind: string; id: string }) => r.kind === "session" && r.id === s.id)).toBe(true);
    const empty = await search.GET(jsonRequest("GET", "/api/search?q="));
    expect((await empty.json()).results).toEqual([]);
  });
});
