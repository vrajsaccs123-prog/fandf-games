"use client";

import { SerwistProvider } from "@serwist/next/react";

const isDev = process.env.NODE_ENV === "development";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={isDev}
      register={!isDev}
      cacheOnNavigation
      reloadOnOnline
    >
      {children}
    </SerwistProvider>
  );
}
