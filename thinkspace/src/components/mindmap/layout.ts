/**
 * Deterministic graph layouts without external layout libraries.
 *  - radialLayout: BFS depth from the most connected node → concentric rings; angular sectors are
 *    allocated proportionally to subtree size; siblings are ordered by group (model) then label so
 *    concepts that belong to the same system sit next to each other.
 *  - layeredLayout: longest-path layering along directed relation types (top-down hierarchy), with a
 *    barycenter ordering sweep to reduce crossings. Used for system models.
 */

export type LayoutNode = { id: string; label: string; kind: string; group?: string | null };
export type LayoutEdge = { id: string; source: string; target: string; type: string };
export type Point = { x: number; y: number };
export type Positions = Record<string, Point>;

export const NODE_W = 168;
export const NODE_H = 40;

const byLabel = (a: LayoutNode, b: LayoutNode) =>
  (a.group ?? "~").localeCompare(b.group ?? "~") || a.label.localeCompare(b.label) || a.id.localeCompare(b.id);

function adjacency(nodes: LayoutNode[], edges: LayoutEdge[]) {
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of edges) {
    if (!adj.has(e.source) || !adj.has(e.target) || e.source === e.target) continue;
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }
  return adj;
}

export function radialLayout(nodes: LayoutNode[], edges: LayoutEdge[], opts: { ringGap?: number } = {}): Positions {
  const pos: Positions = {};
  if (nodes.length === 0) return pos;
  if (nodes.length === 1) {
    pos[nodes[0].id] = { x: 0, y: 0 };
    return pos;
  }
  const ringGap = opts.ringGap ?? 190;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = adjacency(nodes, edges);
  const degree = (id: string) => adj.get(id)?.size ?? 0;
  const sortedNodes = nodes.slice().sort(byLabel);

  // components
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const n of sortedNodes) {
    if (seen.has(n.id)) continue;
    const comp: string[] = [];
    const stack = [n.id];
    seen.add(n.id);
    while (stack.length) {
      const id = stack.pop()!;
      comp.push(id);
      for (const m of adj.get(id) ?? []) {
        if (!seen.has(m)) {
          seen.add(m);
          stack.push(m);
        }
      }
    }
    components.push(comp);
  }
  components.sort((a, b) => b.length - a.length);
  const rootOf = (comp: string[]) =>
    comp.slice().sort((a, b) => degree(b) - degree(a) || byLabel(byId.get(a)!, byId.get(b)!))[0];

  const mainRoot = rootOf(components[0]);
  const children = new Map<string, string[]>();
  const depth = new Map<string, number>();
  const visit = new Set<string>();

  // BFS tree from the main root; other components hang off the main root as pseudo-children
  const queue: string[] = [mainRoot];
  depth.set(mainRoot, 0);
  visit.add(mainRoot);
  for (const comp of components.slice(1)) {
    const r = rootOf(comp);
    children.set(mainRoot, [...(children.get(mainRoot) ?? []), r]);
    depth.set(r, 1);
    visit.add(r);
    queue.push(r);
  }
  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id)!;
    const kids = Array.from(adj.get(id) ?? [])
      .filter((m) => !visit.has(m))
      .sort((a, b) => byLabel(byId.get(a)!, byId.get(b)!));
    for (const k of kids) {
      visit.add(k);
      depth.set(k, d + 1);
      queue.push(k);
    }
    children.set(id, [...(children.get(id) ?? []), ...kids]);
  }

  // subtree leaf counts
  const leaves = new Map<string, number>();
  const countLeaves = (id: string): number => {
    const kids = children.get(id) ?? [];
    const v = kids.length === 0 ? 1 : kids.reduce((s, k) => s + countLeaves(k), 0);
    leaves.set(id, v);
    return v;
  };
  countLeaves(mainRoot);

  // ring radii: enough perimeter for the nodes on each ring
  const perDepth = new Map<number, number>();
  for (const d of depth.values()) perDepth.set(d, (perDepth.get(d) ?? 0) + 1);
  const maxDepth = Math.max(...depth.values());
  const radius: number[] = [0];
  for (let d = 1; d <= maxDepth; d++) {
    const need = ((perDepth.get(d) ?? 0) * (NODE_W + 24)) / (2 * Math.PI);
    radius[d] = Math.max(radius[d - 1] + ringGap, need);
  }

  const place = (id: string, start: number, end: number) => {
    const d = depth.get(id)!;
    const mid = (start + end) / 2;
    pos[id] = d === 0 ? { x: 0, y: 0 } : { x: Math.cos(mid) * radius[d], y: Math.sin(mid) * radius[d] };
    const kids = children.get(id) ?? [];
    if (!kids.length) return;
    const total = kids.reduce((s, k) => s + (leaves.get(k) ?? 1), 0);
    // children of a non-root node stay within the parent's sector; root spans the full circle
    let a = start;
    for (const k of kids) {
      const span = ((end - start) * (leaves.get(k) ?? 1)) / total;
      place(k, a, a + span);
      a += span;
    }
  };
  place(mainRoot, -Math.PI / 2, (3 * Math.PI) / 2);
  // Center node positions on the node box
  for (const id of Object.keys(pos)) pos[id] = { x: pos[id].x - NODE_W / 2, y: pos[id].y - NODE_H / 2 };
  return pos;
}

