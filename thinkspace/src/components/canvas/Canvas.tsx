"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon, RotateCw, Shapes } from "lucide-react";
import type { Scene } from "@/lib/contracts";
import { Button, Pill, cn } from "@/components/ui";
import { FlowGraph, type GraphEdgeInput, type GraphNodeInput } from "@/components/mindmap/FlowGraph";
import { useController, useVisible } from "@/components/workspace/hooks";
import { selectScenesOrdered, useSessionStore } from "@/store/session-store";

type Chain = { id: string; versions: Scene[] };

/** Groups scenes into edit chains (parentSceneId) and orders chains by their newest version. */
function buildChains(scenes: Scene[]): Chain[] {
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const rootOf = (s: Scene): string => {
    let cur = s;
    const guard = new Set<string>();
    while (cur.parentSceneId && byId.has(cur.parentSceneId) && !guard.has(cur.id)) {
      guard.add(cur.id);
      cur = byId.get(cur.parentSceneId)!;
    }
    return cur.id;
  };
  const chains = new Map<string, Scene[]>();
  for (const s of scenes) {
    const r = rootOf(s);
    chains.set(r, [...(chains.get(r) ?? []), s]);
  }
  return Array.from(chains.entries())
    .map(([id, versions]) => ({ id, versions: versions.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }))
    .sort((a, b) => a.versions.at(-1)!.createdAt.localeCompare(b.versions.at(-1)!.createdAt));
}

