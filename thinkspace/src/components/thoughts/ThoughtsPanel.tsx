"use client";

import { useMemo, useState } from "react";
import {
  AlertOctagon,
  Box,
  CheckCircle2,
  ClipboardList,
  Eye,
  FlaskConical,
  GitBranch,
  HelpCircle,
  Lightbulb,
  Scale,
  Sparkles,
  Tag,
  Wrench,
  Zap,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { ApiError, api } from "@/lib/api";
import type { Thought, ThoughtType } from "@/lib/contracts";
import { Button, Pill, Toggle, cn } from "@/components/ui";
import { useVisible } from "@/components/workspace/hooks";
import { formatClock, useSessionStore } from "@/store/session-store";

export const THOUGHT_META: Record<ThoughtType, { label: string; icon: typeof Lightbulb; color: string }> = {
  idea: { label: "Ideas", icon: Lightbulb, color: "var(--color-warn)" },
  concept: { label: "Concepts", icon: Tag, color: "var(--color-accent)" },
  question: { label: "Questions", icon: HelpCircle, color: "#d08cff" },
  hypothesis: { label: "Hypotheses", icon: FlaskConical, color: "#3ec9c0" },
  observation: { label: "Observations", icon: Eye, color: "var(--color-text-1)" },
  insight: { label: "Insights", icon: Sparkles, color: "#5fd3e6" },
  decision: { label: "Decisions", icon: CheckCircle2, color: "var(--color-ok)" },
  conclusion: { label: "Conclusions", icon: Scale, color: "var(--color-ok)" },
  contradiction: { label: "Contradictions", icon: AlertOctagon, color: "var(--color-danger)" },
  alternative: { label: "Alternatives", icon: GitBranch, color: "#9b8cff" },
  assumption: { label: "Assumptions", icon: Zap, color: "var(--color-warn)" },
  system_component: { label: "System components", icon: Box, color: "#9b8cff" },
  proposed_modification: { label: "Proposed modifications", icon: Wrench, color: "var(--color-warn)" },
  action_item: { label: "Action items", icon: ClipboardList, color: "var(--color-ok)" },
};

const ORDER: ThoughtType[] = [
  "decision",
  "conclusion",
  "question",
  "idea",
  "alternative",
  "insight",
  "hypothesis",
  "assumption",
  "observation",
  "contradiction",
  "proposed_modification",
  "system_component",
  "concept",
  "action_item",
];

export function ThoughtsPanel() {
  const thoughts = useSessionStore((s) => s.thoughts);
  const showRevised = useSessionStore((s) => s.showRevised);
  const setShowRevised = useSessionStore((s) => s.setShowRevised);
  const selectedThoughtId = useSessionStore((s) => s.selectedThoughtId);
  const select = useSessionStore((s) => s.select);
  const visible = useVisible();
  const [typeFilter, setTypeFilter] = useState<ThoughtType | "all">("all");

  const groups = useMemo(() => {
    const all = Object.values(thoughts).filter((t) => visible(t.id) && (showRevised || t.status === "active"));
    const map = new Map<ThoughtType, Thought[]>();
    for (const t of all) map.set(t.type, [...(map.get(t.type) ?? []), t]);
    return ORDER.filter((k) => map.has(k) && (typeFilter === "all" || typeFilter === k)).map((k) => ({
      type: k,
      items: map.get(k)!.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
  }, [thoughts, visible, showRevised, typeFilter]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const presentTypes = useMemo(() => ORDER.filter((k) => Object.values(thoughts).some((t) => t.type === k)), [thoughts]);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="thoughts-panel">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5 text-xs">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
            All
          </FilterChip>
          {presentTypes.map((k) => {
            const Icon = THOUGHT_META[k].icon;
            return (
              <FilterChip key={k} active={typeFilter === k} onClick={() => setTypeFilter(k)} title={THOUGHT_META[k].label}>
                <Icon size={12} style={{ color: THOUGHT_META[k].color }} />
              </FilterChip>
            );
          })}
        </div>
        <Toggle checked={showRevised} onChange={setShowRevised} label="Show revised" />
      </div>
      <div className="ts-panel-scroll min-h-0 flex-1 p-2">
        {total === 0 && (
          <p className="px-2 py-6 text-center text-sm text-text-2">Thoughts appear here as the engine understands what you say — typed, with provenance.</p>
        )}
        {groups.map((g) => {
          const meta = THOUGHT_META[g.type];
          const Icon = meta.icon;
          return (
            <section key={g.type} className="mb-3">
              <h3 className="flex items-center gap-1.5 px-1 py-1 text-xs font-medium uppercase tracking-wide text-text-2">
                <Icon size={12} style={{ color: meta.color }} />
                {meta.label}
                <span className="text-text-2/70">{g.items.length}</span>
              </h3>
              <ul className="flex flex-col gap-1">
                {g.items.map((t) => (
                  <ThoughtCard
                    key={t.id}
                    thought={t}
                    color={meta.color}
                    selected={t.id === selectedThoughtId}
                    onSelect={() => select({ selectedThoughtId: t.id === selectedThoughtId ? null : t.id, selectedConceptId: null })}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({ active, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-sm border px-1.5",
        active ? "border-accent bg-accent-soft text-text-0" : "border-border text-text-1 hover:bg-bg-2",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function ThoughtCard({ thought: t, color, selected, onSelect }: { thought: Thought; color: string; selected: boolean; onSelect: () => void }) {
  const upsertThought = useSessionStore((s) => s.upsertThought);
  const applyEvents = useSessionStore((s) => s.applyEvents);
  const pushError = useSessionStore((s) => s.pushError);
  const atMs = useSessionStore((s) => s.atMsById[t.id]);
  const segments = useSessionStore((s) => s.segments);
  const [busy, setBusy] = useState(false);
  const inferred = t.provenance === "inferred";
  const inactive = t.status !== "active";

  const setStatus = async (status: Thought["status"]) => {
    setBusy(true);
    try {
      const res = await api.thoughts.update(t.sessionId, t.id, { status });
      upsertThought(res.thought);
      applyEvents(res.events ?? []);
    } catch (e) {
      pushError({ stage: "apply", message: e instanceof ApiError ? e.message : "Could not update thought", retryable: false });
    } finally {
      setBusy(false);
    }
  };

  const sourceAt = t.sourceSegmentIds.map((id) => segments[id]?.startedMs).find((v) => v !== undefined);

  return (
    <li
      data-testid="thought-card"
      data-thought-type={t.type}
      data-provenance={t.provenance}
      className={cn(
        "group rounded-md border px-2.5 py-2 text-sm transition-colors",
        inferred ? "border-dashed border-border-strong/70 text-text-1" : "border-border text-text-0",
        inferred && "opacity-80",
        selected ? "bg-accent-soft ring-1 ring-accent" : "bg-bg-1 hover:bg-bg-2",
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <p className={cn("break-words", inactive && "line-through text-text-2")}>{t.text}</p>
      </button>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Pill tone={inferred ? "muted" : "neutral"} title={inferred ? "Derived by the engine, not said explicitly" : "Said explicitly"}>
          {t.provenance}
        </Pill>
        {inactive && <Pill tone="warn">{t.status}</Pill>}
        <span className="inline-flex items-center gap-1" title={`Confidence ${(t.confidence * 100).toFixed(0)}%`}>
          <span className="block h-1 w-12 overflow-hidden rounded-full bg-bg-3">
            <span className="block h-full rounded-full" style={{ width: `${Math.round(t.confidence * 100)}%`, background: color }} />
          </span>
        </span>
        {(sourceAt !== undefined || atMs !== undefined) && (
          <span className="font-mono text-[10px] text-text-2">{formatClock(sourceAt ?? atMs ?? 0)}</span>
        )}
        <span className="flex-1" />
        {t.status === "active" ? (
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-text-2 group-hover:inline-flex"
            title="Retract this thought"
            onClick={() => void setStatus("retracted")}
            loading={busy}
            icon={<Trash2 size={12} />}
          />
        ) : (
          <Button variant="ghost" size="sm" className="text-text-2" title="Restore" onClick={() => void setStatus("active")} loading={busy} icon={<RotateCcw size={12} />} />
        )}
      </div>
    </li>
  );
}
