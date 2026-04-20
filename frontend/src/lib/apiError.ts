import type { ApiErrorResponse } from "@/types/api";
import { isApiErrorResponse } from "@/types/api";

function newCorrelationId(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return `client-${Date.now()}`;
  }
}

function fallbackErrorCode(status: number): string {
  if (status === 502) return "bad_gateway";
  if (status === 503) return "service_unavailable";
  if (status === 504) return "gateway_timeout";
  return "http_error";
}

/**
 * Normalizes any failed-response body into {@link ApiErrorResponse} for a stable client contract.
 */
export function normalizeApiFailurePayload(status: number, parsed: unknown): ApiErrorResponse {
  if (isApiErrorResponse(parsed)) {
    const correlation_id =
      typeof parsed.correlation_id === "string" && parsed.correlation_id.trim() !== ""
        ? parsed.correlation_id
        : newCorrelationId();
    return {
      ...parsed,
      correlation_id,
    };
  }

  let message = `Request failed (${status})`;
  let error = fallbackErrorCode(status);
  const correlation_id = newCorrelationId();

  if (parsed !== null && parsed !== undefined && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    if (typeof p.message === "string" && p.message.trim() !== "") {
      message = p.message;
    }
    if (typeof p.hint === "string" && p.hint.trim() !== "") {
      message = message ? `${message} — ${p.hint}` : p.hint;
    }
    if (typeof p.error === "string" && p.error.trim() !== "") {
      error = p.error;
    }
  } else if (typeof parsed === "string" && parsed.trim() !== "") {
    message = parsed;
  }

  return { message, error, correlation_id };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId: string;
  readonly validation?: Record<string, string[]>;
  readonly errorFields?: { field: string; messages: string[] }[];
  /** Original parsed body (or normalized payload) for debugging */
  readonly body: unknown;

  constructor(message: string, status: number, payload: ApiErrorResponse, body: unknown = payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.error;
    this.correlationId = payload.correlation_id;
    this.validation = payload.errors;
    this.errorFields = payload.error_fields;
    this.body = body;
  }

  static isApiError(e: unknown): e is ApiError {
    return e instanceof ApiError;
  }

  static fromHttpFailure(status: number, parsed: unknown): ApiError {
    const payload = normalizeApiFailurePayload(status, parsed);
    return new ApiError(payload.message, status, payload, parsed);
  }
}
