/**
 * One zustand store holding a SessionSnapshot-shaped state plus UI state for the
 * open session. `applyEvent` is the single reducer for every SessionEvent; the same
 * reducer is used for live streams and for replaying the event log.
 */
import { create } from "zustand";
import type {
  ActionItem,
  Asset,
  ChangeEvent,
  Concept,
  ModelVersion,
  Relation,
  Scene,
  Session,
  SessionEvent,
  SessionSnapshot,
  SessionSummary,
  SystemModel,
  Thought,
  TranscriptSegment,
} from "@/lib/contracts";
import type { Language } from "@/lib/contracts";
import type { SpeechProviderName, SpeechStatus } from "@/lib/speech/types";

export type ThinkingState = "idle" | "listening" | "paused" | "processing" | "ended";
export type ConnectionState = "online" | "offline";
export type SaveStatus = "saved" | "saving" | "unsaved";
export type ViewId = "live" | "canvas" | "mindmap" | "systems" | "transcript" | "actions" | "timeline";
export const VIEW_IDS: ViewId[] = ["live", "canvas", "mindmap", "systems", "transcript", "actions", "timeline"];

export type Ambiguity = {
  id: string;
  text: string;
  candidates: string[];
  sourceSegmentIds: string[];
  atMs: number;
  dismissed: boolean;
};

export type EngineError = {
  id: string;
  stage: "extract" | "apply" | "render" | "summary";
  message: string;
  retryable: boolean;
  segmentIds?: string[];
  sceneId?: string;
  atMs: number;
  dismissed: boolean;
};

export type LivePartial = { text: string; language?: Language; startedMs: number };

type Rec<T> = Record<string, T>;

export type SnapshotState = {
  session: Session | null;
  segments: Rec<TranscriptSegment>;
  thoughts: Rec<Thought>;
  concepts: Rec<Concept>;
  relations: Rec<Relation>;
  models: Rec<SystemModel>;
  versions: Rec<ModelVersion>;
  changes: Rec<ChangeEvent>;
  scenes: Rec<Scene>;
  assets: Rec<Asset>;
  actions: Rec<ActionItem>;
  summary: SessionSummary | null;
  lastEventSeq: number;
  /** timeline: every event seen (snapshot replay + live), ordered by seq */
  events: SessionEvent[];
  /** id → session-relative ms of first appearance (from the event stream) */
  atMsById: Rec<number>;
  ambiguities: Ambiguity[];
  errors: EngineError[];
  /** number of ingests currently running (server-side) */
  processingCount: number;
  processingSegmentIds: string[];
};

export type UiState = {
  thinking: ThinkingState;
  micLevel: number;
  speechStatus: SpeechStatus;
  speechDetail: string | null;
  speechProvider: SpeechProviderName;
  speechLanguage: "ro-RO" | "en-US" | "auto";
  connection: ConnectionState;
  saveStatus: SaveStatus;
  pendingSegments: number;
  /** session clock */
  durationMs: number;
  clockRunning: boolean;
  livePartial: LivePartial | null;
  selectedThoughtId: string | null;
  selectedConceptId: string | null;
  selectedSegmentId: string | null;
  selectedSceneId: string | null;
  /** timeline cursor in ms; null = live (everything) */
  timeCursor: number | null;
  showRevised: boolean;
  view: ViewId;
  loaded: boolean;
  loadError: string | null;
  summaryRunning: boolean;
};

