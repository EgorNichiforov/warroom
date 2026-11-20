"use client";

import { useCallback, useMemo, useState } from "react";
import { Toggle, cn } from "@/components/ui";
import { selectGraph, useSessionStore } from "@/store/session-store";
import { useVisible } from "@/components/workspace/hooks";
import { FlowGraph, type GraphEdgeInput, type GraphNodeInput } from "./FlowGraph";
import { kindColor } from "./layout";

const CLUSTER_THRESHOLD = 60;

export function MindMap({ mini }: { mini?: boolean }) {
  const concepts = useSessionStore((s) => s.concepts);
  const relations = useSessionStore((s) => s.relations);
  const models = useSessionStore((s) => s.models);
  const versions = useSessionStore((s) => s.versions);
  const thoughts = useSessionStore((s) => s.thoughts);
  const selectedConceptId = useSessionStore((s) => s.selectedConceptId);
  const selectedThoughtId = useSessionStore((s) => s.selectedThoughtId);
  const showRevised = useSessionStore((s) => s.showRevised);
  const setShowRevised = useSessionStore((s) => s.setShowRevised);
  const select = useSessionStore((s) => s.select);
  const visible = useVisible();
  const [expandedKinds, setExpandedKinds] = useState<Set<string>>(new Set());

  // concept → model name (latest version membership) for grouping
  const groupOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of Object.values(models)) {
      if (m.status === "retracted") continue;
      const latest = Object.values(versions)
        .filter((v) => v.modelId === m.id)
        .sort((a, b) => b.version - a.version)[0];
      for (const id of latest?.snapshot.conceptIds ?? []) if (!map.has(id)) map.set(id, m.name);
    }
    return map;
  }, [models, versions]);

  const highlight = useMemo(() => {
    const set = new Set<string>();
    if (selectedConceptId) set.add(selectedConceptId);
    if (selectedThoughtId) for (const id of thoughts[selectedThoughtId]?.conceptIds ?? []) set.add(id);
    return set;
  }, [selectedConceptId, selectedThoughtId, thoughts]);

  const { nodes, edges, clustered } = useMemo(() => {
    const g = selectGraph(concepts, relations, { includeRevised: showRevised, visible });
    const mkNode = (c: (typeof g.nodes)[number]): GraphNodeInput => ({
      id: c.id,
      label: c.label,
      kind: c.kind,
      group: groupOf.get(c.id) ?? null,
      faded: c.status !== "active" || (highlight.size > 0 && !highlight.has(c.id) && !neighbours(c.id)),
      highlighted: highlight.has(c.id),
      title: `${c.label} · ${c.kind}${c.description ? ` — ${c.description}` : ""}${c.status !== "active" ? ` (${c.status})` : ""}`,
    });
    function neighbours(id: string) {
      return g.edges.some((e) => (e.fromId === id && highlight.has(e.toId)) || (e.toId === id && highlight.has(e.fromId)));
    }
    if (g.nodes.length <= CLUSTER_THRESHOLD) {
      return {
        clustered: false,
        nodes: g.nodes.map(mkNode),
        edges: g.edges.map<GraphEdgeInput>((r) => ({
          id: r.id,
          source: r.fromId,
          target: r.toId,
          type: r.type,
          label: r.label,
          faded: r.status !== "active" || (highlight.size > 0 && !highlight.has(r.fromId) && !highlight.has(r.toId)),
        })),
      };
    }
    // cluster by kind; expanded kinds show their members
    const nodeOut: GraphNodeInput[] = [];
    const idToNode = new Map<string, string>();
    const byKind = new Map<string, typeof g.nodes>();
    for (const c of g.nodes) byKind.set(c.kind, [...(byKind.get(c.kind) ?? []), c]);
    for (const [kind, list] of byKind) {
      if (expandedKinds.has(kind)) {
        for (const c of list) {
          nodeOut.push(mkNode(c));
          idToNode.set(c.id, c.id);
        }
      } else {
        const gid = `group:${kind}`;
        nodeOut.push({ id: gid, label: `${kind} (${list.length})`, kind, count: list.length, title: `Click to expand ${list.length} ${kind} concepts` });
        for (const c of list) idToNode.set(c.id, gid);
      }
    }
    const seen = new Map<string, GraphEdgeInput>();
    for (const r of g.edges) {
      const s = idToNode.get(r.fromId);
      const t = idToNode.get(r.toId);
      if (!s || !t || s === t) continue;
      const key = `${s}>${t}:${r.type}`;
      if (!seen.has(key)) seen.set(key, { id: key, source: s, target: t, type: r.type, label: r.label });
    }
    return { clustered: true, nodes: nodeOut, edges: Array.from(seen.values()) };
  }, [concepts, relations, showRevised, visible, groupOf, highlight, expandedKinds]);

  const onSelect = useCallback(
    (id: string | null) => {
      if (id?.startsWith("group:")) {
        const kind = id.slice(6);
        setExpandedKinds((s) => {
          const n = new Set(s);
          if (n.has(kind)) n.delete(kind);
          else n.add(kind);
          return n;
        });
        return;
      }
      select({ selectedConceptId: id, selectedThoughtId: null });
    },
    [select],
  );

  const kinds = useMemo(() => Array.from(new Set(Object.values(concepts).map((c) => c.kind))).sort(), [concepts]);

  return (
    <div className="relative flex h-full min-h-0 flex-col" data-testid="mindmap">
      {!mini && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-1.5 text-xs text-text-2">
          <span>
            {nodes.length} node{nodes.length === 1 ? "" : "s"} · {edges.length} relation{edges.length === 1 ? "" : "s"}
            {clustered && " · clustered by kind (click a group to expand)"}
          </span>
          <span className="flex-1" />
          <Toggle checked={showRevised} onChange={setShowRevised} label="Show revised" />
        </div>
      )}
      <div className="min-h-0 flex-1">
        <FlowGraph
          nodes={nodes}
          edges={edges}
          layout="radial"
          onSelect={onSelect}
          selectedId={selectedConceptId}
          interactive={!mini}
          showControls={!mini}
          emptyMessage="The mind map builds itself as you speak. Concepts appear as nodes, relations as edges."
        />
      </div>
      {!mini && kinds.length > 0 && (
        <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-2 rounded-md border border-border bg-bg-1/90 px-2 py-1 text-[10px] text-text-1">
          {kinds.map((k) => (
            <span key={k} className={cn("inline-flex items-center gap-1")}>
              <span className="inline-block size-2 rounded-sm" style={{ background: kindColor(k) }} />
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
