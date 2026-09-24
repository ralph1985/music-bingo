"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";

type ConvexClientProviderProps = {
  children: ReactNode;
};

export default function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL no está configurada.");
  }

  const client = useMemo(() => new ConvexReactClient(url), [url]);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