export type SessionStore = SnapshotState &
  UiState & {
    // snapshot / events
    loadSnapshot: (snap: SessionSnapshot, events?: SessionEvent[]) => void;
    applyEvent: (e: SessionEvent) => void;
    applyEvents: (events: SessionEvent[]) => void;
    reset: () => void;
    /** optimistic local segment (before server ack) */
    addLocalSegment: (seg: TranscriptSegment) => void;
    upsertSegment: (seg: TranscriptSegment) => void;
    upsertAction: (a: ActionItem) => void;
    upsertThought: (t: Thought) => void;
    setSession: (s: Session) => void;
    setSummary: (s: SessionSummary | null) => void;
    dismissAmbiguity: (id: string) => void;
    dismissError: (id: string) => void;
    pushError: (e: Omit<EngineError, "id" | "dismissed" | "atMs"> & { atMs?: number }) => void;
    // ui
    setThinking: (t: ThinkingState) => void;
    setMicLevel: (v: number) => void;
    setSpeechStatus: (s: SpeechStatus, detail?: string | null) => void;
    setSpeechProvider: (p: SpeechProviderName) => void;
    setSpeechLanguage: (l: UiState["speechLanguage"]) => void;
    setConnection: (c: ConnectionState) => void;
    setSaveStatus: (s: SaveStatus, pending: number) => void;
    setLivePartial: (p: LivePartial | null) => void;
    select: (sel: Partial<Pick<UiState, "selectedThoughtId" | "selectedConceptId" | "selectedSegmentId" | "selectedSceneId">>) => void;
    setTimeCursor: (ms: number | null) => void;
    setShowRevised: (v: boolean) => void;
    setView: (v: ViewId) => void;
    setLoaded: (loaded: boolean, error?: string | null) => void;
    setSummaryRunning: (v: boolean) => void;
    // clock
    startClock: () => void;
    stopClock: () => void;
    setDuration: (ms: number) => void;
    tick: () => void;
  };

const emptySnapshot = (): SnapshotState => ({
  session: null,
  segments: {},
  thoughts: {},
  concepts: {},
  relations: {},
  models: {},
  versions: {},
  changes: {},
  scenes: {},
  assets: {},
  actions: {},
  summary: null,
  lastEventSeq: 0,
  events: [],
  atMsById: {},
  ambiguities: [],
  errors: [],
  processingCount: 0,
  processingSegmentIds: [],
});

const initialUi = (): UiState => ({
  thinking: "idle",
  micLevel: 0,
  speechStatus: "idle",
  speechDetail: null,
  speechProvider: "browser",
  speechLanguage: "auto",
  connection: "online",
  saveStatus: "saved",
  pendingSegments: 0,
  durationMs: 0,
  clockRunning: false,
  livePartial: null,
  selectedThoughtId: null,
  selectedConceptId: null,
  selectedSegmentId: null,
  selectedSceneId: null,
  timeCursor: null,
  showRevised: false,
  view: "live",
  loaded: false,
  loadError: null,
  summaryRunning: false,
});

let clockTimer: ReturnType<typeof setInterval> | null = null;
let clockAnchor = 0; // performance.now() when the clock last started
let clockBase = 0; // durationMs at that moment
let localSeq = 0;

const upsert = <T extends { id: string }>(rec: Rec<T>, item: T): Rec<T> => ({ ...rec, [item.id]: item });

function relativeMs(session: Session | null, iso: string): number {
  if (!session) return 0;
  const t = Date.parse(iso) - Date.parse(session.startedAt);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(t, Math.max(session.durationMs, t)));
}

