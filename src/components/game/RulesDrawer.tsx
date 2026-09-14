"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import type { GameHelpRules, HelpSection } from "@/game/core/types/help";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRulesHelp() {
  const [open, setOpen] = React.useState(false);
  return {
    open,
    openRules: () => setOpen(true),
    closeRules: () => setOpen(false),
    setOpen,
  };
}

// ─── Help button ──────────────────────────────────────────────────────────────

export function RulesHelpButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-lg text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-raised))] text-xs font-bold leading-none",
        className
      )}
      title="How to Play"
      aria-label="How to Play"
    >
      ?
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function HelpRuleSection({
  title,
  text,
  items,
  prefix,
}: HelpSection & { prefix?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-semibold text-[rgb(var(--color-text))] text-xs uppercase tracking-wide mb-0.5">
        {prefix}
        <span>{title}</span>
      </div>
      <p className="leading-relaxed">{text}</p>
      {items && items.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1 pl-1">
          {items.map((item) => (
            <li key={item} className="flex gap-2 leading-relaxed">
              <span className="text-[rgb(var(--color-text-muted))] shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export interface RulesDrawerProps {
  open: boolean;
  onClose: () => void;
  help: GameHelpRules;
  /** Render extra content immediately after the section with this title */
  slotAfter?: { afterTitle: string; content: React.ReactNode };
  /** Optional icon or badge shown beside a section title */
  getSectionPrefix?: (section: HelpSection) => React.ReactNode | undefined;
  children?: React.ReactNode;
}

export function RulesDrawer({
  open,
  onClose,
  help,
  slotAfter,
  getSectionPrefix,
  children,
}: RulesDrawerProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[var(--z-modal)] bg-black/70"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="absolute bottom-0 left-0 right-0 bg-[rgb(var(--color-surface-raised))] rounded-t-2xl p-4 pb-safe max-h-[85vh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[rgb(var(--color-text))]">
                How to Play
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] text-2xl leading-none"
                aria-label="Close rules"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3 text-sm text-[rgb(var(--color-text-muted))]">
              {help.sections.map((section) => (
                <React.Fragment key={section.title}>
                  <HelpRuleSection {...section} prefix={getSectionPrefix?.(section)} />
                  {slotAfter?.afterTitle === section.title && slotAfter.content}
                </React.Fragment>
              ))}
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
