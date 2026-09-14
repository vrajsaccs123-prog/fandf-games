/**
 * cn() — merge class names with Tailwind conflict resolution.
 * Uses clsx for conditional class composition + tailwind-merge to
 * resolve Tailwind utility conflicts (e.g. "p-2 p-4" → "p-4").
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