/** Reducer: returns the state patch for one event (pure). */
export function reduceEvent(state: SnapshotState, e: SessionEvent): Partial<SnapshotState> {
  const patch: Partial<SnapshotState> = {};
  const p = e.payload as { id?: string };
  if (p && typeof p.id === "string" && state.atMsById[p.id] === undefined) {
    patch.atMsById = { ...state.atMsById, [p.id]: e.atMs };
  }
  switch (e.type) {
    case "session.updated":
      patch.session = e.payload;
      break;
    case "segment.added":
    case "segment.updated":
      patch.segments = upsert(state.segments, e.payload);
      break;
    case "ingest.started":
      patch.processingCount = state.processingCount + 1;
      patch.processingSegmentIds = Array.from(new Set([...state.processingSegmentIds, ...e.payload.segmentIds]));
      break;
    case "ingest.finished": {
      const done = new Set(e.payload.segmentIds);
      patch.processingCount = Math.max(0, state.processingCount - 1);
      patch.processingSegmentIds = state.processingSegmentIds.filter((id) => !done.has(id));
      break;
    }
    case "thought.added":
    case "thought.updated":
      patch.thoughts = upsert(state.thoughts, e.payload);
      break;
    case "concept.added":
    case "concept.updated":
      patch.concepts = upsert(state.concepts, e.payload);
      break;
    case "relation.added":
    case "relation.updated":
      patch.relations = upsert(state.relations, e.payload);
      break;
    case "model.added":
    case "model.updated":
      patch.models = upsert(state.models, e.payload);
      break;
    case "version.added":
      patch.versions = upsert(state.versions, e.payload);
      break;
    case "change.recorded":
      patch.changes = upsert(state.changes, e.payload);
      break;
    case "scene.added":
    case "scene.updated":
      patch.scenes = upsert(state.scenes, e.payload);
      break;
    case "asset.added":
      patch.assets = upsert(state.assets, e.payload);
      break;
    case "action.added":
    case "action.updated":
      patch.actions = upsert(state.actions, e.payload);
      break;
    case "ambiguity.flagged":
      patch.ambiguities = [
        ...state.ambiguities,
        {
          id: `amb_${e.seq}_${state.ambiguities.length}`,
          text: e.payload.text,
          candidates: e.payload.candidates,
          sourceSegmentIds: e.payload.sourceSegmentIds,
          atMs: e.atMs,
          dismissed: false,
        },
      ];
      break;
    case "summary.ready":
      patch.summary = e.payload;
      if (state.session) patch.session = { ...state.session, summary: e.payload };
      break;
    case "engine.error": {
      patch.errors = [
        ...state.errors,
        {
          id: `err_${e.seq}_${state.errors.length}`,
          stage: e.payload.stage,
          message: e.payload.message,
          retryable: e.payload.retryable,
          segmentIds: e.payload.segmentIds,
          sceneId: e.payload.sceneId,
          atMs: e.atMs,
          dismissed: false,
        },
      ];
      // an errored ingest will not send ingest.finished
      if ((e.payload.stage === "extract" || e.payload.stage === "apply") && state.processingCount > 0) {
        const failed = new Set(e.payload.segmentIds ?? []);
        patch.processingCount = state.processingCount - 1;
        patch.processingSegmentIds = state.processingSegmentIds.filter((id) => !failed.has(id));
      }
      break;
    }
  }
  return patch;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  ...emptySnapshot(),
  ...initialUi(),

  loadSnapshot: (snap, events) => {
    const toRec = <T extends { id: string }>(arr: T[]): Rec<T> => Object.fromEntries(arr.map((x) => [x.id, x]));
    const atMsById: Rec<number> = {};
    const sorted = (events ?? []).slice().sort((a, b) => a.seq - b.seq);
    for (const e of sorted) {
      const p = e.payload as { id?: string };
      if (p && typeof p.id === "string" && atMsById[p.id] === undefined) atMsById[p.id] = e.atMs;
    }
    const fallback = (items: { id: string; createdAt: string }[]) => {
      for (const it of items) if (atMsById[it.id] === undefined) atMsById[it.id] = relativeMs(snap.session, it.createdAt);
    };
    for (const s of snap.segments) if (atMsById[s.id] === undefined) atMsById[s.id] = s.startedMs;
    fallback(snap.thoughts);
    fallback(snap.concepts);
    fallback(snap.relations);
    fallback(snap.models);
    fallback(snap.versions);
    fallback(snap.changes);
    fallback(snap.scenes);
    fallback(snap.assets);
    fallback(snap.actions);

    const ambiguities: Ambiguity[] = [];
    const errors: EngineError[] = [];
    for (const e of sorted) {
      if (e.type === "ambiguity.flagged")
        ambiguities.push({
          id: `amb_${e.seq}`,
          text: e.payload.text,
          candidates: e.payload.candidates,
          sourceSegmentIds: e.payload.sourceSegmentIds,
          atMs: e.atMs,
          dismissed: true, // historical ambiguities are not re-shown as banners
        });
      if (e.type === "engine.error")
        errors.push({
          id: `err_${e.seq}`,
          stage: e.payload.stage,
          message: e.payload.message,
          retryable: e.payload.retryable,
          segmentIds: e.payload.segmentIds,
          sceneId: e.payload.sceneId,
          atMs: e.atMs,
          dismissed: true,
        });
    }
    const summary = (snap.session.summary as SessionSummary | null) ?? null;
    set({
      session: snap.session,
      segments: toRec(snap.segments),
      thoughts: toRec(snap.thoughts),
      concepts: toRec(snap.concepts),
      relations: toRec(snap.relations),
      models: toRec(snap.models),
      versions: toRec(snap.versions),
      changes: toRec(snap.changes),
      scenes: toRec(snap.scenes),
      assets: toRec(snap.assets),
      actions: toRec(snap.actions),
      summary: summary && typeof summary === "object" && "headline" in summary ? summary : null,
      lastEventSeq: Math.max(snap.lastEventSeq, sorted.at(-1)?.seq ?? 0),
      events: sorted,
      atMsById,
      ambiguities,
      errors,
      processingCount: 0,
      processingSegmentIds: [],
      durationMs: snap.session.durationMs,
      thinking: snap.session.status === "ended" ? "ended" : "idle",
      loaded: true,
      loadError: null,
    });
  },

  applyEvent: (e) => {
    const state = get();
    // dedupe persisted events by seq (local optimistic events use seq <= 0)
    if (e.seq > 0 && state.events.some((x) => x.seq === e.seq && x.type === e.type)) {
      // still apply payload (idempotent upsert) but do not duplicate on the timeline
      set(reduceEvent(state, e));
      return;
    }
    const patch = reduceEvent(state, e);
    const events = e.seq > 0 ? [...state.events, e].sort((a, b) => a.seq - b.seq) : [...state.events, e];
    set({ ...patch, events, lastEventSeq: Math.max(state.lastEventSeq, e.seq) });
  },

  applyEvents: (events) => {
    for (const e of events) get().applyEvent(e);
  },

  reset: () => {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
    set({ ...emptySnapshot(), ...initialUi() });
  },

  addLocalSegment: (seg) => {
    const state = get();
    localSeq -= 1;
    const e: SessionEvent = {
      seq: localSeq,
      sessionId: seg.sessionId,
      atMs: seg.startedMs,
      createdAt: seg.createdAt,
      type: "segment.added",
      payload: seg,
    };
    set({
      segments: upsert(state.segments, seg),
      atMsById: state.atMsById[seg.id] === undefined ? { ...state.atMsById, [seg.id]: seg.startedMs } : state.atMsById,
      events: [...state.events, e],
    });
  },
  upsertSegment: (seg) => set((s) => ({ segments: upsert(s.segments, seg) })),
  upsertAction: (a) => set((s) => ({ actions: upsert(s.actions, a) })),
  upsertThought: (t) => set((s) => ({ thoughts: upsert(s.thoughts, t) })),
  setSession: (session) => set({ session }),
  setSummary: (summary) => set({ summary }),
  dismissAmbiguity: (id) => set((s) => ({ ambiguities: s.ambiguities.map((a) => (a.id === id ? { ...a, dismissed: true } : a)) })),
  dismissError: (id) => set((s) => ({ errors: s.errors.map((a) => (a.id === id ? { ...a, dismissed: true } : a)) })),
  pushError: (e) =>
    set((s) => ({
      errors: [
        ...s.errors,
        { ...e, id: `err_local_${Date.now()}_${s.errors.length}`, atMs: e.atMs ?? s.durationMs, dismissed: false },
      ],
    })),

  setThinking: (thinking) => set({ thinking }),
  setMicLevel: (micLevel) => set({ micLevel }),
  setSpeechStatus: (speechStatus, detail) => set({ speechStatus, speechDetail: detail ?? null }),
  setSpeechProvider: (speechProvider) => set({ speechProvider }),
  setSpeechLanguage: (speechLanguage) => set({ speechLanguage }),
  setConnection: (connection) => set({ connection }),
  setSaveStatus: (saveStatus, pendingSegments) => set({ saveStatus, pendingSegments }),
  setLivePartial: (livePartial) => set({ livePartial }),
  select: (sel) => set(sel),
  setTimeCursor: (timeCursor) => set({ timeCursor }),
  setShowRevised: (showRevised) => set({ showRevised }),
  setView: (view) => set({ view }),
  setLoaded: (loaded, error = null) => set({ loaded, loadError: error }),
  setSummaryRunning: (summaryRunning) => set({ summaryRunning }),

  startClock: () => {
    if (clockTimer) return;
    clockAnchor = performance.now();
    clockBase = get().durationMs;
    set({ clockRunning: true });
    clockTimer = setInterval(() => get().tick(), 250);
  },
  stopClock: () => {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
      get().tick();
    }
    set({ clockRunning: false });
  },
  setDuration: (durationMs) => {
    clockBase = durationMs;
    clockAnchor = performance.now();
    set({ durationMs });
  },
  tick: () => {
    if (!clockTimer) return;
    set({ durationMs: clockBase + Math.round(performance.now() - clockAnchor) });
  },
}));

