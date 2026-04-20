"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FiltersBar, defaultFilters, type DashboardFilters } from "@/components/dashboard/FiltersBar";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";
import { toQuery } from "@/lib/query";

type CampaignRow = {
  id: number;
  name: string;
  status: string;
  traffic_source?: { name: string };
  traffic_source_id?: number;
};

type AbVariant = {
  variant_key: string;
  offer_id: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  kpi: Record<string, number | null>;
};

type AbResponse = {
  data: {
    campaign_id: number;
    window: { from: string; to: string };
    recommendation: { status: string; message?: string | null; winner_variant_key?: string | null };
    variants: AbVariant[];
  };
};

function money(v: number): string {
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function AbTestsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [trafficSources, setTrafficSources] = useState<Array<{ id: number; name: string }>>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [campaignId, setCampaignId] = useState<number | "">("");
  const [filters, setFilters] = useState<DashboardFilters>(() => defaultFilters());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AbResponse["data"] | null>(null);

  useEffect(() => {
    const nextFilters: DashboardFilters = {
      ...defaultFilters(),
      from: sp.get("from") ?? defaultFilters().from,
      to: sp.get("to") ?? defaultFilters().to,
      country_code: sp.get("country_code") ?? "",
      device_type: (sp.get("device_type") as DashboardFilters["device_type"]) ?? "",
      traffic_source_id: sp.get("traffic_source_id") ? Number(sp.get("traffic_source_id")) : "",
    };
    setFilters(nextFilters);
    setCampaignId(sp.get("campaign_id") ? Number(sp.get("campaign_id")) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ts, list] = await Promise.all([
          api.get<{ data: Array<{ id: number; name: string }> }>("v1/traffic-sources")
            .then((r) => r.data)
            .catch(() => []),
          (async () => {
            const collected: CampaignRow[] = [];
            let page = 1;
            let last = 1;
            do {
              const chunk = await api.get<{ data: CampaignRow[]; last_page: number }>(`v1/campaigns?page=${page}`);
              collected.push(...chunk.data);
              last = chunk.last_page;
              page += 1;
            } while (page <= last);
            return collected;
          })(),
        ]);
        if (!cancelled) {
          setTrafficSources(ts);
          setCampaigns(list);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCampaigns = useMemo(() => {
    if (filters.traffic_source_id === "") return campaigns;
    return campaigns.filter((c) => c.traffic_source_id === filters.traffic_source_id);
  }, [campaigns, filters.traffic_source_id]);

  const query = useMemo(() => {
    if (!campaignId) return "";
    return toQuery({
      campaign_id: campaignId,
      from: filters.from,
      to: filters.to,
      country_code: filters.country_code,
      device_type: filters.device_type,
    });
  }, [campaignId, filters]);

  useEffect(() => {
    if (!campaignId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await api.get<AbResponse>(`v1/reports/ab-tests${query}`);
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) {
          reportApiError(e);
          setError(ApiError.isApiError(e) ? e.message : "Failed to load A/B report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, query]);

  const syncUrl = (nextCampaignId: number | "", nextFilters: DashboardFilters) => {
    router.replace(
      `/ab-tests${toQuery({
        campaign_id: nextCampaignId === "" ? "" : nextCampaignId,
        from: nextFilters.from,
        to: nextFilters.to,
        country_code: nextFilters.country_code,
        device_type: nextFilters.device_type,
        traffic_source_id: nextFilters.traffic_source_id === "" ? "" : nextFilters.traffic_source_id,
      })}`,
    );
  };

  return (
    <AdminShell title="A/B test comparison">
      <div className="flex flex-col gap-4">
        <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="form-field">
              <span className="form-label">Campaign</span>
              <select
                className="form-control w-[28rem] max-w-full"
                value={campaignId}
                onChange={(e) => {
                  const next = e.target.value ? Number(e.target.value) : "";
                  setCampaignId(next);
                  syncUrl(next, filters);
                }}
              >
                <option value="">Select campaign…</option>
                {filteredCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
              {campaignId ? (
                <div className="mt-2">
                  <Link
                    href={`/campaigns/${campaignId}`}
                    className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline"
                  >
                    View campaign details
                  </Link>
                </div>
              ) : null}
            </label>
          </div>
        </section>

        <FiltersBar
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            syncUrl(campaignId, next);
          }}
          trafficSources={trafficSources}
          showTrafficSource
        />

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}

        {!loading && data ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Winner suggestion</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Window: <span className="font-medium text-slate-900">{data.window.from}</span>{" "}
                  → <span className="font-medium text-slate-900">{data.window.to}</span>
                </p>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-900">
                <span className="font-semibold">{data.recommendation.status}</span>
                {data.recommendation.winner_variant_key ? (
                  <span className="ml-2">Winner: {data.recommendation.winner_variant_key}</span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-2 pr-3 font-medium">Variant</th>
                    <th className="py-2 pr-3 font-medium">Clicks</th>
                    <th className="py-2 pr-3 font-medium">Conv</th>
                    <th className="py-2 pr-3 font-medium">Revenue</th>
                    <th className="py-2 pr-3 font-medium">Cost</th>
                    <th className="py-2 pr-3 font-medium">Profit</th>
                    <th className="py-2 pr-3 font-medium">ROI</th>
                    <th className="py-2 pr-3 font-medium">CR</th>
                    <th className="py-2 pr-3 font-medium">EPC</th>
                  </tr>
                </thead>
                <tbody>
                  {data.variants.map((v) => {
                    const isWinner = data.recommendation.winner_variant_key === v.variant_key;
                    return (
                      <tr
                        key={v.variant_key}
                        className={"border-b border-slate-100 " + (isWinner ? "bg-emerald-50" : "")}
                      >
                        <td className="py-2 pr-3 font-medium text-slate-900">
                          {v.variant_key}
                        </td>
                        <td className="py-2 pr-3">{v.clicks.toLocaleString()}</td>
                        <td className="py-2 pr-3">{v.conversions.toLocaleString()}</td>
                        <td className="py-2 pr-3">{money(v.revenue)}</td>
                        <td className="py-2 pr-3">{money(v.cost)}</td>
                        <td className="py-2 pr-3">{money((v.kpi.profit as number) ?? 0)}</td>
                        <td className="py-2 pr-3">
                          {v.kpi.roi == null ? "—" : `${(v.kpi.roi as number).toFixed(2)}%`}
                        </td>
                        <td className="py-2 pr-3">
                          {v.kpi.cr == null ? "—" : `${(v.kpi.cr as number).toFixed(2)}%`}
                        </td>
                        <td className="py-2 pr-3">
                          {v.kpi.epc == null ? "—" : money(v.kpi.epc as number)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}

