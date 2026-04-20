"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin";
import { FiltersBar, KpiCards, defaultFilters, type DashboardFilters, type KpiDelta, type KpiTotals } from "@/components/dashboard";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";
import { toQuery } from "@/lib/query";

type TrafficSource = { id: number; name: string };

type ReportKpiResponse = {
  data: {
    window: { from: string; to: string };
    filters: {
      campaign_id: number | null;
      traffic_source_id: number | null;
      country_code: string | null;
      device_type: string | null;
    };
    current: KpiTotals;
    previous: KpiTotals;
    delta: KpiDelta;
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(() => defaultFilters());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportKpiResponse["data"] | null>(null);

  useEffect(() => {
    // Hydrate from URL params (shareable filters).
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
        const res = await api.get<{ data: TrafficSource[] }>("v1/traffic-sources");
        if (!cancelled) setTrafficSources(res.data);
      } catch {
        // non-fatal; keep filter dropdown empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const query = useMemo(() => {
    return toQuery({
      from: filters.from,
      to: filters.to,
      country_code: filters.country_code,
      device_type: filters.device_type,
      traffic_source_id: filters.traffic_source_id === "" ? "" : filters.traffic_source_id,
    });
  }, [filters]);

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
    router.replace(`/dashboard${toQuery({
      from: next.from,
      to: next.to,
      country_code: next.country_code,
      device_type: next.device_type,
      traffic_source_id: next.traffic_source_id === "" ? "" : next.traffic_source_id,
    })}`);
  };

  return (
    <AdminShell title="Global dashboard">
      <div className="flex flex-col gap-4">
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
            <KpiCards current={report.current} delta={report.delta} />
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}

