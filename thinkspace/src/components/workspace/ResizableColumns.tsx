"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui";

const STORAGE_KEY = "thinkspace.columns";
const MIN = 0.16;

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
  const [fr, setFr] = useState<[number, number, number]>([0.24, 0.5, 0.26]);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ gutter: 0 | 1; startX: number; start: [number, number, number] } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const arr = JSON.parse(saved) as number[];
        if (arr.length === 3 && arr.every((n) => typeof n === "number" && n > 0)) setFr([arr[0], arr[1], arr[2]]);
      }
    } catch {
      /* ignore */
    }
  }, []);

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
    const next: [number, number, number] = [...d.start] as [number, number, number];
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
    setFr(next);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    setFr((f) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
      } catch {
        /* ignore */
      }
      return f;
    });
  }, []);

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
