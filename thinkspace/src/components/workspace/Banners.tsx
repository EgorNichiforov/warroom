"use client";

import { AlertTriangle, CloudOff, HelpCircle, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui";
import { formatClock, useSessionStore } from "@/store/session-store";
import { useController } from "./hooks";

export function AmbiguityBanner() {
  const ambiguities = useSessionStore((s) => s.ambiguities);
  const dismiss = useSessionStore((s) => s.dismissAmbiguity);
  const select = useSessionStore((s) => s.select);
  const open = ambiguities.filter((a) => !a.dismissed);
  if (!open.length) return null;
  return (
    <div className="flex flex-col gap-1 px-3 pt-2 sm:px-4" data-testid="ambiguity-banner">
      {open.slice(-2).map((a) => (
        <div key={a.id} className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn-soft px-3 py-2 text-sm">
          <HelpCircle size={16} className="mt-0.5 shrink-0 text-warn" />
          <div className="min-w-0 flex-1">
            <p className="text-text-0">
              <span className="text-warn font-medium">Ambiguous:</span> {a.text}
            </p>
            {a.candidates.length > 0 && (
              <p className="text-xs text-text-1">
                Could mean: {a.candidates.join(" · ")}
                {a.sourceSegmentIds[0] && (
                  <>
                    {" · "}
                    <button type="button" className="underline hover:text-text-0" onClick={() => select({ selectedSegmentId: a.sourceSegmentIds[0] })}>
                      show source
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" aria-label="Dismiss" onClick={() => dismiss(a.id)} icon={<X size={14} />} />
        </div>
      ))}
    </div>
  );
}

export function ErrorToasts() {
  const errors = useSessionStore((s) => s.errors);
  const dismiss = useSessionStore((s) => s.dismissError);
  const connection = useSessionStore((s) => s.connection);
  const segments = useSessionStore((s) => s.segments);
  const select = useSessionStore((s) => s.select);
  const controller = useController();
  const open = errors.filter((e) => !e.dismissed).slice(-3);
  // the container is always present (empty when there is nothing to show) so it can be observed
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-40 flex flex-col items-center gap-2 px-3 sm:bottom-4 sm:items-end sm:px-4" data-testid="error-toasts">
      {connection === "offline" && (
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-md border border-danger/40 bg-bg-1 px-3 py-2 text-sm shadow-lg">
          <CloudOff size={16} className="shrink-0 text-danger" />
          <span className="flex-1">Connection lost — saving and understanding resume automatically when you&apos;re back online.</span>
        </div>
      )}
      {open.map((e) => (
        <div key={e.id} role="alert" className="pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-md border border-danger/40 bg-bg-1 px-3 py-2 text-sm shadow-lg">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-text-0">{e.message}</p>
            <p className="text-xs text-text-2">
              <span className="capitalize">{e.stage}</span> · {e.retryable ? "retryable" : "not retryable"}
              {e.segmentIds?.map((id) => segments[id]).filter(Boolean).map((seg) => (
                <button key={seg.id} type="button" className="ml-2 font-mono underline hover:text-text-0" onClick={() => select({ selectedSegmentId: seg.id })} title="Show this segment in the transcript">
                  {formatClock(seg.startedMs)}
                </button>
              ))}
            </p>
          </div>
          {e.retryable && (e.segmentIds?.length || e.sceneId) && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCw size={12} />}
              onClick={() => {
                if (e.sceneId) controller.retryRender(e.sceneId);
                else if (e.segmentIds?.length) controller.retryIngest(e.segmentIds);
                dismiss(e.id);
              }}
              data-testid="retry-button"
            >
              Retry
            </Button>
          )}
          <Button variant="ghost" size="sm" aria-label="Dismiss" onClick={() => dismiss(e.id)} icon={<X size={14} />} />
        </div>
      ))}
    </div>
  );
}
