"use client";

import { useMemo } from "react";

export type DashboardFilters = {
  from: string;
  to: string;
  country_code: string;
  device_type: "" | "desktop" | "mobile" | "tablet";
  traffic_source_id: "" | number;
};

type TrafficSourceOpt = { id: number; name: string };

type FiltersBarProps = {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  trafficSources: TrafficSourceOpt[];
  showTrafficSource?: boolean;
};

function todayYmd(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgoYmd(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function defaultFilters(): DashboardFilters {
  return {
    from: daysAgoYmd(6),
    to: todayYmd(),
    country_code: "",
    device_type: "",
    traffic_source_id: "",
  };
}

export function FiltersBar({
  filters,
  onChange,
  trafficSources,
  showTrafficSource = true,
}: FiltersBarProps) {
  const countryHint = useMemo(() => {
    const v = filters.country_code.trim().toUpperCase();
    if (v.length === 0) return "";
    if (v.length !== 2) return "Use ISO-2 (e.g. US)";
    return "";
  }, [filters.country_code]);

  return (
    <section className="w-full rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="form-field min-w-0">
          <span className="form-label">From</span>
          <input
            type="date"
            className="form-control"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
          />
        </label>
        <label className="form-field min-w-0">
          <span className="form-label">To</span>
          <input
            type="date"
            className="form-control"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
          />
        </label>
        <label className="form-field min-w-0">
          <span className="form-label">Country</span>
          <input
            className="form-control uppercase"
            value={filters.country_code}
            maxLength={2}
            placeholder="US"
            onChange={(e) =>
              onChange({ ...filters, country_code: e.target.value.toUpperCase() })
            }
          />
          {countryHint ? (
            <span className="mt-1 block text-xs text-amber-700">{countryHint}</span>
          ) : null}
        </label>
        <label className="form-field min-w-0">
          <span className="form-label">Device</span>
          <select
            className="form-control"
            value={filters.device_type}
            onChange={(e) =>
              onChange({
                ...filters,
                device_type: e.target.value as DashboardFilters["device_type"],
              })
            }
          >
            <option value="">Any</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
        </label>

        {showTrafficSource ? (
          <label className="form-field min-w-0">
            <span className="form-label">Traffic source</span>
            <select
              className="form-control"
              value={filters.traffic_source_id}
              onChange={(e) =>
                onChange({
                  ...filters,
                  traffic_source_id: e.target.value ? Number(e.target.value) : "",
                })
              }
            >
              <option value="">Any</option>
              {trafficSources.map((ts) => (
                <option key={ts.id} value={ts.id}>
                  {ts.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </section>
  );
}

