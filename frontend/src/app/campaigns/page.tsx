"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";

type ListedCampaign = {
  id: number;
  name: string;
  slug: string;
  status: string;
  traffic_source?: { name: string };
};

type CampaignsPageJson = {
  data: ListedCampaign[];
  current_page: number;
  last_page: number;
};

export default function CampaignsPage() {
  const [rows, setRows] = useState<ListedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const collected: ListedCampaign[] = [];
        let page = 1;
        let last = 1;
        do {
          const chunk = await api.get<CampaignsPageJson>(`v1/campaigns?page=${page}`);
          collected.push(...chunk.data);
          last = chunk.last_page;
          page += 1;
        } while (page <= last && !cancelled);
        if (!cancelled) {
          setRows(collected);
        }
      } catch (e) {
        if (!cancelled) {
          reportApiError(e);
          setError(ApiError.isApiError(e) ? e.message : "Failed to load campaigns");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell
      title="Campaigns"
      topbarRight={
        <Link
          href="/campaigns/new"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 hover:text-white"
        >
          New campaign
        </Link>
      }
    >
      {loading ? <p className="text-sm text-slate-600">Loading campaigns…</p> : null}
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {!loading && !error ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-700">{c.slug}</td>
                  <td className="px-4 py-3 text-slate-700">{c.status}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.traffic_source?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/campaigns/${c.id}/edit`}
                      className="inline-flex h-9 items-center rounded-md border border-blue-700 bg-blue-700 px-3 text-sm font-semibold text-white outline-none ring-blue-700 ring-offset-2 hover:bg-blue-800 hover:text-white focus-visible:ring-4"
                    >
                      Edit
                    </Link>
                    <span className="px-2 text-slate-400" aria-hidden>
                      /
                    </span>
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="inline-flex h-9 items-center rounded-md border border-amber-400 bg-amber-50 px-3 text-sm font-semibold text-amber-900 outline-none ring-blue-700 ring-offset-2 hover:bg-amber-100 focus-visible:ring-4"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-600">No campaigns yet.</p>
          ) : null}
        </div>
      ) : null}
    </AdminShell>
  );
}
