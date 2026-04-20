"use client";

/**
 * Demonstrates login with dynamic PAT + ApiError handling.
 */
import { useState } from "react";
import { loginWithPassword } from "@/lib/authClient";
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
      const result = await loginWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      setMessage(`Logged in as ${result.user.email}`);
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
      <p className="font-medium text-slate-800">Example form (dynamic token login)</p>
      <label className="form-field">
        <span className="form-label">Email</span>
        <input
          className="form-control"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          autoComplete="email"
        />
        {fieldErrors.name ? <span className="text-red-600">{fieldErrors.name}</span> : null}
      </label>
      <label className="form-field">
        <span className="form-label">Password</span>
        <input
          type="password"
          className="form-control"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          autoComplete="current-password"
        />
        {fieldErrors.password ? <span className="text-red-600">{fieldErrors.password}</span> : null}
      </label>
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
