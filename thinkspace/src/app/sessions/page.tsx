"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, FileJson, FileText, Mic, Moon, Search, Sun, Trash2, X } from "lucide-react";
import { ApiError, api, type SearchResult } from "@/lib/api";
import type { Session } from "@/lib/contracts";
import { redirectToLogin } from "@/lib/speech/controller";
import { formatClock } from "@/store/session-store";
import { Button, ConfirmDialog, Pill, cn } from "@/components/ui";
import { formatDate, useHealth, useTheme } from "@/components/workspace/hooks";

type SessionWithCounts = Session & { counts?: Partial<Record<string, number>> };

const statusTone = { active: "ok", paused: "warn", ended: "muted" } as const;
const kindLabel: Record<string, string> = {
  segment: "Transcript",
  thought: "Thought",
  concept: "Concept",
  action: "Action",
  decision: "Decision",
  scene: "Scene",
  model: "System",
  summary: "Summary",
};

export default function SessionsPage() {
  const router = useRouter();
  const [theme, setTheme] = useTheme();
  const { health } = useHealth();
  const [sessions, setSessions] = useState<SessionWithCounts[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [toDelete, setToDelete] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.sessions.list();
      setSessions(res.sessions as SessionWithCounts[]);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) return redirectToLogin();
      setError(e instanceof Error ? e.message : "Could not load sessions");
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ac = new AbortController();
    const t = setTimeout(() => {
      api
        .search(q, ac.signal)
        .then((r) => setResults(r.results))
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setResults([]);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [query]);

  const grouped = useMemo(() => {
    if (!results) return null;
    const map = new Map<string, { title: string; items: SearchResult[] }>();
    for (const r of results) {
      const g = map.get(r.sessionId) ?? { title: r.sessionTitle, items: [] };
      g.items.push(r);
      map.set(r.sessionId, g);
    }
    return Array.from(map.entries());
  }, [results]);

  const startThinking = async () => {
    setCreating(true);
    try {
      const { session } = await api.sessions.create({});
      router.push(`/s/${session.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) return redirectToLogin();
      setError(e instanceof Error ? e.message : "Could not create a session");
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.sessions.remove(toDelete.id);
      setSessions((s) => (s ? s.filter((x) => x.id !== toDelete.id) : s));
      setToDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col min-h-dvh">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-bg-0/90 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Mic size={16} />
          </span>
          <span className="text-md font-semibold tracking-tight">THINKSPACE</span>
          {health && health.auth === "open" && (
            <Pill tone="warn" title="No passphrase configured — anyone who can reach this app can use it.">
              open mode
            </Pill>
          )}
          {health && !health.providers.llm.real && <Pill tone="warn">LLM simulated</Pill>}
          {health && !health.providers.image.real && <Pill tone="warn">images simulated</Pill>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          icon={theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        />
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8 flex flex-col gap-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">History</h1>
            <p className="text-sm text-text-2">Every thinking session, searchable and re-openable.</p>
          </div>
          <Button variant="primary" size="lg" onClick={startThinking} loading={creating} icon={<Mic size={16} />} data-testid="start-thinking">
            Start thinking
          </Button>
        </section>

        <label className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-text-2" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcripts, thoughts, actions…"
            className="h-10 w-full rounded-md border border-border bg-bg-1 pl-9 pr-9 text-base outline-none focus:border-accent"
            data-testid="search-input"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 p-1 text-text-2 hover:text-text-0">
              <X size={14} />
            </button>
          )}
        </label>

        {error && (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {grouped ? (
          <section className="flex flex-col gap-3" data-testid="search-results">
            <h2 className="text-xs uppercase tracking-wide text-text-2">
              {searching ? "Searching…" : `${results?.length ?? 0} result${results?.length === 1 ? "" : "s"}`}
            </h2>
            {grouped.length === 0 && !searching && <p className="text-sm text-text-2">Nothing matched.</p>}
            {grouped.map(([sessionId, g]) => (
              <div key={sessionId} className="rounded-lg border border-border bg-bg-1">
                <Link href={`/s/${sessionId}`} className="flex h-10 items-center px-4 text-sm font-medium hover:text-accent">
                  {g.title || "Untitled session"}
                </Link>
                <ul className="border-t border-border divide-y divide-border">
                  {g.items.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <Link
                        href={`/s/${sessionId}${r.atMs !== null && r.atMs !== undefined ? `?t=${r.atMs}` : ""}`}
                        className="flex items-start gap-3 px-4 py-2 text-sm hover:bg-bg-2"
                      >
                        <Pill tone="accent" className="mt-0.5 shrink-0">
                          {kindLabel[r.kind] ?? r.kind}
                        </Pill>
                        <span className="flex-1 text-text-1 ts-truncate-2">{r.text}</span>
                        {r.atMs !== null && r.atMs !== undefined && (
                          <span className="font-mono text-xs text-text-2 shrink-0">{formatClock(r.atMs)}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : (
          <section className="grid gap-3 sm:grid-cols-2" data-testid="session-list">
            {sessions === null && <p className="text-sm text-text-2">Loading…</p>}
            {sessions && sessions.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-2">
                No sessions yet. Press <strong className="text-text-0">Start thinking</strong> and speak.
              </div>
            )}
            {sessions?.map((s) => (
              <SessionCard key={s.id} session={s} onDelete={() => setToDelete(s)} />
            ))}
          </section>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete session?"
        message={
          <>
            <strong className="text-text-0">{toDelete?.title || "Untitled session"}</strong> and everything derived from it (transcript, thoughts,
            maps, scenes, actions) will be permanently deleted.
          </>
        }
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </main>
  );
}

function SessionCard({ session, onDelete }: { session: SessionWithCounts; onDelete: () => void }) {
  const counts = session.counts ?? {};
  const countEntries = (["segments", "thoughts", "concepts", "actions"] as const).filter((k) => typeof counts[k] === "number");
  return (
    <article className="group flex flex-col gap-3 rounded-lg border border-border bg-bg-1 p-4 hover:border-border-strong" data-testid="session-card">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/s/${session.id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-base font-medium text-text-0 group-hover:text-accent">{session.title || "Untitled session"}</h3>
          <p className="mt-0.5 text-xs text-text-2">{formatDate(session.startedAt)}</p>
        </Link>
        <Pill tone={statusTone[session.status]} className="shrink-0 capitalize">
          {session.status}
        </Pill>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-1">
        <span className="inline-flex items-center gap-1 font-mono">
          <Clock size={12} /> {formatClock(session.durationMs)}
        </span>
        {countEntries.map((k) => (
          <span key={k} className="text-text-2">
            {counts[k]} {k}
          </span>
        ))}
        {session.languageHint && <span className="text-text-2 uppercase">{session.languageHint}</span>}
      </div>
      <div className={cn("flex items-center gap-1 border-t border-border pt-3")}>
        <a href={api.sessions.exportUrl(session.id, "md")} className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs text-text-1 hover:bg-bg-2 hover:text-text-0" download>
          <FileText size={14} /> Markdown
        </a>
        <a href={api.sessions.exportUrl(session.id, "json")} className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs text-text-1 hover:bg-bg-2 hover:text-text-0" download>
          <FileJson size={14} /> JSON
        </a>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete session" icon={<Trash2 size={14} />} className="text-text-2 hover:text-danger" />
        <Link href={`/s/${session.id}`} className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs text-accent hover:bg-accent-soft">
          Open
        </Link>
      </div>
    </article>
  );
}
