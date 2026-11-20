"use client";

import { useMemo, useState } from "react";
import { Radio } from "lucide-react";
import type { SessionEvent } from "@/lib/contracts";
import { Button, Pill, cn, type PillTone } from "@/components/ui";
import { formatClock, useSessionStore } from "@/store/session-store";

type Group = "transcript" | "thoughts" | "graph" | "systems" | "scenes" | "actions" | "engine" | "session";

const GROUP_OF: Record<SessionEvent["type"], Group> = {
  "session.updated": "session",
  "segment.added": "transcript",
  "segment.updated": "transcript",
  "ingest.started": "engine",
  "ingest.finished": "engine",
  "thought.added": "thoughts",
  "thought.updated": "thoughts",
  "concept.added": "graph",
  "concept.updated": "graph",
  "relation.added": "graph",
  "relation.updated": "graph",
  "model.added": "systems",
  "model.updated": "systems",
  "version.added": "systems",
  "change.recorded": "systems",
  "scene.added": "scenes",
  "scene.updated": "scenes",
  "asset.added": "scenes",
  "action.added": "actions",
  "action.updated": "actions",
  "ambiguity.flagged": "engine",
  "summary.ready": "session",
  "engine.error": "engine",
};

const GROUPS: { id: Group; label: string; tone: PillTone }[] = [
  { id: "transcript", label: "Transcript", tone: "neutral" },
  { id: "thoughts", label: "Thoughts", tone: "accent" },
  { id: "graph", label: "Graph", tone: "accent" },
  { id: "systems", label: "Systems", tone: "warn" },
  { id: "scenes", label: "Scenes", tone: "ok" },
  { id: "actions", label: "Actions", tone: "ok" },
  { id: "engine", label: "Engine", tone: "muted" },
  { id: "session", label: "Session", tone: "muted" },
];
const toneOf = (g: Group) => GROUPS.find((x) => x.id === g)!.tone;

function describe(e: SessionEvent): string {
  switch (e.type) {
    case "session.updated":
      return `Session ${e.payload.status} · "${e.payload.title}"`;
    case "segment.added":
      return `Said: ${e.payload.rawText}`;
    case "segment.updated":
      return `Segment ${e.payload.editedByUser ? "edited" : "updated"}: ${e.payload.rawText}`;
    case "ingest.started":
      return `Processing ${e.payload.segmentIds.length} segment${e.payload.segmentIds.length === 1 ? "" : "s"}${e.payload.simulated ? " (simulated)" : ""}`;
    case "ingest.finished":
      return `Processed · focus: ${e.payload.focus}${e.payload.usage ? ` · ${e.payload.usage.inputTokens + e.payload.usage.outputTokens} tokens` : ""}`;
    case "thought.added":
      return `${e.payload.type.replace(/_/g, " ")} (${e.payload.provenance}): ${e.payload.text}`;
    case "thought.updated":
      return `Thought ${e.payload.status}: ${e.payload.text}`;
    case "concept.added":
      return `Concept: ${e.payload.label} (${e.payload.kind})`;
    case "concept.updated":
      return `Concept ${e.payload.status}: ${e.payload.label}`;
    case "relation.added":
      return `Relation: ${e.payload.type.replace(/_/g, " ")}`;
    case "relation.updated":
      return `Relation ${e.payload.status}: ${e.payload.type.replace(/_/g, " ")}`;
    case "model.added":
      return `System model: ${e.payload.name}`;
    case "model.updated":
      return `System model updated: ${e.payload.name} (v${e.payload.currentVersion})`;
    case "version.added":
      return `New version v${e.payload.version} · ${e.payload.snapshot.conceptIds.length} components`;
    case "change.recorded":
      return `${e.payload.kind}: ${e.payload.description}`;
    case "scene.added":
      return `Scene planned: ${e.payload.title} (${e.payload.kind})`;
    case "scene.updated":
      return `Scene ${e.payload.status}: ${e.payload.title}`;
    case "asset.added":
      return `Image ready${e.payload.simulated ? " (simulated)" : ""}`;
    case "action.added":
      return `Action: ${e.payload.text}`;
    case "action.updated":
      return `Action ${e.payload.status}: ${e.payload.text}`;
    case "ambiguity.flagged":
      return `Ambiguity: ${e.payload.text}`;
    case "summary.ready":
      return `Summary: ${e.payload.headline}`;
    case "engine.error":
      return `Error (${e.payload.stage}): ${e.payload.message}`;
  }
}

