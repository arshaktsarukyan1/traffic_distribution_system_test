import { ApiError } from "@/lib/apiError";

const INTERNAL_PREFIX = "/api/internal/";

function normalizePath(path: string): string {
  return path.replace(/^\//, "");
}

function parseJsonBody(text: string): unknown {
  const t = text.trim();
  if (t === "") {
    return null;
  }
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return { message: t || "Invalid JSON from server" };
  }
}

/**
 * Low-level request: always returns parsed JSON on success, throws {@link ApiError} on failure.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${INTERNAL_PREFIX}${normalizePath(path)}`;
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  const parsed = parseJsonBody(text);

  if (!res.ok) {
    throw ApiError.fromHttpFailure(res.status, parsed);
  }

  if (res.status === 204 || text.trim() === "") {
    return undefined as T;
  }

  return parsed as T;
}

/**
 * Typed facade over the Next.js BFF proxy (`/api/internal/*` → Laravel `/api/*`).
 */
export const api = {
  get: <T>(path: string, init?: Omit<RequestInit, "method" | "body">) =>
    apiRequest<T>(path, { ...init, method: "GET" }),

  post: <T>(path: string, body?: unknown, init?: Omit<RequestInit, "method" | "body">) => {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    return apiRequest<T>(path, {
      ...init,
      method: "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  patch: <T>(path: string, body?: unknown, init?: Omit<RequestInit, "method" | "body">) => {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    return apiRequest<T>(path, {
      ...init,
      method: "PATCH",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  delete: (path: string, init?: Omit<RequestInit, "method" | "body">) =>
    apiRequest<void>(path, { ...init, method: "DELETE" }),
};
