"use client";

import { Cloud, CloudOff, Cpu, Image as ImageIcon, Mic, MicOff, Save } from "lucide-react";
import type { HealthResponse } from "@/lib/contracts/api";
import { Pill, cn } from "@/components/ui";
import { formatClock, useSessionStore } from "@/store/session-store";

export function MicLevel({ level, active }: { level: number; active: boolean }) {
  const bars = 5;
  return (
    <span className="inline-flex h-3 items-end gap-px" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i + 1) / bars;
        const on = active && level >= threshold * 0.8;
        return (
          <span
            key={i}
            className={cn("w-[3px] rounded-[1px] transition-colors", on ? "bg-ok" : "bg-border-strong")}
            style={{ height: `${40 + i * 15}%` }}
          />
        );
      })}
    </span>
  );
}

export function RecordingIndicator() {
  const thinking = useSessionStore((s) => s.thinking);
  const speechStatus = useSessionStore((s) => s.speechStatus);
  if (thinking !== "listening") return null;
  const reconnecting = speechStatus === "reconnecting" || speechStatus === "connecting" || speechStatus === "requesting-mic";
  return (
    <span
      className={cn("inline-flex h-7 items-center gap-2 rounded-md border px-2 text-xs font-semibold tracking-wide", reconnecting ? "border-warn/50 text-warn" : "border-rec/50 text-rec")}
      data-testid="recording-indicator"
      role="status"
      aria-live="polite"
    >
      <span className={cn("ts-rec-dot inline-block size-2.5 rounded-full", reconnecting ? "bg-warn" : "bg-rec")} />
      {reconnecting ? "CONNECTING" : "RECORDING"}
    </span>
  );
}

export function StatusPills({ health }: { health: HealthResponse | null }) {
  const thinking = useSessionStore((s) => s.thinking);
  const micLevel = useSessionStore((s) => s.micLevel);
  const speechStatus = useSessionStore((s) => s.speechStatus);
  const speechDetail = useSessionStore((s) => s.speechDetail);
  const speechProvider = useSessionStore((s) => s.speechProvider);
  const connection = useSessionStore((s) => s.connection);
  const saveStatus = useSessionStore((s) => s.saveStatus);
  const pending = useSessionStore((s) => s.pendingSegments);
  const processing = useSessionStore((s) => s.processingCount);
  const durationMs = useSessionStore((s) => s.durationMs);

  const micActive = thinking === "listening";
  const micTone = speechStatus === "error" ? "danger" : micActive ? (speechStatus === "listening" ? "ok" : "warn") : "muted";
  const micLabel =
    speechStatus === "error"
      ? "mic error"
      : speechStatus === "reconnecting"
        ? "reconnecting"
        : speechStatus === "connecting" || speechStatus === "requesting-mic"
          ? "connecting"
          : micActive
            ? speechProvider === "mock"
              ? "demo audio"
              : "mic on"
            : thinking === "paused"
              ? "paused"
              : "mic off";

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="status-pills">
      <Pill tone={micTone} title={speechDetail ?? `Speech: ${speechStatus}`} data-testid="pill-mic" icon={micActive ? <Mic size={12} /> : <MicOff size={12} />}>
        {micLabel}
        <MicLevel level={micLevel} active={micActive} />
      </Pill>
      <Pill tone={connection === "online" ? "muted" : "danger"} icon={connection === "online" ? <Cloud size={12} /> : <CloudOff size={12} />} data-testid="pill-connection">
        {connection}
      </Pill>
      <Pill
        tone={saveStatus === "saved" ? "muted" : saveStatus === "saving" ? "accent" : "warn"}
        icon={<Save size={12} />}
        data-testid="pill-save"
        title={pending ? `${pending} segment${pending === 1 ? "" : "s"} waiting to be saved` : "All transcript segments saved"}
      >
        {saveStatus === "saved" ? "saved" : saveStatus === "saving" ? "saving…" : `unsaved · ${pending}`}
      </Pill>
      {processing > 0 && (
        <Pill tone="accent" icon={<Cpu size={12} />} data-testid="pill-processing">
          thinking…
        </Pill>
      )}
      {health && !health.providers.llm.real && (
        <Pill tone="warn" icon={<Cpu size={12} />} title={`LLM provider: ${health.providers.llm.name} (${health.providers.llm.model})`}>
          LLM simulated
        </Pill>
      )}
      {health && !health.providers.image.real && (
        <Pill tone="warn" icon={<ImageIcon size={12} />} title={`Image provider: ${health.providers.image.name}`}>
          images simulated
        </Pill>
      )}
      <span className="font-mono text-sm tabular-nums text-text-0" data-testid="clock" aria-label="Session duration">
        {formatClock(durationMs)}
      </span>
    </div>
  );
}
