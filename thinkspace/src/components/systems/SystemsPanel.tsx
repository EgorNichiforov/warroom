"use client";

import { useMemo, useState } from "react";
import { GitCompare, History } from "lucide-react";
import type { ChangeEvent, ModelSnapshot, ModelVersion } from "@/lib/contracts";
import { Button, Pill, cn } from "@/components/ui";
import { FlowGraph, type DiffState, type GraphEdgeInput, type GraphNodeInput } from "@/components/mindmap/FlowGraph";
import { NODE_H, NODE_W, layeredLayout } from "@/components/mindmap/layout";
import { useVisible } from "@/components/workspace/hooks";
import { formatClock, selectModelVersions, useSessionStore } from "@/store/session-store";

function snapshotGraph(snap: ModelSnapshot, diff?: { added: Set<string>; removed: Set<string> }) {
  const nodes: GraphNodeInput[] = snap.concepts.map((c) => ({
    id: c.id,
    label: c.label,
    kind: c.kind,
    diff: diff ? (diff.added.has(c.id) ? "added" : diff.removed.has(c.id) ? "removed" : "unchanged") : undefined,
  }));
  const ids = new Set(nodes.map((n) => n.id));
  const edges: GraphEdgeInput[] = snap.relations
    .filter((r) => ids.has(r.fromId) && ids.has(r.toId))
    .map((r) => ({
      id: r.id,
      source: r.fromId,
      target: r.toId,
      type: r.type,
      label: r.label,
      diff: diff ? (diff.added.has(r.id) ? "added" : diff.removed.has(r.id) ? "removed" : "unchanged") : undefined,
    }));
  return { nodes, edges };
}

/**
 * Union graph of two versions laid out ONCE so both panes line up: the left pane shows `before`
 * (removed items red, added ones invisible), the right pane shows `after` (added green, removed invisible).
 */
function compareGraphs(before: ModelSnapshot, after: ModelSnapshot) {
  const beforeC = new Set(before.conceptIds);
  const afterC = new Set(after.conceptIds);
  const beforeR = new Set(before.relationIds);
  const afterR = new Set(after.relationIds);
  const added = new Set([...afterC].filter((id) => !beforeC.has(id)).concat([...afterR].filter((id) => !beforeR.has(id))));
  const removed = new Set([...beforeC].filter((id) => !afterC.has(id)).concat([...beforeR].filter((id) => !afterR.has(id))));
  const unionSnap: ModelSnapshot = {
    conceptIds: Array.from(new Set([...before.conceptIds, ...after.conceptIds])),
    relationIds: Array.from(new Set([...before.relationIds, ...after.relationIds])),
    concepts: [...after.concepts, ...before.concepts.filter((c) => !afterC.has(c.id))],
    relations: [...after.relations, ...before.relations.filter((r) => !afterR.has(r.id))],
  };
  const union = snapshotGraph(unionSnap, { added, removed });
  const positions = layeredLayout(union.nodes, union.edges);
  const pts = Object.values(positions);
  const minX = Math.min(...pts.map((p) => p.x), 0);
  const minY = Math.min(...pts.map((p) => p.y), 0);
  const maxX = Math.max(...pts.map((p) => p.x + NODE_W), NODE_W);
  const maxY = Math.max(...pts.map((p) => p.y + NODE_H), NODE_H);
  const fitRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  const left = {
    nodes: union.nodes.map((n) => ({ ...n, diff: (removed.has(n.id) ? "removed" : "unchanged") as DiffState, hidden: added.has(n.id) })),
    edges: union.edges.map((e) => ({ ...e, diff: (removed.has(e.id) ? "removed" : "unchanged") as DiffState, hidden: added.has(e.id) || added.has(e.source) || added.has(e.target) })),
  };
  const right = {
    nodes: union.nodes.map((n) => ({ ...n, diff: (added.has(n.id) ? "added" : "unchanged") as DiffState, hidden: removed.has(n.id) })),
    edges: union.edges.map((e) => ({ ...e, diff: (added.has(e.id) ? "added" : "unchanged") as DiffState, hidden: removed.has(e.id) || removed.has(e.source) || removed.has(e.target) })),
  };
  return { left, right, added, removed, positions, fitRect };
}

