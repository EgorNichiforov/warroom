"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
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

const DIRECTIONAL = new Set(["advises", "controls", "reports_to", "contains", "depends_on", "feeds", "causes", "precedes", "part_of"]);
const edgeLabel = (type: string, label?: string | null) => (label ? label : type.replace(/_/g, " "));

function toEdge(e: GraphEdgeInput): Edge {
  const danger = e.type === "contradicts";
  const dashed = e.type === "alternative_to";
  const stroke = e.diff === "added" ? "var(--color-ok)" : e.diff === "removed" ? "var(--color-danger)" : danger ? "var(--color-danger)" : "var(--color-border-strong)";
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: edgeLabel(e.type, e.label),
    type: "smoothstep",
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
  const positions = useMemo(
    () => (layout === "layered" ? layeredLayout(nodes, edges) : radialLayout(nodes, edges)),
    // positions depend only on structure (ids/labels/groups/edges), not visual state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, nodes.map((n) => `${n.id}:${n.label}:${n.group ?? ""}`).join("|"), edges.map((e) => `${e.id}:${e.source}:${e.target}:${e.type}`).join("|")],
  );

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
  const rfEdges = useMemo(() => edges.map(toEdge), [edges]);
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
        proOptions={{ hideAttribution: true }}
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
