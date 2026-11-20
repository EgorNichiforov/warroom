"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, Keyboard, Languages, Loader2, Pencil, Search, X } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import type { TranscriptSegment } from "@/lib/contracts";
import { Button, Pill, Toggle, cn, type PillTone } from "@/components/ui";
import { langTag, useController, useVisible } from "@/components/workspace/hooks";
import { formatClock, selectSegmentsOrdered, useSessionStore } from "@/store/session-store";

const langTone = (l: string): PillTone => (l === "ro" ? "accent" : l === "en" ? "ok" : l === "mixed" ? "warn" : "muted");

export function TranscriptPanel({ compact }: { compact?: boolean }) {
  const segments = useSessionStore((s) => s.segments);
  const livePartial = useSessionStore((s) => s.livePartial);
  const thinking = useSessionStore((s) => s.thinking);
  const processingIds = useSessionStore((s) => s.processingSegmentIds);
  const selectedSegmentId = useSessionStore((s) => s.selectedSegmentId);
  const selectedThoughtId = useSessionStore((s) => s.selectedThoughtId);
  const selectedConceptId = useSessionStore((s) => s.selectedConceptId);
  const thoughts = useSessionStore((s) => s.thoughts);
  const concepts = useSessionStore((s) => s.concepts);
  const select = useSessionStore((s) => s.select);
  const visible = useVisible();
  const controller = useController();

  const [filter, setFilter] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);

  const ordered = useMemo(() => selectSegmentsOrdered(segments).filter((s) => visible(s.id)), [segments, visible]);
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((s) => s.rawText.toLowerCase().includes(q) || s.cleanedText?.toLowerCase().includes(q));
  }, [ordered, filter]);

  const referenced = useMemo(() => {
    const set = new Set<string>();
    if (selectedThoughtId) for (const id of thoughts[selectedThoughtId]?.sourceSegmentIds ?? []) set.add(id);
    if (selectedConceptId) for (const id of concepts[selectedConceptId]?.sourceSegmentIds ?? []) set.add(id);
    return set;
  }, [selectedThoughtId, selectedConceptId, thoughts, concepts]);

  // keep scrolled to the bottom while live, unless the user scrolled up
  useEffect(() => {
    const el = listRef.current;
    if (!el || !autoScroll.current) return;
    el.scrollTop = el.scrollHeight;
  }, [ordered.length, livePartial?.text]);

  useEffect(() => {
    if (!selectedSegmentId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-segment-id="${selectedSegmentId}"]`);
    el?.scrollIntoView({ block: "center" });
  }, [selectedSegmentId]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    controller.typeThought(t);
    setDraft("");
    autoScroll.current = true;
  };

  const hasTranslations = ordered.some((s) => s.translation);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="transcript-panel">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search size={12} className="absolute left-2 text-text-2" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter transcript"
            className="h-7 w-full rounded-sm border border-border bg-bg-0 pl-6 pr-2 text-xs outline-none focus:border-accent"
            aria-label="Filter transcript"
          />
        </label>
        <Toggle checked={showTranslation} onChange={setShowTranslation} label="Translation" disabled={!hasTranslations} />
      </div>

      <div ref={listRef} onScroll={onScroll} className="ts-panel-scroll min-h-0 flex-1 px-2 py-1">
        {filtered.length === 0 && !livePartial && (
          <p className="px-2 py-6 text-center text-sm text-text-2">
            {ordered.length === 0 ? "Nothing yet. Press Start thinking and speak, or type a thought below." : "No segment matches the filter."}
          </p>
        )}
        <ol className="flex flex-col">
          {filtered.map((seg) => (
            <SegmentRow
              key={seg.id}
              seg={seg}
              compact={compact}
              selected={seg.id === selectedSegmentId}
              referenced={referenced.has(seg.id)}
              processing={processingIds.includes(seg.id)}
              showTranslation={showTranslation}
              editing={editingId === seg.id}
              onEdit={() => setEditingId(seg.id)}
              onDoneEdit={() => setEditingId(null)}
              onSelect={() => select({ selectedSegmentId: seg.id === selectedSegmentId ? null : seg.id })}
            />
          ))}
          {livePartial && (
            <li className="flex gap-2 px-2 py-1.5 text-sm" data-testid="live-partial" aria-live="polite">
              <span className="w-11 shrink-0 font-mono text-xs text-text-2 pt-0.5">{formatClock(livePartial.startedMs)}</span>
              <span className="italic text-text-1">
                {livePartial.text}
                <span className="ts-caret" aria-hidden />
              </span>
            </li>
          )}
        </ol>
      </div>

      <form onSubmit={submitTyped} className="flex items-center gap-2 border-t border-border p-2">
        <Keyboard size={14} className="shrink-0 text-text-2" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={thinking === "ended" ? "Type a thought (session ended — it will still be processed)" : "Type a thought…"}
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-bg-0 px-2 text-sm outline-none focus:border-accent"
          aria-label="Type a thought"
          data-testid="type-thought-input"
          maxLength={5000}
        />
        <Button type="submit" variant="primary" size="sm" disabled={!draft.trim()} data-testid="type-thought-submit">
          Add
        </Button>
      </form>
    </div>
  );
}

function SegmentRow({
  seg,
  compact,
  selected,
  referenced,
  processing,
  showTranslation,
  editing,
  onEdit,
  onDoneEdit,
  onSelect,
}: {
  seg: TranscriptSegment;
  compact?: boolean;
  selected: boolean;
  referenced: boolean;
  processing: boolean;
  showTranslation: boolean;
  editing: boolean;
  onEdit: () => void;
  onDoneEdit: () => void;
  onSelect: () => void;
}) {
  const upsert = useSessionStore((s) => s.upsertSegment);
  const applyEvents = useSessionStore((s) => s.applyEvents);
  const pushError = useSessionStore((s) => s.pushError);
  const [saving, setSaving] = useState(false);

  const save = async (text: string) => {
    const t = text.trim();
    if (!t || t === seg.rawText) return onDoneEdit();
    setSaving(true);
    try {
      const res = await api.segments.update(seg.sessionId, seg.id, { rawText: t });
      upsert(res.segment);
      applyEvents(res.events ?? []);
      onDoneEdit();
    } catch (e) {
      pushError({ stage: "apply", message: e instanceof ApiError ? e.message : "Could not save edit", retryable: false });
    } finally {
      setSaving(false);
    }
  };

  const cleaned = seg.cleanedText && seg.cleanedText.trim() !== seg.rawText.trim() ? seg.cleanedText : null;

  return (
    <li
      data-segment-id={seg.id}
      data-testid="segment-row"
      className={cn(
        "group flex gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        selected && "bg-accent-soft",
        referenced && !selected && "bg-bg-2 ring-1 ring-accent/40",
        !selected && !referenced && "hover:bg-bg-2",
      )}
    >
      <button type="button" onClick={onSelect} className="w-11 shrink-0 pt-0.5 text-left font-mono text-xs text-text-2 hover:text-accent" title="Select segment">
        {formatClock(seg.startedMs)}
      </button>
      <div className="min-w-0 flex-1">
        {editing ? (
          <SegmentEditor key={seg.id} initial={seg.rawText} saving={saving} onSave={(t) => void save(t)} onCancel={onDoneEdit} />
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words text-text-0" onDoubleClick={onEdit}>
              {seg.rawText}
            </p>
            {cleaned && (
              <p className="mt-0.5 text-xs text-text-2">
                <span className="mr-1 uppercase tracking-wide text-[10px]">cleaned</span>
                {cleaned}
              </p>
            )}
            {showTranslation && seg.translation && (
              <p className="mt-0.5 flex items-start gap-1 text-xs text-text-1">
                <Languages size={12} className="mt-0.5 shrink-0 text-text-2" />
                {seg.translation}
              </p>
            )}
          </>
        )}
        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Pill tone={langTone(seg.language)} title={`Language: ${seg.language}`}>
              {langTag(seg.language)}
            </Pill>
            {seg.provider === "typed" && <Pill tone="muted">typed</Pill>}
            {seg.editedByUser && <Pill tone="muted">edited</Pill>}
            {processing && (
              <Pill tone="accent" icon={<Loader2 size={10} className="animate-spin" />}>
                processing
              </Pill>
            )}
            {!editing && (
              <button type="button" onClick={onEdit} className="ml-auto hidden h-5 items-center gap-1 rounded-sm px-1 text-xs text-text-2 hover:text-text-0 group-hover:inline-flex" aria-label="Edit segment">
                <Pencil size={12} /> edit
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function SegmentEditor({ initial, saving, onSave, onCancel }: { initial: string; saving: boolean; onSave: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className="flex flex-col gap-1">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSave(text);
          }
        }}
        rows={Math.min(6, Math.max(2, Math.ceil(text.length / 60)))}
        className="w-full rounded-sm border border-accent bg-bg-0 px-2 py-1 text-sm outline-none"
        aria-label="Edit segment text"
      />
      <div className="flex gap-1">
        <Button size="sm" variant="primary" onClick={() => onSave(text)} loading={saving} icon={<Check size={12} />}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} icon={<X size={12} />}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
