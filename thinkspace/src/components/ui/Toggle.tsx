"use client";

import { cn } from "./cn";

export function Toggle({
  checked,
  onChange,
  label,
  className,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-xs text-text-1 select-none", disabled && "opacity-50", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-4 w-7 rounded-full border transition-colors",
          checked ? "bg-accent border-accent" : "bg-bg-3 border-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-2.5 rounded-full bg-white transition-[left]",
            checked ? "left-[14px]" : "left-0.5",
          )}
        />
      </button>
      {label}
    </label>
  );
}