// ---------- Derived selectors (pure; memoize at call sites with useMemo) ----------

export const bySeq = <T extends { seq: number }>(a: T, b: T) => a.seq - b.seq;
export const byCreated = <T extends { createdAt: string }>(a: T, b: T) => a.createdAt.localeCompare(b.createdAt);

export const selectSegmentsOrdered = (segments: Rec<TranscriptSegment>) =>
  Object.values(segments).sort((a, b) => a.startedMs - b.startedMs || a.seq - b.seq);

export const selectActiveConcepts = (concepts: Rec<Concept>, includeRevised = false) =>
  Object.values(concepts).filter((c) => includeRevised ? c.status !== "retracted" : c.status === "active");

export const selectActiveRelations = (relations: Rec<Relation>, includeRevised = false) =>
  Object.values(relations).filter((r) => includeRevised ? r.status !== "retracted" : r.status === "active");

/** Graph for the mind map: active concepts and relations whose endpoints are present. */
export function selectGraph(
  concepts: Rec<Concept>,
  relations: Rec<Relation>,
  opts: { includeRevised?: boolean; visible?: (id: string) => boolean } = {},
) {
  const vis = opts.visible ?? (() => true);
  const nodes = selectActiveConcepts(concepts, opts.includeRevised).filter((c) => vis(c.id));
  const ids = new Set(nodes.map((n) => n.id));
  const edges = selectActiveRelations(relations, opts.includeRevised).filter(
    (r) => vis(r.id) && ids.has(r.fromId) && ids.has(r.toId),
  );
  return { nodes, edges };
}

