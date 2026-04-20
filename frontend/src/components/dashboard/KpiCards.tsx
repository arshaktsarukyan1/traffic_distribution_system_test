"use client";

import { deltaLabel, fmtMaybe, fmtMoney, fmtNum, fmtRate } from "@/lib/kpi-format";

export type KpiTotals = {
  visits: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  ctr: number | null;
  cr: number | null;
  roi: number | null;
  cpa: number | null;
  epc: number | null;
};

export type KpiDelta = Record<
  keyof KpiTotals,
  { abs: number | null; pct: number | null }
>;

type CardProps = {
  label: string;
  value: string;
  delta: string;
  tone?: "good" | "bad" | "neutral";
};

function Card({ label, value, delta, tone = "neutral" }: CardProps) {
  const toneClass =
    tone === "good"
      ? "text-emerald-900"
      : tone === "bad"
        ? "text-rose-900"
        : "text-slate-800";
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold uppercase tracking-wide text-slate-700">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
      <div className={"mt-1 text-sm font-semibold " + toneClass}>{delta}</div>
    </div>
  );
}

type KpiCardsProps = {
  current: KpiTotals;
  delta: KpiDelta;
};

export function KpiCards({ current, delta }: KpiCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        label="Visits"
        value={fmtNum(current.visits)}
        delta={deltaLabel(delta.visits.abs, delta.visits.pct, "num")}
      />
      <Card
        label="Clicks"
        value={fmtNum(current.clicks)}
        delta={deltaLabel(delta.clicks.abs, delta.clicks.pct, "num")}
      />
      <Card
        label="Conversions"
        value={fmtNum(current.conversions)}
        delta={deltaLabel(delta.conversions.abs, delta.conversions.pct, "num")}
      />
      <Card
        label="Revenue"
        value={fmtMoney(current.revenue)}
        delta={deltaLabel(delta.revenue.abs, delta.revenue.pct, "money")}
        tone={(delta.revenue.abs ?? 0) >= 0 ? "good" : "bad"}
      />
      <Card
        label="Cost"
        value={fmtMoney(current.cost)}
        delta={deltaLabel(delta.cost.abs, delta.cost.pct, "money")}
        tone={(delta.cost.abs ?? 0) <= 0 ? "good" : "bad"}
      />
      <Card
        label="Profit"
        value={fmtMoney(current.profit)}
        delta={deltaLabel(delta.profit.abs, delta.profit.pct, "money")}
        tone={(delta.profit.abs ?? 0) >= 0 ? "good" : "bad"}
      />
      <Card
        label="ROI"
        value={fmtRate(current.roi)}
        delta={deltaLabel(delta.roi.abs, delta.roi.pct, "pct")}
        tone={(current.roi ?? 0) >= 0 ? "good" : "bad"}
      />
      <Card
        label="CTR"
        value={fmtRate(current.ctr)}
        delta={deltaLabel(delta.ctr.abs, delta.ctr.pct, "pct")}
      />
      <Card
        label="CR"
        value={fmtRate(current.cr)}
        delta={deltaLabel(delta.cr.abs, delta.cr.pct, "pct")}
      />
      <Card
        label="CPA"
        value={fmtMaybe(current.cpa, "money")}
        delta={deltaLabel(delta.cpa.abs, delta.cpa.pct, "money")}
        tone={(delta.cpa.abs ?? 0) <= 0 ? "good" : "bad"}
      />
      <Card
        label="EPC"
        value={fmtMaybe(current.epc, "money")}
        delta={deltaLabel(delta.epc.abs, delta.epc.pct, "money")}
      />
    </section>
  );
}
