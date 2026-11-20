"use client";

import { Activity, CheckSquare, Image as ImageIcon, LayoutGrid, ListTree, Network, ScrollText } from "lucide-react";
import { cn } from "@/components/ui";
import type { ViewId } from "@/store/session-store";

export const VIEWS: { id: ViewId; label: string; short: string; icon: typeof Activity }[] = [
  { id: "live", label: "Live", short: "Live", icon: LayoutGrid },
  { id: "canvas", label: "Canvas", short: "Canvas", icon: ImageIcon },
  { id: "mindmap", label: "Mind Map", short: "Map", icon: Network },
  { id: "systems", label: "Systems", short: "Systems", icon: ListTree },
  { id: "transcript", label: "Transcript", short: "Text", icon: ScrollText },
  { id: "actions", label: "Decisions & Actions", short: "Actions", icon: CheckSquare },
  { id: "timeline", label: "Timeline", short: "Time", icon: Activity },
];

export function ViewTabs({
  view,
  onChange,
  counts,
  variant = "top",
}: {
  view: ViewId;
  onChange: (v: ViewId) => void;
  counts?: Partial<Record<ViewId, number>>;
  variant?: "top" | "bottom";
}) {
  if (variant === "bottom") {
    return (
      <nav className="grid grid-cols-7 border-t border-border bg-bg-1 pb-[env(safe-area-inset-bottom)]" aria-label="Views" data-testid="view-tabs-bottom">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          const active = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id)}
              aria-current={active ? "page" : undefined}
              className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[10px]", active ? "text-accent" : "text-text-2")}
            >
              <Icon size={18} />
              {v.short}
            </button>
          );
        })}
      </nav>
    );
  }
  return (
    <nav className="flex h-10 items-end gap-1 overflow-x-auto border-b border-border px-2" aria-label="Views" role="tablist">
      {VIEWS.map((v) => {
        const Icon = v.icon;
        const active = v.id === view;
        const count = counts?.[v.id];
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v.id)}
            data-testid={`tab-${v.id}`}
            className={cn(
              "flex h-9 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm transition-colors",
              active ? "border-accent text-text-0" : "border-transparent text-text-1 hover:text-text-0",
            )}
          >
            <Icon size={14} className={active ? "text-accent" : "text-text-2"} />
            {v.label}
            {count !== undefined && count > 0 && <span className="rounded-sm bg-bg-2 px-1 text-xs text-text-2">{count}</span>}
          </button>
        );
      })}
    </nav>
  );
}
