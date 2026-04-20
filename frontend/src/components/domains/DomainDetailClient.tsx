"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { fetchAllPages } from "@/lib/paginate";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";

type CampaignBrief = {
  id: number;
  name: string;
  slug: string;
  status: string;
  domain_id: number | null;
};

type DomainDetail = {
  id: number;
  name: string;
  status: string;
  is_active: boolean;
  campaigns_count: number;
  campaigns: CampaignBrief[];
};

export function DomainDetailClient({ domainId }: { domainId: number }) {
  const [domain, setDomain] = useState<DomainDetail | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"pending" | "active" | "disabled">("pending");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allCampaigns, setAllCampaigns] = useState<CampaignBrief[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadDomain = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: DomainDetail }>(`v1/domains/${domainId}`);
      setDomain(res.data);
      setName(res.data.name);
      setStatus(res.data.status as typeof status);
      setIsActive(res.data.is_active);
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Failed to load domain");
      setDomain(null);
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  useEffect(() => {
    void loadDomain();
  }, [loadDomain]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAllPages<CampaignBrief>((page) => api.get(`v1/campaigns?page=${page}`));
        if (!cancelled) setAllCampaigns(list);
      } catch {
        if (!cancelled) setAllCampaigns([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveDomain = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`v1/domains/${domainId}`, {
        name: name.trim().toLowerCase(),
        status,
        is_active: isActive,
      });
      await loadDomain();
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const assignSelected = async () => {
    if (selectedIds.size === 0) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const cid of selectedIds) {
        await api.patch(`v1/campaigns/${cid}`, { domain_id: domainId });
      }
      setSelectedIds(new Set());
      await loadDomain();
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Assign failed");
    } finally {
      setSaving(false);
    }
  };

  const clearCampaignDomain = async (campaignId: number) => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`v1/campaigns/${campaignId}`, { domain_id: null });
      await loadDomain();
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (cid: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) {
        next.delete(cid);
      } else {
        next.add(cid);
      }
      return next;
    });
  };

  const assignable = allCampaigns.filter((c) => c.domain_id !== domainId);

  return (
    <AdminShell
      title={domain ? `Domain · ${domain.name}` : `Domain #${domainId}`}
      topbarRight={
        <Link
          href="/domains"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          All domains
        </Link>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <p className="text-sm text-slate-600">
          Assign this hostname to one or more campaigns. Redirects only honour the domain when status
          is <strong>active</strong> and the request <code className="rounded bg-slate-100 px-1">Host</code>{" "}
          header matches <code className="rounded bg-slate-100 px-1">domains.name</code>.
        </p>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}

        {!loading && domain ? (
          <>
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Domain settings</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Hostname</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Status</span>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                  >
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="disabled">disabled</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className="font-medium text-slate-700">is_active</span>
                </label>
              </div>
              <button
                type="button"
                disabled={saving}
                className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                onClick={() => void saveDomain()}
              >
                {saving ? "Saving…" : "Save domain"}
              </button>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Campaigns on this domain ({domain.campaigns?.length ?? 0})
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="py-2 pr-3 font-medium">Name</th>
                      <th className="py-2 pr-3 font-medium">Slug</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(domain.campaigns ?? []).map((c) => (
                      <tr key={c.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3">{c.name}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{c.slug}</td>
                        <td className="py-2 pr-3">{c.status}</td>
                        <td className="py-2">
                          <Link
                            href={`/campaigns/${c.id}/edit`}
                            className="font-medium text-slate-900 underline-offset-2 hover:underline"
                          >
                            Edit campaign
                          </Link>
                          <span className="px-2 text-slate-300">|</span>
                          <button
                            type="button"
                            className="font-medium text-red-700 hover:underline"
                            onClick={() => void clearCampaignDomain(c.id)}
                          >
                            Unassign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(domain.campaigns ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No campaigns use this domain yet.</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Assign more campaigns</h2>
              <p className="mt-1 text-sm text-slate-600">
                Select campaigns not already on this domain, then assign.
              </p>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-md border border-slate-100 p-2">
                {assignable.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                    <span className="text-sm">
                      {c.name}{" "}
                      <span className="text-slate-500">
                        ({c.slug})
                        {c.domain_id != null ? ` · current domain #${c.domain_id}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {assignable.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">All campaigns already use this domain.</p>
              ) : null}
              <button
                type="button"
                disabled={saving || selectedIds.size === 0}
                className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                onClick={() => void assignSelected()}
              >
                Assign selected ({selectedIds.size})
              </button>
            </section>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
