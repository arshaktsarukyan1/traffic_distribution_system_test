"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";

type TrafficSource = { id: number; name: string; slug: string; is_active: boolean };

export default function TrafficSourcesPage() {
  const [rows, setRows] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: TrafficSource[] }>("v1/traffic-sources");
        if (!cancelled) setRows(res.data);
      } catch (e) {
        if (!cancelled) {
          reportApiError(e);
          setError(ApiError.isApiError(e) ? e.message : "Failed to load traffic sources");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell
      title="Traffic sources"
      topbarRight={
        <Link
          href="/campaigns/new"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New campaign
        </Link>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Campaigns must reference a traffic source. Sources are managed in the database (seeders or
          admin tooling); this page is read-only.
        </p>
        {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No active traffic sources returned. Seed the database (e.g.{" "}
            <code className="rounded bg-white px-1">PhaseOneCoreSeeder</code>) or insert rows into{" "}
            <code className="rounded bg-white px-1">traffic_sources</code> before creating a campaign.
          </p>
        ) : null}
        {!loading && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{r.slug}</td>
                    <td className="px-4 py-3">{r.is_active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