export function TimelineScrubber({ className }: { className?: string }) {
  const durationMs = useSessionStore((s) => s.durationMs);
  const cursor = useSessionStore((s) => s.timeCursor);
  const setCursor = useSessionStore((s) => s.setTimeCursor);
  const max = Math.max(durationMs, 1000);
  return (
    <div className={cn("flex items-center gap-2 text-xs", className)} data-testid="scrubber">
      <span className="font-mono text-text-1 tabular-nums w-11">{formatClock(cursor ?? durationMs)}</span>
      <input
        type="range"
        className="ts-range min-w-0 flex-1"
        min={0}
        max={max}
        step={250}
        value={cursor ?? max}
        onChange={(e) => {
          const v = Number(e.target.value);
          setCursor(v >= max ? null : v);
        }}
        aria-label="Time cursor"
      />
      <span className="font-mono text-text-2 tabular-nums">{formatClock(durationMs)}</span>
      <Button size="sm" variant={cursor === null ? "ghost" : "primary"} disabled={cursor === null} onClick={() => setCursor(null)} icon={<Radio size={12} />} data-testid="jump-to-live">
        Live
      </Button>
    </div>
  );
}

export function Timeline() {
  const events = useSessionStore((s) => s.events);
  const cursor = useSessionStore((s) => s.timeCursor);
  const setCursor = useSessionStore((s) => s.setTimeCursor);
  const select = useSessionStore((s) => s.select);
  const [enabled, setEnabled] = useState<Set<Group>>(new Set(GROUPS.map((g) => g.id).filter((g) => g !== "engine" && g !== "session")));

  const rows = useMemo(() => {
    const list = events.filter((e) => enabled.has(GROUP_OF[e.type]));
    return cursor === null ? list : list.filter((e) => e.atMs <= cursor);
  }, [events, enabled, cursor]);

  const toggle = (g: Group) =>
    setEnabled((s) => {
      const n = new Set(s);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });

  const onRowClick = (e: SessionEvent) => {
    const p = e.payload as { id?: string };
    if (e.type.startsWith("segment.")) select({ selectedSegmentId: p.id ?? null });
    else if (e.type.startsWith("thought.")) select({ selectedThoughtId: p.id ?? null, selectedConceptId: null });
    else if (e.type.startsWith("concept.")) select({ selectedConceptId: p.id ?? null, selectedThoughtId: null });
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="timeline">
      <div className="border-b border-border px-3 py-2">
        <TimelineScrubber />
        <p className="mt-1 text-[10px] text-text-2">
          Drag to travel back in time: every panel shows only what existed at that moment. {cursor !== null && <strong className="text-warn">Viewing the past.</strong>}
        </p>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border px-3 py-1.5">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => toggle(g.id)}
            className={cn("h-6 rounded-sm border px-1.5 text-xs", enabled.has(g.id) ? "border-accent bg-accent-soft text-text-0" : "border-border text-text-2")}
            aria-pressed={enabled.has(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <ol className="ts-panel-scroll min-h-0 flex-1 p-2">
        {rows.length === 0 && <li className="px-2 py-6 text-center text-sm text-text-2">No events yet.</li>}
        {rows.map((e) => (
          <li key={`${e.seq}-${e.type}`} className="flex gap-2 border-l border-border py-1 pl-3 text-sm" data-testid="timeline-row" data-event-type={e.type}>
            <button type="button" onClick={() => setCursor(e.atMs)} className="w-11 shrink-0 font-mono text-xs text-text-2 hover:text-accent" title="Set time cursor here">
              {formatClock(e.atMs)}
            </button>
            <Pill tone={toneOf(GROUP_OF[e.type])} className="shrink-0">
              {e.type.split(".")[0]}
            </Pill>
            <button type="button" onClick={() => onRowClick(e)} className="min-w-0 flex-1 text-left text-text-1 hover:text-text-0 ts-truncate-2">
              {describe(e)}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