/** Which end of a relation is "above" in a hierarchy. */
const UP_FROM = new Set(["contains", "controls", "advises", "feeds", "causes", "precedes"]);
const UP_TO = new Set(["part_of", "reports_to", "depends_on"]);

export function layeredLayout(nodes: LayoutNode[], edges: LayoutEdge[], opts: { hGap?: number; vGap?: number } = {}): Positions {
  const pos: Positions = {};
  if (!nodes.length) return pos;
  const hGap = opts.hGap ?? 32;
  const vGap = opts.vGap ?? 72;
  const ids = new Set(nodes.map((n) => n.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // directed edges parent → child
  const down = new Map<string, Set<string>>();
  const up = new Map<string, Set<string>>();
  for (const id of ids) {
    down.set(id, new Set());
    up.set(id, new Set());
  }
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target) || e.source === e.target) continue;
    let parent: string | null = null;
    let child: string | null = null;
    if (UP_FROM.has(e.type)) [parent, child] = [e.source, e.target];
    else if (UP_TO.has(e.type)) [parent, child] = [e.target, e.source];
    if (parent && child) {
      down.get(parent)!.add(child);
      up.get(child)!.add(parent);
    }
  }
  // break cycles: ignore back edges found by DFS
  const state = new Map<string, 0 | 1 | 2>();
  const sortedIds = nodes.slice().sort(byLabel).map((n) => n.id);
  const dfs = (id: string) => {
    state.set(id, 1);
    for (const c of Array.from(down.get(id) ?? [])) {
      const st = state.get(c) ?? 0;
      if (st === 1) {
        down.get(id)!.delete(c);
        up.get(c)!.delete(id);
      } else if (st === 0) dfs(c);
    }
    state.set(id, 2);
  };
  for (const id of sortedIds) if (!state.get(id)) dfs(id);

  // longest path layering
  const layer = new Map<string, number>();
  const compute = (id: string): number => {
    if (layer.has(id)) return layer.get(id)!;
    const parents = Array.from(up.get(id) ?? []);
    const l = parents.length ? Math.max(...parents.map(compute)) + 1 : 0;
    layer.set(id, l);
    return l;
  };
  for (const id of sortedIds) compute(id);

  // isolated nodes (no directed edges) that have undirected neighbours: put them next to the neighbour's layer
  const undirected = adjacency(nodes, edges);
  for (const id of sortedIds) {
    if ((up.get(id)?.size ?? 0) === 0 && (down.get(id)?.size ?? 0) === 0) {
      const nb = Array.from(undirected.get(id) ?? []).filter((n) => (up.get(n)?.size ?? 0) + (down.get(n)?.size ?? 0) > 0);
      if (nb.length) layer.set(id, layer.get(nb[0]) ?? 0);
    }
  }

  const layers: string[][] = [];
  for (const id of sortedIds) {
    const l = layer.get(id) ?? 0;
    (layers[l] ??= []).push(id);
  }
  for (let i = 0; i < layers.length; i++) layers[i] ??= [];

  // barycenter ordering (two sweeps)
  const index = new Map<string, number>();
  layers.forEach((row) => row.forEach((id, i) => index.set(id, i)));
  const bary = (id: string, neighbours: Set<string> | undefined) => {
    const arr = Array.from(neighbours ?? []).map((n) => index.get(n)!).filter((v) => v !== undefined);
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : index.get(id)!;
  };
  for (let sweep = 0; sweep < 2; sweep++) {
    for (let l = 1; l < layers.length; l++) {
      layers[l].sort((a, b) => bary(a, up.get(a)) - bary(b, up.get(b)) || byLabel(byId.get(a)!, byId.get(b)!));
      layers[l].forEach((id, i) => index.set(id, i));
    }
    for (let l = layers.length - 2; l >= 0; l--) {
      layers[l].sort((a, b) => bary(a, down.get(a)) - bary(b, down.get(b)) || byLabel(byId.get(a)!, byId.get(b)!));
      layers[l].forEach((id, i) => index.set(id, i));
    }
  }

  const widest = Math.max(...layers.map((row) => row.length));
  const totalW = widest * NODE_W + (widest - 1) * hGap;
  layers.forEach((row, l) => {
    const rowW = row.length * NODE_W + (row.length - 1) * hGap;
    const x0 = (totalW - rowW) / 2;
    row.forEach((id, i) => {
      pos[id] = { x: x0 + i * (NODE_W + hGap), y: l * (NODE_H + vGap) };
    });
  });
  return pos;
}

export const KIND_COLORS: Record<string, string> = {
  concept: "#6ea8fe",
  component: "#9b8cff",
  actor: "#4fcf8f",
  process: "#f0b35a",
  resource: "#3ec9c0",
  place: "#d08cff",
  object: "#a8b1bd",
  goal: "#7bd88f",
  problem: "#ef6b73",
  metric: "#5fd3e6",
  other: "#6f7a88",
  group: "#a8b1bd",
};
export const kindColor = (kind: string) => KIND_COLORS[kind] ?? KIND_COLORS.other;
