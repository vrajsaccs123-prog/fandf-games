/**
 * Surface — the foundational layout primitive.
 *
 * All "card-like" or "panel-like" UI containers should use a Surface variant
 * rather than writing raw background/shadow styles inline.
 *
 * Variants map to the elevation system defined in the design tokens.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

type SurfaceVariant =
  | "default"    // --color-surface: parchment / warm dark
  | "raised"     // --color-surface-raised: slightly elevated
  | "sunken"     // --color-surface-sunken: inset
  | "overlay"    // --color-surface-overlay: dark overlay for modals
  | "table"      // --color-table: felt-green game surface
  | "transparent";

type SurfaceElevation = "none" | "low" | "medium" | "high";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  elevation?: SurfaceElevation;
  /** Apply border */
  bordered?: boolean;
  /** Clip children to rounded corners */
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  as?: React.ElementType;
}

const variantClasses: Record<SurfaceVariant, string> = {
  default: "bg-surface",
  raised: "bg-surface-raised",
  sunken: "bg-surface-sunken",
  overlay: "bg-[rgb(var(--color-surface-overlay))]",
  table: "bg-table relative texture-felt",
  transparent: "bg-transparent",
};

const elevationClasses: Record<SurfaceElevation, string> = {
  none: "",
  low: "shadow-low",
  medium: "shadow-medium",
  high: "shadow-high",
};

const roundedClasses: Record<
  NonNullable<SurfaceProps["rounded"]>,
  string
> = {
  sm: "rounded-[var(--radius-sm)]",
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius-lg)]",
  xl: "rounded-[var(--radius-xl)]",
  "2xl": "rounded-[var(--radius-2xl)]",
  full: "rounded-full",
};

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  function Surface(
    {
      variant = "default",
      elevation = "none",
      bordered = false,
      rounded = "lg",
      as: Tag = "div",
      className,
      children,
      ...props
    },
    ref
  ) {
    return (
      <Tag
        ref={ref}
        className={cn(
          variantClasses[variant],
          elevationClasses[elevation],
          roundedClasses[rounded],
          bordered && "border border-base",
          className
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);

Surface.displayName = "Surface";
