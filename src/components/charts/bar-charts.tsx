import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Server-rendered, dependency-free charts for the admin analytics page.
 *
 * Every chart here is a single-series magnitude comparison, so (per the dataviz method):
 * - one sequential hue (brand blue, validated ≥3:1 against the card surface), no legend;
 * - bars ≤24px thick, 4px rounded data-end, square at the baseline, 2px gaps;
 * - value at the bar tip in text ink (never in the data colour);
 * - native tooltips on each mark, and a "View as table" fallback for every chart.
 */

export interface Datum {
  label: string;
  value: number;
  /** Optional formatted value (e.g. "72%"). */
  display?: string;
  /** Optional muted sub-label (e.g. "12 of 40"). */
  hint?: string;
}

function ChartFrame({
  title,
  description,
  data,
  valueHeader,
  children,
  className,
}: {
  title: string;
  description?: string;
  data: Datum[];
  valueHeader: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id = `chart-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <figure className={cn("flex min-w-0 flex-col rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm", className)} aria-labelledby={`${id}-t`}>
      <figcaption className="mb-4">
        <p id={`${id}-t`} className="font-display text-lg font-extrabold">
          {title}
        </p>
        {description && <p className="text-sm text-muted">{description}</p>}
      </figcaption>
      <div className="flex-1">{children}</div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold underline decoration-2 underline-offset-4">View as table</summary>
        <table className="mt-2 w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-1 pr-3 font-semibold">
                Category
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                {valueHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-ink/10">
                <td className="py-1 pr-3">{d.label}</td>
                <td className="py-1 text-right font-mono tabular-nums">
                  {d.display ?? d.value.toLocaleString("en-IN")}
                  {d.hint ? ` (${d.hint})` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal bars — best for long category names (programs, statuses, batches). */
export function BarList({
  title,
  description,
  data,
  max,
  valueHeader = "Count",
  emptyText = "No data yet.",
  className,
}: {
  title: string;
  description?: string;
  data: Datum[];
  /** Fixed scale maximum (e.g. 100 for percentages). Defaults to the largest value. */
  max?: number;
  valueHeader?: string;
  emptyText?: string;
  className?: string;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <ChartFrame title={title} description={description} data={data} valueHeader={valueHeader} className={className}>
      {data.length === 0 || data.every((d) => d.value === 0) ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2.5" aria-hidden>
          {data.map((d) => {
            const pct = Math.max(0, Math.min(100, (d.value / top) * 100));
            const text = d.display ?? d.value.toLocaleString("en-IN");
            return (
              <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
                <span className="truncate text-sm" title={d.label}>
                  {d.label}
                </span>
                <span className="flex min-w-0 items-center gap-2" title={`${d.label}: ${text}${d.hint ? ` (${d.hint})` : ""}`}>
                  <span className="relative h-5 min-w-0 flex-1 border-l border-ink/25">
                    <span
                      className="absolute inset-y-0 left-0 rounded-r-[4px] bg-blue"
                      style={{ width: `${pct}%`, minWidth: d.value > 0 ? 3 : 0 }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">{text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ChartFrame>
  );
}

/** Vertical columns over time (e.g. applications per week). */
export function ColumnChart({
  title,
  description,
  data,
  valueHeader = "Count",
  className,
}: {
  title: string;
  description?: string;
  data: Datum[];
  valueHeader?: string;
  className?: string;
}) {
  const top = Math.max(1, ...data.map((d) => d.value));
  // Clean tick values for the recessive gridlines.
  const step = Math.max(1, Math.ceil(top / 4));
  const ticks = [0, step, step * 2, step * 3, step * 4];
  const scaleMax = ticks[ticks.length - 1]!;
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);
  return (
    <ChartFrame title={title} description={description} data={data} valueHeader={valueHeader} className={className}>
      <div className="relative flex h-52 gap-2" aria-hidden>
        <div className="flex flex-col-reverse justify-between pb-6 text-right font-mono text-[0.65rem] text-muted">
          {ticks.map((t) => (
            <span key={t} className="leading-none">
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col-reverse justify-between">
            {ticks.map((t) => (
              <span key={t} className="h-px w-full bg-ink/10" />
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end justify-around gap-[2px]">
            {data.map((d, i) => (
              <div key={d.label} className="relative flex h-full flex-1 items-end justify-center" title={`${d.label}: ${d.display ?? d.value}`}>
                <div
                  className="w-full max-w-6 rounded-t-[4px] bg-blue"
                  style={{ height: `${(d.value / scaleMax) * 100}%`, minHeight: d.value > 0 ? 3 : 0 }}
                />
                {i === peak && d.value > 0 && (
                  <span className="absolute -translate-y-1 font-mono text-xs font-semibold" style={{ bottom: `${(d.value / scaleMax) * 100}%` }}>
                    {d.display ?? d.value}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-5 justify-around gap-[2px] border-t border-ink/25">
            {data.map((d, i) => (
              <span key={d.label} className={cn("flex-1 truncate pt-1 text-center font-mono text-[0.6rem] text-muted", i % 2 === 1 && "max-sm:invisible")}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}
