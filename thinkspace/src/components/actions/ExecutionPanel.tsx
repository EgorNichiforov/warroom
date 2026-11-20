"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, CheckCircle2, FileText, HelpCircle, Lightbulb, Pencil, Scale, Sparkles, Wrench, X } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import type { ActionItem, Priority, Thought } from "@/lib/contracts";
import { Button, Pill, Select, cn, type PillTone } from "@/components/ui";
import { useController, useVisible } from "@/components/workspace/hooks";
import {
  formatClock,
  selectActions,
  selectConclusions,
  selectDecisions,
  selectIdeas,
  selectOpenQuestions,
  selectSystemChanges,
  useSessionStore,
} from "@/store/session-store";

export function ExecutionPanel({ mini }: { mini?: boolean }) {
  const thoughts = useSessionStore((s) => s.thoughts);
  const actions = useSessionStore((s) => s.actions);
  const summary = useSessionStore((s) => s.summary);
  const summaryRunning = useSessionStore((s) => s.summaryRunning);
  const thinking = useSessionStore((s) => s.thinking);
  const visible = useVisible();
  const controller = useController();

  const decisions = useMemo(() => selectDecisions(thoughts).filter((t) => visible(t.id)), [thoughts, visible]);
  const questions = useMemo(() => selectOpenQuestions(thoughts).filter((t) => visible(t.id)), [thoughts, visible]);
  const conclusions = useMemo(() => selectConclusions(thoughts).filter((t) => visible(t.id)), [thoughts, visible]);
  const ideas = useMemo(() => selectIdeas(thoughts).filter((t) => visible(t.id)), [thoughts, visible]);
  const systemChanges = useMemo(() => selectSystemChanges(thoughts).filter((t) => visible(t.id)), [thoughts, visible]);
  const actionList = useMemo(() => selectActions(actions).filter((a) => visible(a.id)), [actions, visible]);
  const openActions = actionList.filter((a) => a.status === "open").length;

  const empty = !decisions.length && !questions.length && !conclusions.length && !ideas.length && !systemChanges.length && !actionList.length && !summary;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="execution-panel">
      <div className="ts-panel-scroll min-h-0 flex-1 p-2">
        {empty && (
          <p className="px-2 py-6 text-center text-sm text-text-2">Decisions, actions and open questions are collected here as you think. Brainstorming stays brainstorming until you commit.</p>
        )}

        <Section title="Decisions" icon={<CheckCircle2 size={12} className="text-ok" />} count={decisions.length} testId="decisions">
          {decisions.map((t) => (
            <ThoughtRow key={t.id} t={t} />
          ))}
        </Section>

        <Section title="Action items" icon={<Check size={12} className="text-accent" />} count={openActions} testId="actions">
          {actionList.map((a) => (
            <ActionRow key={a.id} action={a} all={actions} />
          ))}
        </Section>

        <Section title="Open questions" icon={<HelpCircle size={12} className="text-[#d08cff]" />} count={questions.length} testId="questions">
          {questions.map((t) => (
            <ThoughtRow key={t.id} t={t} />
          ))}
        </Section>

        <Section title="Conclusions" icon={<Scale size={12} className="text-ok" />} count={conclusions.length}>
          {conclusions.map((t) => (
            <ThoughtRow key={t.id} t={t} />
          ))}
        </Section>

        <Section title="Ideas to explore" icon={<Lightbulb size={12} className="text-warn" />} count={ideas.length}>
          {ideas.map((t) => (
            <ThoughtRow key={t.id} t={t} />
          ))}
        </Section>

        <Section title="Systems to change" icon={<Wrench size={12} className="text-warn" />} count={systemChanges.length}>
          {systemChanges.map((t) => (
            <ThoughtRow key={t.id} t={t} />
          ))}
        </Section>

        {!mini && (
          <section className="mt-2 rounded-lg border border-border bg-bg-1" data-testid="summary-section">
            <header className="flex items-center gap-2 border-b border-border px-3 py-2">
              <FileText size={14} className="text-text-2" />
              <h3 className="text-sm font-medium">End-of-session summary</h3>
              {summary?.simulated && <Pill tone="warn">simulated</Pill>}
              <span className="flex-1" />
              <Button size="sm" variant={summary ? "secondary" : "primary"} loading={summaryRunning} onClick={() => void controller.runSummary()} icon={<Sparkles size={12} />} data-testid="generate-summary">
                {summary ? "Regenerate" : "Generate summary"}
              </Button>
            </header>
            <div className="p-3 text-sm">
              {!summary && !summaryRunning && (
                <p className="text-text-2">
                  {thinking === "ended" ? "No summary yet." : "Generated automatically when you stop the session. You can also generate one now."}
                </p>
              )}
              {summaryRunning && !summary && <p className="text-text-2">Summarizing…</p>}
              {summary && <SummaryView />}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, count, children, testId }: { title: string; icon: ReactNode; count: number; children: ReactNode; testId?: string }) {
  if (count === 0 && (!Array.isArray(children) || children.length === 0)) return null;
  return (
    <section className="mb-3" data-testid={testId}>
      <h3 className="flex items-center gap-1.5 px-1 py-1 text-xs font-medium uppercase tracking-wide text-text-2">
        {icon}
        {title}
        <span className="text-text-2/70">{count}</span>
      </h3>
      <ul className="flex flex-col gap-1">{children}</ul>
    </section>
  );
}

function SourceLink({ ids }: { ids: string[] }) {
  const segments = useSessionStore((s) => s.segments);
  const select = useSessionStore((s) => s.select);
  const setView = useSessionStore((s) => s.setView);
  const view = useSessionStore((s) => s.view);
  const first = ids.find((id) => segments[id]);
  if (!first) return null;
  return (
    <button
      type="button"
      className="font-mono text-[10px] text-text-2 hover:text-accent"
      title="Show source in transcript"
      onClick={() => {
        select({ selectedSegmentId: first });
        if (view !== "live" && view !== "transcript") setView("transcript");
      }}
    >
      {formatClock(segments[first].startedMs)}
    </button>
  );
}

function ThoughtRow({ t }: { t: Thought }) {
  const select = useSessionStore((s) => s.select);
  return (
    <li className="flex items-start gap-2 rounded-md border border-border bg-bg-1 px-2.5 py-2 text-sm">
      <button type="button" className="min-w-0 flex-1 text-left text-text-0" onClick={() => select({ selectedThoughtId: t.id, selectedConceptId: null })}>
        {t.text}
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        {t.provenance === "inferred" && <Pill tone="muted">inferred</Pill>}
        <SourceLink ids={t.sourceSegmentIds} />
      </div>
    </li>
  );
}

const PRIORITY_OPTIONS: { value: Priority | "none"; label: string }[] = [
  { value: "none", label: "No priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const priorityTone = (p: Priority | null): PillTone => (p === "high" ? "danger" : p === "medium" ? "warn" : "muted");

function ActionRow({ action: a, all }: { action: ActionItem; all: Record<string, ActionItem> }) {
  const upsert = useSessionStore((s) => s.upsertAction);
  const applyEvents = useSessionStore((s) => s.applyEvents);
  const pushError = useSessionStore((s) => s.pushError);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(a.text);
  const [busy, setBusy] = useState(false);

  const patch = async (body: Parameters<typeof api.actions.update>[2]) => {
    setBusy(true);
    const prev = a;
    upsert({ ...a, ...(body.text !== undefined ? { text: body.text } : {}), ...(body.status ? { status: body.status } : {}), ...(body.priority !== undefined ? { priority: body.priority } : {}) });
    try {
      const res = await api.actions.update(a.sessionId, a.id, body);
      upsert(res.action);
      applyEvents(res.events ?? []);
    } catch (e) {
      upsert(prev);
      pushError({ stage: "apply", message: e instanceof ApiError ? e.message : "Could not update action", retryable: false });
    } finally {
      setBusy(false);
    }
  };

  const deps = a.dependsOn.map((id) => all[id]).filter(Boolean);
  const done = a.status === "done";

  return (
    <li className={cn("rounded-md border border-border bg-bg-1 px-2.5 py-2 text-sm", done && "opacity-70")} data-testid="action-row" data-status={a.status}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]"
          checked={done}
          disabled={busy}
          onChange={(e) => void patch({ status: e.target.checked ? "done" : "open" })}
          aria-label={done ? "Mark open" : "Mark done"}
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                setEditing(false);
                if (text.trim() && text.trim() !== a.text) void patch({ text: text.trim() });
              }}
            >
              <input autoFocus value={text} onChange={(e) => setText(e.target.value)} className="h-7 min-w-0 flex-1 rounded-sm border border-accent bg-bg-0 px-2 text-sm outline-none" aria-label="Action text" />
              <Button type="submit" size="sm" variant="ghost" icon={<Check size={12} />} aria-label="Save" />
              <Button type="button" size="sm" variant="ghost" icon={<X size={12} />} aria-label="Cancel" onClick={() => setEditing(false)} />
            </form>
          ) : (
            <p className={cn("text-text-0", done && "line-through")} onDoubleClick={() => setEditing(true)}>
              {a.text}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Select
              size="sm"
              aria-label="Priority"
              value={a.priority ?? "none"}
              options={PRIORITY_OPTIONS}
              onValueChange={(v) => void patch({ priority: v === "none" ? null : v })}
              className="[&_select]:h-6 [&_select]:text-[11px]"
            />
            {a.priority && <Pill tone={priorityTone(a.priority)}>{a.priority}</Pill>}
            {a.dueDate && <Pill tone="muted">due {a.dueDate}</Pill>}
            {a.status === "dropped" && <Pill tone="muted">dropped</Pill>}
            {a.provenance === "inferred" && <Pill tone="muted">inferred</Pill>}
            <SourceLink ids={a.sourceSegmentIds} />
            <span className="flex-1" />
            {!editing && (
              <Button size="sm" variant="ghost" icon={<Pencil size={12} />} aria-label="Edit action" onClick={() => setEditing(true)} className="text-text-2" />
            )}
          </div>
          {deps.length > 0 && (
            <p className="mt-1 text-xs text-text-2">
              depends on: {deps.map((d) => d.text).join("; ")}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function SummaryView() {
  const summary = useSessionStore((s) => s.summary);
  if (!summary) return null;
  const list = (title: string, items: string[]) =>
    items.length > 0 && (
      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-text-2">{title}</h4>
        <ul className="list-disc space-y-0.5 pl-4 text-text-0">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="flex flex-col gap-3" data-testid="summary">
      <p className="text-md font-medium text-text-0">{summary.headline}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-md border border-ok/30 bg-ok-soft/40 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ok">Confirmed</h4>
          {list("What I thought about", summary.whatIThoughtAbout)}
          {list("Conclusions", summary.conclusions)}
          {summary.decisions.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-text-2">Decisions</h4>
              <ul className="list-disc space-y-0.5 pl-4 text-text-0">
                {summary.decisions.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-1">{d.text}</span>
                    <SourceLink ids={d.sourceSegmentIds} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.actionItems.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-text-2">Action items</h4>
              <ul className="space-y-0.5 text-text-0">
                {summary.actionItems.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <span className="flex-1">{a.text}</span>
                    {a.priority && <Pill tone={priorityTone(a.priority)}>{a.priority}</Pill>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {list("Next steps", summary.nextSteps)}
          {list("Open questions", summary.openQuestions)}
          {list("Dependencies", summary.dependencies)}
          {list("Priorities", summary.priorities)}
          {list("Systems to change", summary.systemsToChange)}
        </div>
        <div className="flex flex-col gap-3 rounded-md border border-dashed border-border-strong p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-2">Suggestions (inferred)</h4>
          {list("Ideas to explore", summary.ideasToExplore)}
          {list("Suggestions", summary.suggestions)}
          {summary.ideasToExplore.length === 0 && summary.suggestions.length === 0 && <p className="text-xs text-text-2">No suggestions.</p>}
        </div>
      </div>
      <p className="text-[10px] text-text-2">Generated {new Date(summary.generatedAt).toLocaleString()}</p>
    </div>
  );
}