export function SystemsPanel({ mini }: { mini?: boolean }) {
  const models = useSessionStore((s) => s.models);
  const versions = useSessionStore((s) => s.versions);
  const changes = useSessionStore((s) => s.changes);
  const segments = useSessionStore((s) => s.segments);
  const select = useSessionStore((s) => s.select);
  const visible = useVisible();

  const modelList = useMemo(
    () => Object.values(models).filter((m) => m.status !== "retracted" && visible(m.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [models, visible],
  );
  const [modelId, setModelId] = useState<string | null>(null);
  const activeModelId = modelId && models[modelId] ? modelId : modelList.at(-1)?.id ?? null;
  const model = activeModelId ? models[activeModelId] : null;

  const versionList = useMemo(
    () => (activeModelId ? selectModelVersions(versions, activeModelId).filter((v) => visible(v.id)) : []),
    [versions, activeModelId, visible],
  );
  // the selected version is remembered per (model, version count): new versions re-select the latest
  const [versionSel, setVersionSel] = useState<{ modelId: string | null; count: number; version: number } | null>(null);
  const versionNo = versionSel && versionSel.modelId === activeModelId && versionSel.count === versionList.length ? versionSel.version : null;
  const setVersionNo = (v: number | null) => setVersionSel(v === null ? null : { modelId: activeModelId, count: versionList.length, version: v });
  const [compare, setCompare] = useState(false);
  const [compareFrom, setCompareFrom] = useState<number | null>(null);

  const current: ModelVersion | undefined =
    (versionNo !== null ? versionList.find((v) => v.version === versionNo) : undefined) ?? versionList.at(-1);
  const previous: ModelVersion | undefined = useMemo(() => {
    if (!current) return undefined;
    const from = compareFrom !== null ? versionList.find((v) => v.version === compareFrom) : undefined;
    return from ?? versionList.filter((v) => v.version < current.version).at(-1);
  }, [current, compareFrom, versionList]);

  const changeLog = useMemo(
    () =>
      Object.values(changes)
        .filter((c) => c.modelId === activeModelId && visible(c.id))
        .sort((a, b) => (b.afterVersion ?? 0) - (a.afterVersion ?? 0) || b.createdAt.localeCompare(a.createdAt)),
    [changes, activeModelId, visible],
  );

  const graph = useMemo(() => (current ? snapshotGraph(current.snapshot) : { nodes: [], edges: [] }), [current]);
  const cmp = useMemo(() => (compare && current && previous ? compareGraphs(previous.snapshot, current.snapshot) : null), [compare, current, previous]);

  if (modelList.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-text-2" data-testid="systems-panel">
        System models appear when you describe a structure — departments, components, flows. Each change becomes a new version; nothing is overwritten.
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0", mini ? "flex-col" : "flex-col lg:flex-row")} data-testid="systems-panel">
      {/* model list */}
      {!mini && (
        <aside className="shrink-0 border-b border-border lg:w-56 lg:border-b-0 lg:border-r">
          <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col">
            {modelList.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setModelId(m.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap lg:whitespace-normal",
                    m.id === activeModelId ? "bg-accent-soft text-text-0" : "text-text-1 hover:bg-bg-2",
                  )}
                  data-testid="model-item"
                >
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <Pill tone="muted">v{m.currentVersion}</Pill>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* version controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 text-xs">
          <span className="truncate text-sm font-medium text-text-0">{model?.name}</span>
          {model?.description && !mini && <span className="hidden truncate text-text-2 md:inline">— {model.description}</span>}
          <span className="flex-1" />
          {versionList.length > 1 && (
            <label className="flex items-center gap-2 text-text-1">
              <span className="font-mono">v{current?.version}</span>
              <input
                type="range"
                className="ts-range w-28"
                min={versionList[0]?.version ?? 1}
                max={versionList.at(-1)?.version ?? 1}
                step={1}
                value={current?.version ?? 1}
                onChange={(e) => setVersionNo(Number(e.target.value))}
                aria-label="Model version"
                data-testid="version-slider"
              />
              <span className="font-mono text-text-2">/ v{versionList.at(-1)?.version}</span>
            </label>
          )}
          {versionList.length > 1 && (
            <Button
              size="sm"
              variant={compare ? "primary" : "secondary"}
              icon={<GitCompare size={12} />}
              onClick={() => setCompare((c) => !c)}
              data-testid="compare-toggle"
            >
              Compare
            </Button>
          )}
        </div>

        {/* diagram(s) */}
        <div className={cn("min-h-0 flex-1", cmp ? "grid grid-rows-2 lg:grid-cols-2 lg:grid-rows-1" : "")}>
          {cmp && previous && current ? (
            <>
              <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
                <div className="flex items-center gap-2 px-3 py-1 text-xs text-text-2">
                  Before · <span className="font-mono">v{previous.version}</span>
                  {versionList.length > 2 && (
                    <select
                      className="ml-1 h-5 rounded-sm border border-border bg-bg-2 px-1 text-xs"
                      value={previous.version}
                      onChange={(e) => setCompareFrom(Number(e.target.value))}
                      aria-label="Compare from version"
                    >
                      {versionList
                        .filter((v) => v.version < current.version)
                        .map((v) => (
                          <option key={v.id} value={v.version}>
                            v{v.version}
                          </option>
                        ))}
                    </select>
                  )}
                  <span className={cmp.removed.size ? "text-danger" : "text-text-2"}>{cmp.removed.size} removed</span>
                </div>
                <div className="min-h-0 flex-1">
                  <FlowGraph nodes={cmp.left.nodes} edges={cmp.left.edges} layout="layered" positions={cmp.positions} fitRect={cmp.fitRect} interactive={!mini} showControls={false} />
                </div>
              </div>
              <div className="flex min-h-0 flex-col">
                <div className="flex items-center gap-2 px-3 py-1 text-xs text-text-2">
                  After · <span className="font-mono">v{current.version}</span>
                  <span className={cmp.added.size ? "text-ok" : "text-text-2"}>{cmp.added.size} added</span>
                </div>
                <div className="min-h-0 flex-1">
                  <FlowGraph nodes={cmp.right.nodes} edges={cmp.right.edges} layout="layered" positions={cmp.positions} fitRect={cmp.fitRect} interactive={!mini} showControls={false} />
                </div>
              </div>
            </>
          ) : (
            <FlowGraph
              nodes={graph.nodes}
              edges={graph.edges}
              layout="layered"
              interactive={!mini}
              showControls={!mini}
              onSelect={(id) => select({ selectedConceptId: id })}
              emptyMessage="This version has no components."
            />
          )}
        </div>

        {/* change log */}
        {!mini && changeLog.length > 0 && (
          <div className="max-h-56 shrink-0 overflow-auto border-t border-border" data-testid="change-log">
            <h3 className="flex items-center gap-1.5 px-3 pt-2 text-xs font-medium uppercase tracking-wide text-text-2">
              <History size={12} /> Change log
            </h3>
            <ul className="flex flex-col gap-1 p-2">
              {changeLog.map((c) => (
                <ChangeRow
                  key={c.id}
                  change={c}
                  active={c.afterVersion === current?.version}
                  onJump={() => c.afterVersion && setVersionNo(c.afterVersion)}
                  onSource={() => {
                    const id = c.sourceSegmentIds[0];
                    if (id) select({ selectedSegmentId: id });
                  }}
                  sourceAt={c.sourceSegmentIds.map((id) => segments[id]?.startedMs).find((v) => v !== undefined)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeRow({
  change: c,
  active,
  onJump,
  onSource,
  sourceAt,
}: {
  change: ChangeEvent;
  active: boolean;
  onJump: () => void;
  onSource: () => void;
  sourceAt?: number;
}) {
  return (
    <li className={cn("rounded-md border px-2.5 py-2 text-sm", active ? "border-accent/50 bg-accent-soft" : "border-border bg-bg-1")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={c.kind === "correction" ? "warn" : c.kind === "remove" ? "danger" : "accent"}>{c.kind}</Pill>
        {c.beforeVersion !== null && c.afterVersion !== null && (
          <button type="button" onClick={onJump} className="font-mono text-xs text-text-1 hover:text-accent">
            v{c.beforeVersion} → v{c.afterVersion}
          </button>
        )}
        {c.sourceSegmentIds.length > 0 && (
          <button type="button" onClick={onSource} className="font-mono text-xs text-text-2 hover:text-accent" title="Show source segment">
            {sourceAt !== undefined ? formatClock(sourceAt) : "source"}
          </button>
        )}
      </div>
      <p className="mt-1 text-text-0">{c.description}</p>
      {c.implications.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-xs text-text-1">
          {c.implications.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
      )}
      {c.unresolved.length > 0 && (
        <ul className="mt-1 pl-0 text-xs text-warn">
          {c.unresolved.map((u, idx) => (
            <li key={idx}>? {u}</li>
          ))}
        </ul>
      )}
    </li>
  );
}
