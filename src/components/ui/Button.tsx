/**
 * Button — the primary interactive element.
 *
 * Minimum touch target is 44px (--touch-target) per mobile-first guidelines.
 * All variants must pass WCAG AA contrast requirements.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant =
  | "primary"    // Filled — main CTA
  | "secondary"  // Outlined
  | "ghost"      // No background, subtle hover
  | "danger"     // Destructive action
  | "icon";      // Square icon-only button

type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a loading spinner and disable interaction */
  loading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Render as a different element (e.g. <a>) */
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "bg-[rgb(var(--color-primary))]",
    "text-[rgb(var(--color-primary-foreground))]",
    "hover:bg-[rgb(var(--color-primary-hover))]",
    "active:scale-[0.97]",
    "shadow-low",
  ].join(" "),

  secondary: [
    "bg-transparent",
    "text-[rgb(var(--color-text))]",
    "border border-[rgb(var(--color-border-strong))]",
    "hover:bg-[rgb(var(--color-surface-raised))]",
    "active:scale-[0.97]",
  ].join(" "),

  ghost: [
    "bg-transparent",
    "text-[rgb(var(--color-text-muted))]",
    "hover:bg-[rgb(var(--color-surface-raised))]",
    "hover:text-[rgb(var(--color-text))]",
    "active:scale-[0.97]",
  ].join(" "),

  danger: [
    "bg-[rgb(var(--color-danger))]",
    "text-[rgb(var(--color-danger-foreground))]",
    "hover:opacity-90",
    "active:scale-[0.97]",
    "shadow-low",
  ].join(" "),

  icon: [
    "bg-transparent",
    "text-[rgb(var(--color-text-muted))]",
    "hover:bg-[rgb(var(--color-surface-raised))]",
    "hover:text-[rgb(var(--color-text))]",
    "active:scale-[0.95]",
    "aspect-square",
  ].join(" "),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",    // 44px — minimum touch target
  lg: "h-12 px-6 text-base gap-2",
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) {
    const isDisabled = disabled || loading;
    const isIcon = variant === "icon";

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          // Base
          "inline-flex items-center justify-center",
          "font-medium",
          "rounded-[var(--radius-md)]",
          "transition-all duration-[var(--duration-fast)]",
          "focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-focus))] focus-visible:outline-offset-2",
          "select-none cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          // Variant
          variantClasses[variant],
          // Size
          isIcon ? iconSizeClasses[size] : sizeClasses[size],
          // Width
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && (
          <span
            className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// ─── Icon Button convenience export ──────────────────────────────────────────

export interface IconButtonProps extends Omit<ButtonProps, "variant"> {
  /** Accessible label — required for icon-only buttons */
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, children, className, ...props }, ref) {
    return (
      <Button
        ref={ref}
        variant="icon"
        aria-label={label}
        className={className}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";
