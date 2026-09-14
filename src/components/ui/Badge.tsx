/**
 * Badge — small label chips used in game cards, filters, tags, and status indicators.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border))]",
  primary: "bg-[rgb(var(--color-primary)/0.12)] text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary)/0.2)]",
  success: "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))] border border-[rgb(var(--color-success)/0.2)]",
  warning: "bg-[rgb(var(--color-warning)/0.12)] text-[rgb(var(--color-warning))] border border-[rgb(var(--color-warning)/0.2)]",
  danger: "bg-[rgb(var(--color-danger)/0.12)] text-[rgb(var(--color-danger))] border border-[rgb(var(--color-danger)/0.2)]",
  outline: "bg-transparent text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border-strong))]",
};

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        "px-2 py-0.5",
        "text-xs font-medium",
        "rounded-[var(--radius-full)]",
        "whitespace-nowrap",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
