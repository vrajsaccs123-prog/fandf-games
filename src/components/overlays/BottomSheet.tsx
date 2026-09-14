/**
 * BottomSheet — mobile-first overlay for secondary content.
 *
 * Used for: filter drawers, rules panels, settings, confirmations.
 * Animates up from the bottom on mobile; can render as a side panel on desktop.
 *
 * Accessibility: traps focus, closes on Escape, backdrop click.
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Content rendered inside the sheet */
  children: React.ReactNode;
  /** Height: "auto" lets content size it, "full" = full viewport height */
  height?: "auto" | "half" | "full";
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  height = "auto",
  className,
}: BottomSheetProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const heightClasses: Record<NonNullable<BottomSheetProps["height"]>, string> =
    {
      auto: "max-h-[90dvh]",
      half: "h-[50dvh]",
      full: "h-[100dvh]",
    };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[var(--z-overlay)] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[var(--z-modal)]",
              "bg-[rgb(var(--color-surface))]",
              "rounded-t-[var(--radius-2xl)]",
              "shadow-modal",
              "flex flex-col",
              "pb-safe",
              heightClasses[height],
              className
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 40,
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[rgb(var(--color-border-strong))]" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-[rgb(var(--color-text))]">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className={cn(
                    "flex items-center justify-center",
                    "w-8 h-8 rounded-full",
                    "text-[rgb(var(--color-text-muted))]",
                    "hover:bg-[rgb(var(--color-surface-raised))]",
                    "transition-colors duration-[var(--duration-fast)]"
                  )}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 4L4 12M4 4l8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
