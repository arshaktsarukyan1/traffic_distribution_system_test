"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { ApiError } from "@/lib/apiError";
import { reportApiError, subscribeApiErrors } from "@/lib/reportApiError";

type ApiErrorReportingContextValue = {
  /** Report an API error (dev console + registered listeners). */
  report: (error: unknown) => void;
  /** Register a toast / analytics handler for the lifetime of the component. */
  subscribe: (listener: (error: ApiError) => void) => () => void;
};

const ApiErrorReportingContext = createContext<ApiErrorReportingContextValue | null>(null);

export function ApiErrorReportingProvider({ children }: { children: ReactNode }) {
  const report = useCallback((error: unknown) => {
    reportApiError(error);
  }, []);

  const subscribe = useCallback((listener: (error: ApiError) => void) => subscribeApiErrors(listener), []);

  const value = useMemo(
    () => ({
      report,
      subscribe,
    }),
    [report, subscribe],
  );

  return <ApiErrorReportingContext.Provider value={value}>{children}</ApiErrorReportingContext.Provider>;
}

export function useApiErrorReporting(): ApiErrorReportingContextValue {
  const ctx = useContext(ApiErrorReportingContext);
  if (!ctx) {
    return {
      report: reportApiError,
      subscribe: subscribeApiErrors,
    };
  }
  return ctx;
}
