"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui";
import { createLocalStore, useLocalValue } from "./hooks";

const MIN = 0.16;
type Fractions = [number, number, number];
const columnsStore = createLocalStore<Fractions>(
  "thinkspace.columns",
  [0.24, 0.5, 0.26],
  (raw) => {
    try {
      const arr = JSON.parse(raw) as number[];
      return arr.length === 3 && arr.every((n) => typeof n === "number" && n > 0) ? [arr[0], arr[1], arr[2]] : undefined;
    } catch {
      return undefined;
    }
  },
  (v) => JSON.stringify(v),
);

/**
 * Three columns with two draggable gutters (CSS grid). Fractions persist in localStorage.
 * Below the `stacked` breakpoint the parent renders tabs instead (see Workspace).
 */
export function ResizableColumns({
  left,
  center,
  right,
  className,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  const [saved, persist] = useLocalValue(columnsStore);
  const [live, setLive] = useState<Fractions | null>(null);
  const latest = useRef<Fractions | null>(null);
  const fr = live ?? saved;
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ gutter: 0 | 1; startX: number; start: Fractions } | null>(null);

  const onPointerDown = useCallback(
    (gutter: 0 | 1) => (e: React.PointerEvent<HTMLDivElement>) => {
      drag.current = { gutter, startX: e.clientX, start: fr };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [fr],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const width = el.getBoundingClientRect().width;
    const delta = (e.clientX - d.startX) / width;
    const next: Fractions = [...d.start] as Fractions;
    const a = d.gutter; // left of gutter
    const b = d.gutter + 1; // right of gutter
    let na = d.start[a] + delta;
    let nb = d.start[b] - delta;
    if (na < MIN) {
      nb -= MIN - na;
      na = MIN;
    }
    if (nb < MIN) {
      na -= MIN - nb;
      nb = MIN;
    }
    next[a] = na;
    next[b] = nb;
    latest.current = next;
    setLive(next);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    if (latest.current) persist(latest.current);
    latest.current = null;
    setLive(null);
  }, [persist]);

  return (
    <div
      ref={ref}
      className={cn("grid min-h-0 flex-1", className)}
      style={{ gridTemplateColumns: `${fr[0]}fr 8px ${fr[1]}fr 8px ${fr[2]}fr` }}
    >
      <div className="flex min-h-0 min-w-0 flex-col gap-2">{left}</div>
      <Gutter onPointerDown={onPointerDown(0)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
      <div className="flex min-h-0 min-w-0 flex-col gap-2">{center}</div>
      <Gutter onPointerDown={onPointerDown(1)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
      <div className="flex min-h-0 min-w-0 flex-col gap-2">{right}</div>
    </div>
  );
}

function Gutter(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="group flex cursor-col-resize items-stretch justify-center touch-none"
      {...props}
    >
      <div className="w-px bg-border group-hover:bg-accent group-active:bg-accent" />
    </div>
  );
}
