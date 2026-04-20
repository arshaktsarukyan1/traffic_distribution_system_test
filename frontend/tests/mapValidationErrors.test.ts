import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiError";
import type { ApiErrorResponse } from "@/types/api";
import { mapValidationErrors } from "@/utils/mapValidationErrors";

function makeError(payload: ApiErrorResponse, status = 422): ApiError {
  return new ApiError(payload.message, status, payload);
}

describe("mapValidationErrors", () => {
  it("prefers error_fields", () => {
    const err = makeError({
      message: "Validation failed",
      error: "validation_failed",
      correlation_id: "c1",
      error_fields: [
        { field: "email", messages: ["The email field is required.", "Second"] },
        { field: "name", messages: ["Bad name"] },
      ],
    });
    expect(mapValidationErrors(err)).toEqual({
      email: "The email field is required.",
      name: "Bad name",
    });
  });

  it("falls back to errors map", () => {
    const err = makeError({
      message: "Validation failed",
      error: "validation_failed",
      correlation_id: "c2",
      errors: { title: ["Required", "X"] },
    });
    expect(mapValidationErrors(err)).toEqual({ title: "Required" });
  });

  it("returns empty when no validation payload", () => {
    const err = makeError(
      {
        message: "Nope",
        error: "manual_conversion_failed",
        correlation_id: "c3",
      },
      422,
    );
    expect(mapValidationErrors(err)).toEqual({});
  });
});
