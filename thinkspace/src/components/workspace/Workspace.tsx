"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { ThinkingController, redirectToLogin } from "@/lib/speech/controller";
import { VIEW_IDS, useSessionStore, type ViewId } from "@/store/session-store";
import { Button } from "@/components/ui";
import { Canvas } from "@/components/canvas/Canvas";
import { ExecutionPanel } from "@/components/actions/ExecutionPanel";
import { MindMap } from "@/components/mindmap/MindMap";
import { SystemsPanel } from "@/components/systems/SystemsPanel";
import { ThoughtsPanel } from "@/components/thoughts/ThoughtsPanel";
import { Timeline, TimelineScrubber } from "@/components/timeline/Timeline";
import { TranscriptPanel } from "@/components/transcript/TranscriptPanel";
import { AmbiguityBanner, ErrorToasts } from "./Banners";
import { PanelFrame } from "./PanelFrame";
import { ResizableColumns } from "./ResizableColumns";
import { TopBar } from "./TopBar";
import { ViewTabs } from "./ViewTabs";
import { ControllerContext, useHealth, useMediaQuery } from "./hooks";

const isView = (v: string | null): v is ViewId => !!v && (VIEW_IDS as string[]).includes(v);

export function Workspace({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { health } = useHealth();
  const wide = useMediaQuery("(min-width: 1024px)", true);

  const loaded = useSessionStore((s) => s.loaded);
  const loadError = useSessionStore((s) => s.loadError);
  const view = useSessionStore((s) => s.view);
  const setView = useSessionStore((s) => s.setView);
  const timeCursor = useSessionStore((s) => s.timeCursor);
  const setTimeCursor = useSessionStore((s) => s.setTimeCursor);

  // one controller per mounted workspace
  const [controller] = useState(() => new ThinkingController(sessionId));

  // initial view / cursor from the URL
  const initialView = params.get("view");
  const initialT = params.get("t");
  useEffect(() => {
    if (isView(initialView)) setView(initialView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load snapshot + event log
  useEffect(() => {
    const store = useSessionStore.getState();
    store.reset();
    const dispose = controller.attach();
    let cancelled = false;
    (async () => {
      try {
        const snap = await api.sessions.snapshot(sessionId);
        let events: Awaited<ReturnType<typeof api.sessions.events>>["events"] = [];
        try {
          events = (await api.sessions.events(sessionId, 0)).events;
        } catch {
          /* timeline falls back to createdAt-derived timing */
        }
        if (cancelled) return;
        useSessionStore.getState().loadSnapshot(snap, events);
        controller.resumePendingWork();
        if (isView(initialView)) useSessionStore.getState().setView(initialView);
        if (initialT !== null) {
          const t = Number(initialT);
          if (Number.isFinite(t) && t >= 0 && t < snap.session.durationMs) useSessionStore.getState().setTimeCursor(t);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.isUnauthorized) return redirectToLogin();
        useSessionStore.getState().setLoaded(false, e instanceof ApiError && e.status === 404 ? "This session does not exist (it may have been deleted)." : e instanceof Error ? e.message : "Could not load the session.");
      }
    })();
    return () => {
      cancelled = true;
      void dispose();
      useSessionStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, controller]);

  // keep ?view= (and ?t=) in the URL
  useEffect(() => {
    if (!loaded) return;
    const url = new URL(window.location.href);
    if (view === "live") url.searchParams.delete("view");
    else url.searchParams.set("view", view);
    if (timeCursor === null) url.searchParams.delete("t");
    else url.searchParams.set("t", String(Math.round(timeCursor)));
    const next = url.pathname + url.search;
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(window.history.state, "", next);
  }, [view, timeCursor, loaded]);

  // warn before leaving while recording
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const s = useSessionStore.getState();
      if (s.thinking === "listening" || s.pendingSegments > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = useCallback((key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] })), []);

  const actionCount = useSessionStore((s) => Object.values(s.actions).filter((a) => a.status === "open").length);
  const tabCounts = useMemo(() => ({ actions: actionCount }), [actionCount]);

  if (loadError) {
    return (
      <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-base text-text-0">{loadError}</p>
        <Link href="/sessions" className="text-sm text-accent hover:underline">
          Back to history
        </Link>
      </main>
    );
  }

  const content = (() => {
    switch (view) {
      case "canvas":
        return <Full title="Canvas"><Canvas /></Full>;
      case "mindmap":
        return <Full title="Mind Map"><MindMap /></Full>;
      case "systems":
        return <Full title="Systems"><SystemsPanel /></Full>;
      case "transcript":
        return <Full title="Transcript"><TranscriptPanel /></Full>;
      case "actions":
        return <Full title="Decisions & Actions"><ExecutionPanel /></Full>;
      case "timeline":
        return <Full title="Timeline"><Timeline /></Full>;
      case "live":
      default:
        return wide ? (
          <ResizableColumns
            className="p-2"
            left={
              <>
                <PanelFrame title="Mind map" collapsed={!!collapsed.map} onToggleCollapse={() => toggle("map")} onExpand={setView} expandTo="mindmap" bodyClassName="min-h-0 flex-1" testId="panel-mindmap">
                  <MindMap mini />
                </PanelFrame>
                <PanelFrame title="Execution" collapsed={!!collapsed.exec} onToggleCollapse={() => toggle("exec")} onExpand={setView} expandTo="actions" testId="panel-execution">
                  <ExecutionPanel mini />
                </PanelFrame>
              </>
            }
            center={
              <PanelFrame title="Canvas" collapsed={!!collapsed.canvas} onToggleCollapse={() => toggle("canvas")} onExpand={setView} expandTo="canvas" bodyClassName="min-h-0 flex-1" testId="panel-canvas">
                <Canvas mini />
              </PanelFrame>
            }
            right={
              <>
                <PanelFrame title="Transcript" collapsed={!!collapsed.transcript} onToggleCollapse={() => toggle("transcript")} onExpand={setView} expandTo="transcript" bodyClassName="min-h-0 flex-1" testId="panel-transcript">
                  <TranscriptPanel compact />
                </PanelFrame>
                <PanelFrame title="Thoughts" collapsed={!!collapsed.thoughts} onToggleCollapse={() => toggle("thoughts")} onExpand={setView} expandTo="actions" bodyClassName="min-h-0 flex-1" testId="panel-thoughts">
                  <ThoughtsPanel />
                </PanelFrame>
              </>
            }
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
            <PanelFrame title="Transcript" className="min-h-[40vh]" bodyClassName="min-h-0 flex-1" onExpand={setView} expandTo="transcript">
              <TranscriptPanel compact />
            </PanelFrame>
            <PanelFrame title="Thoughts" className="min-h-[40vh]" onExpand={setView} expandTo="actions">
              <ThoughtsPanel />
            </PanelFrame>
            <PanelFrame title="Canvas" className="min-h-[40vh]" bodyClassName="min-h-0 flex-1" onExpand={setView} expandTo="canvas">
              <Canvas mini />
            </PanelFrame>
          </div>
        );
    }
  })();

  return (
    <ControllerContext.Provider value={controller}>
      <main className="flex h-dvh flex-col overflow-hidden bg-bg-0" data-testid="workspace" data-loaded={loaded ? "1" : "0"}>
        <TopBar health={health} compact={!wide} />
        <AmbiguityBanner />
        {wide && <ViewTabs view={view} onChange={setView} counts={tabCounts} />}
        {timeCursor !== null && view !== "timeline" && (
          <div className="flex items-center gap-3 border-b border-warn/40 bg-warn-soft px-3 py-1 text-xs text-text-0" data-testid="viewing-past">
            <span className="font-medium text-warn">Viewing the past</span>
            <TimelineScrubber className="min-w-0 flex-1" showLive={false} />
            <Button size="sm" variant="ghost" onClick={() => router.push(`/s/${sessionId}?view=timeline`)}>
              Open timeline
            </Button>
            <Button size="sm" variant="primary" onClick={() => setTimeCursor(null)}>
              Jump to live
            </Button>
          </div>
        )}
        {!loaded && !loadError ? (
          <div className="flex flex-1 items-center justify-center text-sm text-text-2">Loading session…</div>
        ) : (
          content
        )}
        {!wide && <ViewTabs view={view} onChange={setView} variant="bottom" />}
        <ErrorToasts />
      </main>
    </ControllerContext.Provider>
  );
}

function Full({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <PanelFrame title={title} bodyClassName="min-h-0 flex-1">
        {children}
      </PanelFrame>
    </div>
  );
}
