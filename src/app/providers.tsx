/**
 * Root providers — wraps the entire application.
 *
 * Handles: future provider additions (analytics, feature flags, etc.).
 */

"use client";

import * as React from "react";
import { PwaProvider } from "@/components/pwa/PwaProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <PwaProvider>{children}</PwaProvider>;
}
