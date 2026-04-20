"use client";

import { useId } from "react";

type Point = { label: string; value: number };

export type TrendChartProps = {
  title: string;
  /** Short description for screen readers and caption */
  description?: string;
  data: Point[];
  /** 0–100 height of chart area in CSS pixels (viewBox) */
  height?: number;
};

/**
 * Lightweight SVG trend chart — no extra dependencies, WCAG-friendly baseline.
 */
export function TrendChart({
  title,
  description,
  data,
  height = 120,
}: TrendChartProps) {
  const titleId = useId();
  const descId = useId();

  if (data.length === 0) {
    return (
      <figure className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
        <figcaption className="text-base font-semibold text-slate-950">{title}</figcaption>
        <p className="mt-2 text-base text-slate-700">No data for this range.</p>
      </figure>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const width = Math.max(data.length * 48, 280);
  const pad = 8;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;

  const points = data
    .map((d, i) => {
      const x = pad + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
      const y = pad + chartH - ((d.value - min) / span) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  const descText = description ?? `${title}: trend across ${data.length} points.`;

  return (
    <figure className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <figcaption className="text-base font-semibold text-slate-950">{title}</figcaption>
      {description ? (
        <p className="mt-1 text-sm text-slate-700">{description}</p>
      ) : null}
      <div className="mt-3 overflow-x-auto">
        <svg
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="text-blue-800"
        >
          <title id={titleId}>{title}</title>
          <desc id={descId}>{descText}</desc>
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="#f0f6ff"
            stroke="#bfdbfe"
            rx={6}
          />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
          {data.map((d, i) => {
            const x = pad + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
            const y = pad + chartH - ((d.value - min) / span) * chartH;
            return (
              <circle
                key={d.label}
                cx={x}
                cy={y}
                r={3.5}
                fill="#1e40af"
                stroke="#fff"
                strokeWidth={1.5}
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-800">
        {data.map((d) => (
          <li key={d.label}>
            <span className="font-semibold text-slate-950">{d.label}</span>
            {": "}
            <span className="tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
