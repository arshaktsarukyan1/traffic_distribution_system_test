"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";
import { loginWithPassword, registerWithPassword } from "@/lib/authClient";
import { mapValidationErrors } from "@/utils/mapValidationErrors";

type AuthMode = "login" | "register";

function resolveNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) {
    return "/dashboard";
  }
  if (raw.startsWith("/auth")) {
    return "/dashboard";
  }
  return raw;
}

export default function AuthPage() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = useMemo(() => resolveNextPath(search.get("next")), [search]);

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    setFieldErrors({});
    try {
      if (mode === "register") {
        await registerWithPassword({
          name: name.trim(),
          email: email.trim(),
          password,
        });
      } else {
        await loginWithPassword({
          email: email.trim(),
          password,
        });
      }

      router.replace(nextPath);
    } catch (error: unknown) {
      reportApiError(error);
      if (ApiError.isApiError(error)) {
        setFieldErrors(mapValidationErrors(error));
        setMessage(error.message);
      } else {
        setMessage("Authentication failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">TDS Authentication</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in or create an account to access the dashboard with your personal access token.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={
              "rounded-md px-3 py-2 text-sm font-medium " +
              (mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")
            }
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={
              "rounded-md px-3 py-2 text-sm font-medium " +
              (mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")
            }
          >
            Register
          </button>
        </div>

        <form
          className="mt-5 space-y-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            void onSubmit();
          }}
        >
          {mode === "register" ? (
            <label className="form-field">
              <span className="form-label">Name</span>
              <input
                className="form-control"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                autoComplete="name"
              />
              {fieldErrors.name ? <span className="text-xs text-red-600">{fieldErrors.name}</span> : null}
            </label>
          ) : null}

          <label className="form-field">
            <span className="form-label">Email</span>
            <input
              className="form-control"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email ? <span className="text-xs text-red-600">{fieldErrors.email}</span> : null}
          </label>

          <label className="form-field">
            <span className="form-label">Password</span>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
            {fieldErrors.password ? (
              <span className="text-xs text-red-600">{fieldErrors.password}</span>
            ) : null}
          </label>

          {message ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          After login you will be redirected to <code>{nextPath}</code>.{" "}
          <Link href="/dashboard" className="underline">
            Go to dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