export function Canvas({ mini }: { mini?: boolean }) {
  const scenes = useSessionStore((s) => s.scenes);
  const visible = useVisible();
  const chains = useMemo(() => buildChains(selectScenesOrdered(scenes).filter((s) => visible(s.id))), [scenes, visible]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focused = (focusId && chains.find((c) => c.id === focusId)) || chains.at(-1) || null;
  const others = chains.filter((c) => c.id !== focused?.id).reverse();

  if (!chains.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-text-2" data-testid="canvas">
        <ImageIcon size={20} className="text-text-2" />
        <p>Scenes appear here when the engine decides a picture or diagram would help. Structured scenes render instantly; image scenes are generated.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2" data-testid="canvas">
      <div className="min-h-0 flex-1">{focused && <SceneCard chain={focused} large={!mini} />}</div>
      {others.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1" data-testid="scene-strip">
          {others.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFocusId(c.id)}
              className="w-40 shrink-0 rounded-md border border-border bg-bg-2 p-2 text-left hover:border-border-strong"
              title={c.versions.at(-1)!.title}
            >
              <SceneThumb scene={c.versions.at(-1)!} />
              <p className="mt-1 truncate text-xs text-text-0">{c.versions.at(-1)!.title}</p>
              <p className="text-[10px] text-text-2">
                {c.versions.at(-1)!.kind}
                {c.versions.length > 1 && ` · ${c.versions.length} versions`}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SceneThumb({ scene }: { scene: Scene }) {
  const asset = useSessionStore((s) => (scene.assetId ? s.assets[scene.assetId] : undefined));
  // eslint-disable-next-line @next/next/no-img-element -- assets are served by our API, not optimizable by next/image
  if (asset) return <img src={asset.url} alt="" className="h-20 w-full rounded-sm object-cover" />;
  return (
    <div className={cn("flex h-20 w-full items-center justify-center rounded-sm bg-bg-3 text-text-2", scene.status === "generating" && "ts-shimmer")}>
      {scene.kind === "structured" || scene.kind === "diagram" ? <Shapes size={16} /> : <ImageIcon size={16} />}
    </div>
  );
}

function SceneCard({ chain, large }: { chain: Chain; large: boolean }) {
  const [versionIdx, setVersionIdx] = useState<number | null>(null);
  const idx = versionIdx !== null && versionIdx < chain.versions.length ? versionIdx : chain.versions.length - 1;
  const scene = chain.versions[idx];
  const asset = useSessionStore((s) => (scene.assetId ? s.assets[scene.assetId] : undefined));
  const concepts = useSessionStore((s) => s.concepts);
  const relations = useSessionStore((s) => s.relations);
  const segments = useSessionStore((s) => s.segments);
  const select = useSessionStore((s) => s.select);
  const setView = useSessionStore((s) => s.setView);
  const view = useSessionStore((s) => s.view);
  const controller = useController();

  const subgraph = useMemo(() => {
    const ids = new Set(scene.conceptIds);
    const nodes: GraphNodeInput[] = scene.conceptIds
      .map((id) => concepts[id])
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => ({ id: c.id, label: c.label, kind: c.kind }));
    const edges: GraphEdgeInput[] = Object.values(relations)
      .filter((r) => r.status === "active" && ids.has(r.fromId) && ids.has(r.toId))
      .map((r) => ({ id: r.id, source: r.fromId, target: r.toId, type: r.type, label: r.label }));
    return { nodes, edges };
  }, [scene.conceptIds, concepts, relations]);

  const isStructured = scene.kind === "structured" || scene.kind === "diagram";
  const focusConcept = (id: string) => {
    select({ selectedConceptId: id, selectedThoughtId: null });
    if (view !== "live" && view !== "mindmap") setView("mindmap");
  };

  return (
    <article className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-bg-2" data-testid="scene-card" data-scene-status={scene.status}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-text-0">{scene.title}</h3>
        <Pill tone="muted">{scene.kind}</Pill>
        {chain.versions.length > 1 && (
          <div className="flex items-center gap-1" aria-label="Scene versions">
            {chain.versions.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVersionIdx(i)}
                className={cn("h-5 rounded-sm border px-1.5 text-xs", i === idx ? "border-accent bg-accent-soft text-text-0" : "border-border text-text-2 hover:text-text-0")}
              >
                v{i + 1}
              </button>
            ))}
          </div>
        )}
        {scene.status === "generating" && <Pill tone="accent">generating…</Pill>}
        {scene.status === "failed" && <Pill tone="danger">failed</Pill>}
        {scene.status === "superseded" && <Pill tone="muted">superseded</Pill>}
      </header>

      <div className={cn("relative min-h-0 flex-1", large ? "min-h-48" : "min-h-32")}>
        {isStructured ? (
          <FlowGraph nodes={subgraph.nodes} edges={subgraph.edges} layout="layered" interactive={large} showControls={false} emptyMessage="No concepts linked to this scene yet." />
        ) : asset ? (
          <div className="relative flex h-full items-center justify-center bg-bg-0 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- API-served asset bytes */}
            <img src={asset.url} alt={scene.description} className="max-h-full max-w-full rounded-md object-contain" data-testid="scene-image" />
            {asset.simulated && (
              <span className="absolute right-2 top-2 rounded-sm bg-warn px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black" title="Placeholder image from the simulated provider">
                SIMULATED
              </span>
            )}
          </div>
        ) : (
          <div className={cn("flex h-full flex-col items-center justify-center gap-2 p-4 text-center", scene.status === "generating" && "ts-shimmer")}>
            <ImageIcon size={24} className="text-text-2" />
            <p className="max-w-md text-sm text-text-1">{scene.description}</p>
            {scene.status === "planned" && <p className="text-xs text-text-2">Queued for rendering…</p>}
            {scene.status === "failed" && (
              <div className="flex flex-col items-center gap-1">
                {scene.error && <p className="text-xs text-danger">{scene.error}</p>}
                <Button size="sm" icon={<RotateCw size={12} />} onClick={() => controller.retryRender(scene.id)} data-testid="scene-retry">
                  Retry render
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
        {!isStructured && asset && <p className="text-xs text-text-1 ts-truncate-2">{scene.description}</p>}
        <div className="flex flex-wrap items-center gap-1">
          {scene.conceptIds.map((id) => {
            const c = concepts[id];
            if (!c) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => focusConcept(id)}
                className="h-5 rounded-sm border border-border bg-bg-1 px-1.5 text-xs text-text-1 hover:border-accent hover:text-text-0"
                title={`Focus "${c.label}" in the mind map`}
              >
                {c.label}
              </button>
            );
          })}
          <span className="flex-1" />
          {scene.sourceSegmentIds[0] && segments[scene.sourceSegmentIds[0]] && (
            <button type="button" className="text-[10px] text-text-2 hover:text-accent" onClick={() => select({ selectedSegmentId: scene.sourceSegmentIds[0] })}>
              source
            </button>
          )}
          {scene.provider && <span className="text-[10px] text-text-2">{scene.provider}</span>}
        </div>
      </footer>
    </article>
  );
}
