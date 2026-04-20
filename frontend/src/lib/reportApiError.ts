import { ApiError } from "@/lib/apiError";

type Listener = (error: ApiError) => void;

const listeners = new Set<Listener>();

/** Optional global hooks (e.g. toast service) */
export function subscribeApiErrors(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Dev-only console diagnostics + optional global listeners.
 * Call from `catch` blocks; safe to use everywhere.
 */
export function reportApiError(error: unknown): void {
  if (!ApiError.isApiError(error)) {
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[api]", error.code, error.correlationId, error.message);
  }

  for (const fn of listeners) {
    try {
      fn(error);
    } catch {
      // ignore listener failures
    }
  }
}
