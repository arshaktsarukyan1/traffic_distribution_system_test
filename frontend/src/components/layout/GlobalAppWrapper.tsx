"use client";

import type { ReactNode } from "react";
import { ApiErrorReportingProvider } from "@/contexts/ApiErrorReportingProvider";

export function GlobalAppWrapper({ children }: { children: ReactNode }) {
  return (
    <ApiErrorReportingProvider>
      <div className="min-h-screen">{children}</div>
    </ApiErrorReportingProvider>
  );
}
