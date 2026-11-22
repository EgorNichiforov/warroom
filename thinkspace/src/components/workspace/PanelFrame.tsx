"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Maximize2 } from "lucide-react";
import { Button, cn } from "@/components/ui";
import type { ViewId } from "@/store/session-store";

export function PanelFrame({
  title,
  subtitle,
  actions,
  children,
  collapsed,
  onToggleCollapse,
  onExpand,
  expandTo,
  className,
  bodyClassName,
  testId,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** switch the workspace to the full-size tab for this panel */
  onExpand?: (view: ViewId) => void;
  expandTo?: ViewId;
  className?: string;
  bodyClassName?: string;
  testId?: string;
}) {
  return (
    <section
      className={cn("flex min-h-0 flex-col rounded-lg border border-border bg-bg-1", collapsed ? "flex-none" : "flex-1", className)}
      data-testid={testId}
      aria-label={title}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-6 items-center gap-1 rounded-sm px-1 text-sm font-medium text-text-0 hover:bg-bg-2"
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight size={14} className="text-text-2" /> : <ChevronDown size={14} className="text-text-2" />}
            {title}
          </button>
        ) : (
          <h2 className="px-1 text-sm font-medium">{title}</h2>
        )}
        {subtitle && <span className="truncate text-xs text-text-2">{subtitle}</span>}
        <span className="flex-1" />
        {!collapsed && actions}
        {onExpand && expandTo && (
          <Button variant="ghost" size="sm" aria-label={`Expand ${title}`} title="Expand" onClick={() => onExpand(expandTo)} icon={<Maximize2 size={14} />} />
        )}
      </header>
      {!collapsed && <div className={cn("min-h-0 flex-1", bodyClassName ?? "ts-panel-scroll")}>{children}</div>}
    </section>
  );
}
