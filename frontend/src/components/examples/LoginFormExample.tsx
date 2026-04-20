"use client";

/**
 * Demonstrates validation mapping + ApiError handling.
 * Uses an intentional invalid POST to `/v1/domains` so Laravel returns 422 with `errors` / `error_fields`.
 */
import { useState } from "react";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { mapValidationErrors } from "@/utils/mapValidationErrors";
import { useApiErrorReporting } from "@/contexts/ApiErrorReportingProvider";

export function LoginFormExample() {
  const { report } = useApiErrorReporting();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setFieldErrors({});
    setMessage(null);
    try {
      // Demo only: invalid payload → 422 + validation shape (replace with real auth POST).
      await api.post("v1/domains", {
        name: email.trim() || undefined,
        status: password.trim() || undefined,
      });
      setMessage("OK");
    } catch (e) {
      report(e);
      if (ApiError.isApiError(e)) {
        setFieldErrors(mapValidationErrors(e));
        const devHint =
          process.env.NODE_ENV === "development" ? ` [${e.correlationId}]` : "";
        setMessage(`${e.message}${devHint}`);
      } else {
        setMessage("Unexpected error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="mx-auto max-w-md space-y-3 rounded-lg border border-slate-300 bg-white p-4 text-sm"
      onSubmit={(ev) => {
        ev.preventDefault();
        void submit();
      }}
    >
      <p className="font-medium text-slate-800">Example form (422 validation demo)</p>
      <label className="form-field">
        <span className="form-label">Email (maps to domain `name` in demo)</span>
        <input
          className="form-control"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          autoComplete="email"
        />
        {fieldErrors.name ? <span className="text-red-600">{fieldErrors.name}</span> : null}
      </label>
      <label className="form-field">
        <span className="form-label">Password (maps to `status` in demo)</span>
        <input
          type="password"
          className="form-control"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          autoComplete="current-password"
        />
        {fieldErrors.status ? <span className="text-red-600">{fieldErrors.status}</span> : null}
      </label>
      {fieldErrors.email ? <span className="text-red-600">{fieldErrors.email}</span> : null}
      {message ? <p className="text-slate-700">{message}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-slate-900 px-3 py-1.5 text-white disabled:opacity-50"
      >
        {submitting ? "…" : "Submit"}
      </button>
    </form>
  );
}
