"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { fetchAllPages } from "@/lib/paginate";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";
import { mapValidationErrors } from "@/utils/mapValidationErrors";

type DomainRow = {
  id: number;
  name: string;
  status: string;
  is_active: boolean;
  campaigns_count?: number;
};

function statusBadge(status: string): string {
  if (status === "active") return "bg-emerald-100 text-emerald-900";
  if (status === "pending") return "bg-amber-100 text-amber-900";
  return "bg-slate-200 text-slate-800";
}

export default function DomainsPage() {
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"pending" | "active" | "disabled">("pending");
  const [creating, setCreating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllPages<DomainRow>((page) => api.get(`v1/domains?page=${page}`));
      setRows(all);
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Failed to load domains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter a hostname (e.g. track.example.com).");
      return;
    }
    setCreating(true);
    setError(null);
    setFieldErrors({});
    try {
      await api.post("v1/domains", {
        name: trimmed,
        status,
        is_active: true,
      });
      setName("");
      setStatus("pending");
      await load();
    } catch (e) {
      reportApiError(e);
      if (ApiError.isApiError(e)) {
        setError(e.message);
        setFieldErrors(mapValidationErrors(e));
      } else {
        setError("Create failed");
      }
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this domain? Campaigns using it will have domain_id cleared (DB nullOnDelete).")) {
      return;
    }
    setError(null);
    try {
      await api.delete(`v1/domains/${id}`);
      await load();
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Delete failed");
    }
  };

  return (
    <AdminShell title="Domains">
      <div className="mx-auto max-w-5xl space-y-6">
        <p className="text-sm text-slate-600">
          Tracking hostnames (no scheme). Set status to <strong>active</strong> only after DNS and TLS
          are ready. Campaigns with an assigned domain only accept redirects on that host — see{" "}
          <code className="rounded bg-slate-100 px-1">docs/Domains_and_staging.md</code> in the repo.
        </p>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Add domain</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block min-w-[14rem] flex-1 text-sm">
              <span className="font-medium text-slate-700">Hostname</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
                value={name}
                onChange={(e) => setName(e.target.value.trim())}
                placeholder="track.example.com"
              />
              {fieldErrors.name ? (
                <span className="mt-1 block text-xs text-red-600">{fieldErrors.name}</span>
              ) : null}
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <select
                className="mt-1 w-40 rounded-md border border-slate-200 px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="pending">pending</option>
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <button
              type="button"
              disabled={creating}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              onClick={() => void create()}
            >
              {creating ? "Adding…" : "Add domain"}
            </button>
          </div>
        </section>

        {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}

        {!loading ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 font-medium">Hostname</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 font-medium">Campaigns</th>
                  <th className="px-4 py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">{d.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold " +
                          statusBadge(d.status)
                        }
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{d.is_active ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">{d.campaigns_count ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/domains/${d.id}`}
                        className="font-medium text-slate-900 underline-offset-2 hover:underline"
                      >
                        Manage
                      </Link>
                      <span className="px-2 text-slate-300">|</span>
                      <button
                        type="button"
                        className="font-medium text-red-700 hover:underline"
                        onClick={() => void remove(d.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-600">No domains yet.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
