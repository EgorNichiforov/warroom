"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Moon, Pencil, Sun } from "lucide-react";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/lib/contracts/api";
import { Button, cn } from "@/components/ui";
import { useSessionStore } from "@/store/session-store";
import { SessionControls } from "./SessionControls";
import { RecordingIndicator, StatusPills } from "./StatusPills";
import { useTheme } from "./hooks";

export function TopBar({ health, compact }: { health: HealthResponse | null; compact?: boolean }) {
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const [theme, setTheme] = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = async () => {
    setEditing(false);
    const title = draft.trim();
    if (!session || !title || title === session.title) return;
    setSession({ ...session, title });
    try {
      const res = await api.sessions.update(session.id, { title });
      setSession(res.session);
    } catch {
      /* keep optimistic title; next save will carry it */
    }
  };

  return (
    <header className="flex flex-col gap-2 border-b border-border bg-bg-1 px-3 py-2 sm:px-4" data-testid="topbar">
      <div className="flex items-center gap-2">
        <Link href="/sessions" className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-1 hover:bg-bg-2 hover:text-text-0" aria-label="Back to history">
          <ArrowLeft size={16} />
        </Link>
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              void commit();
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void commit()}
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              className="h-7 min-w-0 flex-1 rounded-sm border border-accent bg-bg-0 px-2 text-base font-medium outline-none"
              aria-label="Session title"
              maxLength={200}
            />
            <Button type="submit" variant="ghost" size="sm" aria-label="Save title" icon={<Check size={14} />} />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(session?.title ?? "");
              setEditing(true);
            }}
            className={cn("group flex min-w-0 flex-1 items-center gap-1.5 text-left", !session && "opacity-50")}
            title="Rename session"
            data-testid="session-title"
          >
            <span className="truncate text-base font-medium">{session?.title || "Untitled session"}</span>
            <Pencil size={12} className="shrink-0 text-text-2 opacity-0 group-hover:opacity-100" />
          </button>
        )}
        <RecordingIndicator />
        {!compact && <SessionControls health={health} compact />}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          icon={theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusPills health={health} />
      </div>
      {compact && (
        <div className="flex justify-center">
          <SessionControls health={health} />
        </div>
      )}
    </header>
  );
}
