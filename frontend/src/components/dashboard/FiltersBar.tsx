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
  countries?: string[];
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
  countries = [],
  showTrafficSource = true,
}: FiltersBarProps) {
  const fallbackCountryCodes = [
    "US",
    "GB",
    "DE",
    "FR",
    "IT",
    "ES",
    "CA",
    "AU",
    "BR",
    "MX",
    "IN",
    "JP",
    "KR",
    "SG",
    "AE",
  ];

  const countryOptions = useMemo(() => {
    const sourceCodes = countries.length > 0 ? countries : fallbackCountryCodes;
    const displayNames =
      typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined"
        ? new Intl.DisplayNames(["en"], { type: "region" })
        : null;

    return sourceCodes.map((code) => ({
      code,
      label: `${displayNames?.of(code) ?? code} (${code})`,
    }));
  }, [countries]);

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
          <select
            className="form-control"
            value={filters.country_code}
            onChange={(e) =>
              onChange({ ...filters, country_code: e.target.value.toUpperCase() })
            }
          >
            <option value="">Any</option>
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
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

