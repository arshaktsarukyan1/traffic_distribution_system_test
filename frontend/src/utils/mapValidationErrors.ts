import { ApiError } from "@/lib/apiError";

/**
 * Maps API validation errors to a single string per form field (first message wins).
 * Prefers `error_fields` (stable order, explicit field names) then falls back to Laravel `errors`.
 */
export function mapValidationErrors(error: ApiError): Record<string, string> {
  const out: Record<string, string> = {};

  if (error.errorFields && error.errorFields.length > 0) {
    for (const row of error.errorFields) {
      const msg = row.messages.find((m) => m.trim() !== "");
      if (msg) {
        out[row.field] = msg;
      }
    }
    return out;
  }

  if (error.validation) {
    for (const [field, messages] of Object.entries(error.validation)) {
      const first = messages.find((m) => m.trim() !== "");
      if (first) {
        out[field] = first;
      }
    }
  }

  return out;
}
