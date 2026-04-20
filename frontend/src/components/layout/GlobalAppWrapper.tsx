"use client";

import type { ReactNode } from "react";
import { ApiErrorReportingProvider } from "@/contexts/ApiErrorReportingProvider";
import { AuthGate } from "./AuthGate";

export function GlobalAppWrapper({ children }: { children: ReactNode }) {
  return (
    <ApiErrorReportingProvider>
      <AuthGate>
        <div className="min-h-screen">{children}</div>
      </AuthGate>
    </ApiErrorReportingProvider>
  );
}
