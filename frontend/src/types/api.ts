/**
 * Laravel unified API error body (success responses use other shapes).
 */
export type ApiErrorResponse = {
  message: string;
  error: string;
  correlation_id: string;
  errors?: Record<string, string[]>;
  error_fields?: { field: string; messages: string[] }[];
};

/** Wire payload may omit `correlation_id` before client normalization. */
export type ApiErrorBody = Omit<ApiErrorResponse, "correlation_id"> & {
  correlation_id?: string;
};

export function isApiErrorResponse(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  return typeof v.message === "string" && typeof v.error === "string";
}
