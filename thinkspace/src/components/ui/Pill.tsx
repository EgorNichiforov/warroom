import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type PillTone = "neutral" | "accent" | "ok" | "warn" | "danger" | "rec" | "muted";

const tones: Record<PillTone, string> = {
  neutral: "bg-bg-2 text-text-1 border-border",
  muted: "bg-transparent text-text-2 border-border",
  accent: "bg-accent-soft text-accent border-transparent",
  ok: "bg-ok-soft text-ok border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  rec: "bg-rec text-white border-transparent",
};

export function Pill({
  tone = "neutral",
  icon,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: PillTone; icon?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-5 px-1.5 rounded-sm border text-xs leading-none whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