export const selectModelVersions = (versions: Rec<ModelVersion>, modelId: string) =>
  Object.values(versions)
    .filter((v) => v.modelId === modelId)
    .sort((a, b) => a.version - b.version);

export const selectThoughtsByType = (thoughts: Rec<Thought>, type: Thought["type"], includeRevised = false) =>
  Object.values(thoughts)
    .filter((t) => t.type === type && (includeRevised || t.status === "active"))
    .sort(byCreated);

export const selectOpenQuestions = (thoughts: Rec<Thought>) => selectThoughtsByType(thoughts, "question");
export const selectDecisions = (thoughts: Rec<Thought>) => selectThoughtsByType(thoughts, "decision");
export const selectConclusions = (thoughts: Rec<Thought>) => selectThoughtsByType(thoughts, "conclusion");
export const selectIdeas = (thoughts: Rec<Thought>) => selectThoughtsByType(thoughts, "idea");
export const selectSystemChanges = (thoughts: Rec<Thought>) => selectThoughtsByType(thoughts, "proposed_modification");

export const selectActions = (actions: Rec<ActionItem>) =>
  Object.values(actions).sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    const pa = a.priority ? rank[a.priority] : 3;
    const pb = b.priority ? rank[b.priority] : 3;
    if (a.status !== b.status) return a.status === "open" ? -1 : b.status === "open" ? 1 : 0;
    return pa - pb || a.createdAt.localeCompare(b.createdAt);
  });

export const selectScenesOrdered = (scenes: Rec<Scene>) => Object.values(scenes).sort(byCreated);

/** Builds a time-filter predicate for the timeline cursor. */
export function makeVisible(atMsById: Rec<number>, cursor: number | null) {
  if (cursor === null) return () => true;
  return (id: string) => {
    const at = atMsById[id];
    return at === undefined ? true : at <= cursor;
  };
}

export const formatClock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
