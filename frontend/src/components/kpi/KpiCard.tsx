import type { ReactNode } from "react";

export type KpiCardProps = {
  label: string;
  value: ReactNode;
  /** Short supporting text, e.g. period or unit */
  description?: string;
  /** e.g. "+12% vs last week" — string kept for simple reuse */
  delta?: string;
  /** Positive / negative / neutral styling for delta */
  deltaTone?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
};

const deltaToneClass: Record<NonNullable<KpiCardProps["deltaTone"]>, string> = {
  positive: "text-emerald-900",
  negative: "text-rose-900",
  neutral: "text-slate-800",
};

export function KpiCard({
  label,
  value,
  description,
  delta,
  deltaTone = "neutral",
  icon,
}: KpiCardProps) {
  return (
    <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">
            {label}
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
          {description ? (
            <p className="mt-1 text-sm text-slate-700">{description}</p>
          ) : null}
          {delta ? (
            <p className={`mt-2 text-sm font-semibold ${deltaToneClass[deltaTone]}`}>
              {delta}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-900"
            aria-hidden
          >
            {icon}
          </div>
        ) : null}
      </div>
    </section>
  );
}
