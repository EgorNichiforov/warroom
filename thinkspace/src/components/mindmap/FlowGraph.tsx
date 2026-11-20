"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import type { Positions } from "./layout";
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getStraightPath,
  useInternalNode,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { cn } from "@/components/ui";
import { NODE_H, NODE_W, kindColor, layeredLayout, radialLayout, type LayoutEdge, type LayoutNode } from "./layout";

export type DiffState = "added" | "removed" | "unchanged";

export type GraphNodeInput = LayoutNode & {
  /** visual state */
  faded?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  diff?: DiffState;
  count?: number; // for cluster/group nodes
  title?: string;
};
export type GraphEdgeInput = LayoutEdge & { label?: string | null; faded?: boolean; diff?: DiffState };

type ConceptData = {
  label: string;
  kind: string;
  faded?: boolean;
  highlighted?: boolean;
  diff?: DiffState;
  count?: number;
  title?: string;
  group?: string | null;
};
type ConceptNode = Node<ConceptData, "concept">;

const ConceptNodeView = memo(function ConceptNodeView({ data, selected }: NodeProps<ConceptNode>) {
  const color = kindColor(data.kind);
  const diffClass =
    data.diff === "added" ? "border-ok bg-ok-soft" : data.diff === "removed" ? "border-danger bg-danger-soft line-through" : "border-border bg-bg-2";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 text-sm shadow-sm",
        diffClass,
        selected && "ring-2 ring-accent",
        data.highlighted && !selected && "ring-1 ring-accent/60",
        data.faded && "opacity-40",
      )}
      style={{ width: NODE_W, height: NODE_H, borderLeftWidth: 3, borderLeftColor: color }}
      title={data.title ?? `${data.label} · ${data.kind}${data.group ? ` · ${data.group}` : ""}`}
    >
      <Handle type="target" position={Position.Top} />
      <span className="min-w-0 flex-1 truncate text-text-0">{data.label}</span>
      {data.count !== undefined ? (
        <span className="rounded-sm bg-bg-3 px-1 text-xs text-text-1">{data.count}</span>
      ) : (
        <span className="text-[10px] uppercase tracking-wide" style={{ color }}>
          {data.kind.slice(0, 4)}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

const nodeTypes = { concept: ConceptNodeView };

/** Point where the segment from a rectangle's center towards `to` leaves the rectangle. */
function borderPoint(cx: number, cy: number, w: number, h: number, tx: number, ty: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = Math.abs(dx) > 0 ? w / 2 / Math.abs(dx) : Infinity;
  const sy = Math.abs(dy) > 0 ? h / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(sx, sy);
  return { x: cx + dx * t, y: cy + dy * t };
}

/** Straight center-to-center edge clipped at node borders (radial mind map). */
function FloatingEdge({ id, source, target, style, label, labelStyle, labelBgStyle, labelBgPadding, labelBgBorderRadius, markerEnd, interactionWidth }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const sw = s.measured.width ?? NODE_W;
  const sh = s.measured.height ?? NODE_H;
  const tw = t.measured.width ?? NODE_W;
  const th = t.measured.height ?? NODE_H;
  const scx = s.internals.positionAbsolute.x + sw / 2;
  const scy = s.internals.positionAbsolute.y + sh / 2;
  const tcx = t.internals.positionAbsolute.x + tw / 2;
  const tcy = t.internals.positionAbsolute.y + th / 2;
  const a = borderPoint(scx, scy, sw, sh, tcx, tcy);
  const b = borderPoint(tcx, tcy, tw, th, scx, scy);
  const [path, labelX, labelY] = getStraightPath({ sourceX: a.x, sourceY: a.y, targetX: b.x, targetY: b.y });
  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={labelStyle}
      labelShowBg
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
    />
  );
}
const edgeTypes = { floating: FloatingEdge };

const layoutCache = new Map<string, Positions>();
function cachedLayout(key: string, layout: "radial" | "layered", nodes: LayoutNode[], edges: LayoutEdge[]): Positions {
  const hit = layoutCache.get(key);
  if (hit) return hit;
  const pos = layout === "layered" ? layeredLayout(nodes, edges) : radialLayout(nodes, edges);
  if (layoutCache.size > 200) layoutCache.delete(layoutCache.keys().next().value as string);
  layoutCache.set(key, pos);
  return pos;
}

const DIRECTIONAL = new Set(["advises", "controls", "reports_to", "contains", "depends_on", "feeds", "causes", "precedes", "part_of"]);
const edgeLabel = (type: string, label?: string | null) => (label ? label : type.replace(/_/g, " "));

function toEdge(e: GraphEdgeInput, layout: "radial" | "layered"): Edge {
  const danger = e.type === "contradicts";
  const dashed = e.type === "alternative_to";
  const stroke = e.diff === "added" ? "var(--color-ok)" : e.diff === "removed" ? "var(--color-danger)" : danger ? "var(--color-danger)" : "var(--color-border-strong)";
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: edgeLabel(e.type, e.label),
    type: layout === "radial" ? "floating" : "smoothstep",
    animated: false,
    style: {
      stroke,
      strokeWidth: e.diff && e.diff !== "unchanged" ? 2 : 1.25,
      strokeDasharray: dashed || e.diff === "removed" ? "6 4" : undefined,
      opacity: e.faded ? 0.3 : 1,
    },
    labelStyle: { fill: "var(--color-text-1)", fontSize: 10, opacity: e.faded ? 0.4 : 1 },
    labelBgStyle: { fill: "var(--color-bg-1)", fillOpacity: 0.9 },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 3,
    markerEnd: DIRECTIONAL.has(e.type) ? { type: MarkerType.ArrowClosed, width: 16, height: 16, color: stroke } : undefined,
  };
}

