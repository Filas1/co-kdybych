"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { brand } from "@/brand.config";
import { formatTick, timeTicks, type ChartRow, type ChartSeries } from "@/lib/chart-data";
import { formatCompact, formatCzk, formatMonth } from "@/lib/format";

interface Props {
  rows: ChartRow[];
  series: ChartSeries[];
  height: number;
  /** Fixed width for the share image; without it the chart fills its container. */
  width?: number;
  /** Tooltip and hover crosshair (off for the static share image). */
  interactive?: boolean;
  fontSize?: number;
  /** Line width in px; the 1080 px share image needs thicker lines to read on a phone. */
  strokeWidth?: number;
}

/**
 * Value over time: one 2px line per asset, the dashed "invested" line, horizontal gridlines only.
 * Animation is off: values change on every keystroke and re-animating each time is distracting.
 */
export function ValueChart({ rows, series, height, width, interactive = true, fontSize = 12, strokeWidth = 2 }: Props) {
  const tick = { fill: brand.colors.muted, fontSize };
  const sizing = width ? { width, height } : { responsive: true, style: { width: "100%", height } };
  // Draw the highest line last, so it sits on top where lines cross.
  const drawOrder = [...series].reverse();

  return (
    <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} {...sizing}>
      <CartesianGrid vertical={false} stroke={brand.colors.chartGrid} />
      <XAxis
        dataKey="month"
        ticks={timeTicks(rows.map((r) => r.month), width ? 6 : 5)}
        interval={0}
        tickFormatter={formatTick}
        tick={tick}
        tickLine={false}
        axisLine={{ stroke: brand.colors.chartAxis }}
      />
      <YAxis
        tickFormatter={formatCompact}
        tick={tick}
        tickLine={false}
        axisLine={false}
        width={fontSize * 5}
        tickCount={5}
      />
      {interactive && (
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: brand.colors.muted, strokeWidth: 1 }}
          content={(props) => <ChartTooltip {...props} rows={rows} series={series} />}
        />
      )}
      {drawOrder.map((s) => (
        <Line
          key={s.key}
          dataKey={s.key}
          name={s.label}
          stroke={s.color}
          strokeWidth={strokeWidth}
          strokeDasharray={s.dashed ? `${strokeWidth * 3} ${strokeWidth * 2}` : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={false}
          activeDot={interactive ? { r: 4, fill: s.color, stroke: brand.colors.bg, strokeWidth: 2 } : false}
          isAnimationActive={false}
        />
      ))}
    </LineChart>
  );
}

function ChartTooltip({
  active,
  label,
  rows,
  series,
}: TooltipContentProps & { rows: ChartRow[]; series: ChartSeries[] }) {
  const row = active ? rows.find((r) => r.month === label) : undefined;
  if (!row) return null;
  const items = series
    .map((s) => ({ ...s, value: row[s.key] }))
    .filter((s): s is ChartSeries & { value: number } => s.value !== undefined)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="min-w-48 rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-muted">{formatMonth(row.month)}</p>
      <ul className="space-y-0.5">
        {items.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <SeriesSwatch color={s.color} dashed={s.dashed} />
              {s.label}
            </span>
            <span className="tabular font-medium">{formatCzk(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small line sample used in the legend and tooltip: solid for assets, dashed for "invested". */
export function SeriesSwatch({ color, dashed }: { color: string; dashed: boolean }) {
  return (
    <svg width="16" height="8" aria-hidden className="shrink-0">
      <line
        x1="1"
        x2="15"
        y1="4"
        y2="4"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
    </svg>
  );
}
