"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "rec";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-[#06131f] hover:brightness-110 border border-transparent font-medium",
  secondary: "bg-bg-2 text-text-0 border border-border hover:bg-bg-3 hover:border-border-strong",
  ghost: "bg-transparent text-text-1 border border-transparent hover:bg-bg-2 hover:text-text-0",
  danger: "bg-danger-soft text-danger border border-transparent hover:brightness-110",
  rec: "bg-rec text-white border border-transparent hover:brightness-110 font-medium",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2 text-xs gap-1.5 rounded-sm",
  md: "h-8 px-3 text-sm gap-2 rounded-md",
  lg: "h-10 px-4 text-base gap-2 rounded-md",
};

export function Button({ variant = "secondary", size = "md", icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap select-none transition-colors disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="inline-block size-3 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