/** Several relations between the same two nodes render as one edge with a combined label. */
function mergeParallel(edges: GraphEdgeInput[]): GraphEdgeInput[] {
  const groups = new Map<string, GraphEdgeInput[]>();
  for (const e of edges) {
    const key = [e.source, e.target].sort().join("::");
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const out: GraphEdgeInput[] = [];
  for (const list of groups.values()) {
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    const primary = list.find((e) => DIRECTIONAL.has(e.type)) ?? list[0];
    const labels = Array.from(new Set(list.map((e) => edgeLabel(e.type, e.label))));
    out.push({ ...primary, id: list.map((e) => e.id).join("+"), label: labels.join(" · "), faded: list.every((e) => e.faded) });
  }
  return out;
}

function FitOnChange({ signature }: { signature: string }) {
  const { fitView } = useReactFlow();
  const first = useRef(true);
  useEffect(() => {
    const t = setTimeout(() => {
      void fitView({ padding: 0.2, duration: first.current ? 0 : 250, maxZoom: 1.2 });
      first.current = false;
    }, 30);
    return () => clearTimeout(t);
  }, [signature, fitView]);
  return null;
}

export type FlowGraphProps = {
  nodes: GraphNodeInput[];
  edges: GraphEdgeInput[];
  layout?: "radial" | "layered";
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
  interactive?: boolean;
  showControls?: boolean;
  className?: string;
  emptyMessage?: string;
};

export function FlowGraph(props: FlowGraphProps) {
  return (
    <ReactFlowProvider>
      <FlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}

function FlowGraphInner({
  nodes,
  edges,
  layout = "radial",
  onSelect,
  selectedId,
  interactive = true,
  showControls = true,
  className,
  emptyMessage = "Nothing to show yet.",
}: FlowGraphProps) {
  // positions depend only on structure (ids/labels/groups/edges), not on visual state → cached by key
  const structureKey =
    layout + "@" + nodes.map((n) => `${n.id}:${n.label}:${n.group ?? ""}`).join("|") + "#" + edges.map((e) => `${e.id}:${e.source}:${e.target}:${e.type}`).join("|");
  const positions = useMemo(() => cachedLayout(structureKey, layout, nodes, edges), [structureKey, layout, nodes, edges]);

  const rfNodes = useMemo<ConceptNode[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: "concept",
        position: positions[n.id] ?? { x: 0, y: 0 },
        data: {
          label: n.label,
          kind: n.kind,
          faded: n.faded,
          highlighted: n.highlighted,
          diff: n.diff,
          count: n.count,
          title: n.title,
          group: n.group,
        },
        selected: n.id === selectedId,
        draggable: interactive,
        selectable: true,
        width: NODE_W,
        height: NODE_H,
      })),
    [nodes, positions, selectedId, interactive],
  );
  const rfEdges = useMemo(() => mergeParallel(edges).map((e) => toEdge(e, layout)), [edges, layout]);
  const signature = useMemo(() => `${layout}:${nodes.map((n) => n.id).join(",")}:${edges.length}`, [layout, nodes, edges.length]);

  if (!nodes.length) {
    return (
      <div className={cn("flex h-full items-center justify-center p-6 text-center text-sm text-text-2", className)}>{emptyMessage}</div>
    );
  }

  return (
    <div className={cn("h-full w-full", className)} data-testid="flow-graph">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.1}
        maxZoom={2}
        nodesConnectable={false}
        elementsSelectable
        nodesDraggable={interactive}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        zoomOnDoubleClick={false}
        preventScrolling={interactive}
        onNodeClick={(_, n) => onSelect?.(n.id)}
        onPaneClick={() => onSelect?.(null)}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={24} size={1} color="var(--color-border)" />
        {showControls && interactive && <Controls showInteractive={false} position="bottom-right" />}
        <FitOnChange signature={signature} />
      </ReactFlow>
    </div>
  );
}
