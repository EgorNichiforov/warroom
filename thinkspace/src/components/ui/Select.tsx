"use client";

import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";

export type SelectOption<T extends string> = { value: T; label: string; disabled?: boolean };

export function Select<T extends string>({
  value,
  options,
  onValueChange,
  className,
  size = "md",
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "size"> & {
  value: T;
  options: SelectOption<T>[];
  onValueChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value as T)}
        className={cn(
          "appearance-none bg-bg-2 border border-border rounded-md text-text-0 pr-7 hover:border-border-strong disabled:opacity-50",
          size === "sm" ? "h-7 pl-2 text-xs" : "h-8 pl-3 text-sm",
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2 text-text-2" aria-hidden />
    </span>
  );
}
