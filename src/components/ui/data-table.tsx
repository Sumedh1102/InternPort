"use client";

import * as React from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "./feedback";

export interface DataTableColumn {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  /** Hide below the md breakpoint to keep small screens readable. */
  hideOnMobile?: boolean;
}

export interface DataTableRow {
  id: string;
  cells: Record<string, React.ReactNode>;
  sort?: Record<string, string | number | null | undefined>;
  search?: string;
  filters?: Record<string, string>;
}

export interface DataTableFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  filters?: DataTableFilter[];
  caption: string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  pageSize?: number;
  initialFilters?: Record<string, string>;
  toolbar?: React.ReactNode;
}

/**
 * DataTable — server components pass pre-rendered cells plus plain sort/search/filter
 * values, so tables stay RSC-friendly while search, filters, sorting and paging run here.
 */
export function DataTable({
  columns,
  rows,
  filters = [],
  caption,
  searchPlaceholder = "Search…",
  emptyTitle = "Nothing here yet",
  emptyDescription,
  pageSize = 25,
  initialFilters = {},
  toolbar,
}: DataTableProps) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<Record<string, string>>(initialFilters);
  const [sort, setSort] = React.useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = React.useState(0);
  const searchId = React.useId();

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (q && !(row.search ?? "").toLowerCase().includes(q)) return false;
      return Object.entries(active).every(([k, v]) => !v || row.filters?.[k] === v);
    });
    if (sort) {
      list = [...list].sort((a, b) => {
        const av = a.sort?.[sort.key] ?? "";
        const bv = b.sort?.[sort.key] ?? "";
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
        return String(av).localeCompare(String(bv)) * sort.dir;
      });
    }
    return list;
  }, [rows, query, active, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <label htmlFor={searchId} className="sr-only">
            Search {caption}
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-full border-2 border-ink bg-paper pl-10 pr-4 text-sm shadow-brutal-xs outline-none focus-visible:shadow-brutal-sm"
          />
        </div>
        {filters.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm">
            <span className="shrink-0 font-semibold">{f.label}</span>
            <select
              value={active[f.key] ?? ""}
              onChange={(e) => {
                setActive((a) => ({ ...a, [f.key]: e.target.value }));
                setPage(0);
              }}
              className="h-10 min-w-0 flex-1 rounded-full border-2 border-ink bg-paper px-3 text-sm shadow-brutal-xs lg:flex-none"
            >
              <option value="">All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {toolbar && <div className="flex flex-wrap gap-2 lg:ml-auto">{toolbar}</div>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={rows.length ? "No matches" : emptyTitle} description={rows.length ? "Try a different search or filter." : emptyDescription} />
      ) : (
        <div className="overflow-hidden rounded-card border-2 border-ink bg-paper shadow-brutal-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="bg-ink text-paper">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={
                        sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined
                      }
                      className={cn(
                        "whitespace-nowrap px-4 py-3 font-mono text-[0.7rem] font-semibold uppercase tracking-wider",
                        c.hideOnMobile && "hidden md:table-cell",
                        c.className,
                      )}
                    >
                      {c.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className="inline-flex items-center gap-1.5 uppercase hover:text-lime"
                        >
                          {c.header}
                          <ArrowDownUp className="size-3.5" aria-hidden />
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-t-2 border-ink/10 transition hover:bg-lime-soft/60">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn("px-4 py-3 align-middle", c.hideOnMobile && "hidden md:table-cell", c.className)}
                      >
                        {row.cells[c.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t-2 border-ink px-4 py-2.5 text-xs">
            <span className="font-mono">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={current === 0}
                  aria-label="Previous page"
                  className="grid size-8 place-items-center rounded-full border-2 border-ink bg-paper disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="font-mono">
                  {current + 1} / {pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={current >= pages - 1}
                  aria-label="Next page"
                  className="grid size-8 place-items-center rounded-full border-2 border-ink bg-paper disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
