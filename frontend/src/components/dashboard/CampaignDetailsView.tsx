"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FiltersBar, defaultFilters, type DashboardFilters } from "@/components/dashboard/FiltersBar";
import { KpiCards, type KpiDelta, type KpiTotals } from "@/components/dashboard/KpiCards";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";
import { toQuery } from "@/lib/query";

type Campaign = { id: number; name: string; slug: string; status: string; traffic_source_id: number };
type TrafficSource = { id: number; name: string };

type ReportKpiResponse = {
  data: {
    window: { from: string; to: string };
    current: KpiTotals;
    previous: KpiTotals;
    delta: KpiDelta;
  };
};

export function CampaignDetailsView({ campaignId }: { campaignId: number }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(() => defaultFilters());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportKpiResponse["data"] | null>(null);

  useEffect(() => {
    const next: DashboardFilters = {
      ...defaultFilters(),
      from: sp.get("from") ?? defaultFilters().from,
      to: sp.get("to") ?? defaultFilters().to,
      country_code: sp.get("country_code") ?? "",
      device_type: (sp.get("device_type") as DashboardFilters["device_type"]) ?? "",
      traffic_source_id: sp.get("traffic_source_id")
        ? Number(sp.get("traffic_source_id"))
        : "",
    };
    setFilters(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ts, camp] = await Promise.all([
          api.get<{ data: TrafficSource[] }>("v1/traffic-sources").then((r) => r.data).catch(() => [] as TrafficSource[]),
          api.get<{ data: Campaign }>(`v1/campaigns/${campaignId}`).then((r) => r.data),
        ]);
        if (!cancelled) {
          setTrafficSources(ts);
          setCampaign(camp);
        }
      } catch (e) {
        if (!cancelled) {
          reportApiError(e);
          setError(ApiError.isApiError(e) ? e.message : "Failed to load campaign");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const query = useMemo(() => {
    return toQuery({
      from: filters.from,
      to: filters.to,
      country_code: filters.country_code,
      device_type: filters.device_type,
      traffic_source_id: filters.traffic_source_id === "" ? "" : filters.traffic_source_id,
      campaign_id: campaignId,
    });
  }, [filters, campaignId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await api.get<ReportKpiResponse>(`v1/reports/kpi${query}`);
        if (!cancelled) setReport(res.data);
      } catch (e) {
        if (!cancelled) {
          reportApiError(e);
          setError(ApiError.isApiError(e) ? e.message : "Failed to load KPI report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const onFiltersChange = (next: DashboardFilters) => {
    setFilters(next);
    router.replace(
      `/campaigns/${campaignId}${toQuery({
        from: next.from,
        to: next.to,
        country_code: next.country_code,
        device_type: next.device_type,
        traffic_source_id: next.traffic_source_id === "" ? "" : next.traffic_source_id,
      })}`,
    );
  };

  return (
    <AdminShell
      title={campaign ? `Campaign · ${campaign.name}` : `Campaign · #${campaignId}`}
      topbarRight={
        <div className="flex items-center gap-2">
          <Link
            href={`/campaigns/${campaignId}/edit`}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Edit
          </Link>
          <Link
            href={`/conversions/manual${toQuery({ campaign_id: campaignId })}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Manual conversion
          </Link>
          <Link
            href={`/ab-tests${toQuery({ campaign_id: campaignId })}`}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            A/B compare
          </Link>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {campaign ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</div>
                <div className="mt-1 font-mono text-sm text-slate-900">{campaign.slug}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{campaign.status}</div>
              </div>
            </div>
          </section>
        ) : null}

        <FiltersBar
          filters={filters}
          onChange={onFiltersChange}
          trafficSources={trafficSources}
          showTrafficSource
        />

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <p className="text-sm text-slate-600">Loading KPIs…</p> : null}

        {!loading && report ? (
          <>
            <p className="text-sm text-slate-600">
              Window: <span className="font-medium text-slate-900">{report.window.from}</span> →{" "}
              <span className="font-medium text-slate-900">{report.window.to}</span> (delta vs previous window)
            </p>
            <KpiCards current={report.current} delta={report.delta} />
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}

