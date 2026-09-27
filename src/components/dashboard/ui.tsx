import * as React from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpRight, ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  back,
  kicker,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  kicker?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
            <ChevronLeft className="size-4" aria-hidden /> {back.label}
          </Link>
        )}
        {kicker && <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted">{kicker}</p>}
        <h1 className="font-display-wide text-3xl leading-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** DashboardCard — titled panel with an optional "view all" link. */
export function DashboardCard({
  title,
  icon,
  href,
  hrefLabel = "View all",
  children,
  className,
  tone = "paper",
  action,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "paper" | "lime" | "ink" | "pink-soft" | "cyan-soft";
  action?: React.ReactNode;
}) {
  const tones = {
    paper: "bg-paper",
    lime: "bg-lime",
    ink: "bg-ink text-paper",
    "pink-soft": "bg-pink-soft",
    "cyan-soft": "bg-cyan-soft",
  };
  return (
    <section className={cn("flex min-w-0 flex-col rounded-card border-2 border-ink shadow-brutal-sm", tones[tone], className)}>
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink/15 px-5 py-3.5">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold">
          {icon && <span className="shrink-0 [&_svg]:size-5">{icon}</span>}
          <span className="truncate">{title}</span>
        </h2>
        {action}
        {href && !action && (
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold underline decoration-2 underline-offset-4">
            {hrefLabel} <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

/** ProgressCard — ring + label for a single percentage. */
export function ProgressRing({
  value,
  size = 112,
  label,
  sublabel,
  tone = "lime",
}: {
  value: number;
  size?: number;
  label?: string;
  sublabel?: string;
  tone?: "lime" | "pink" | "cyan";
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = 42;
  const c = 2 * Math.PI * r;
  const color = { lime: "var(--color-lime)", pink: "var(--color-pink)", cyan: "var(--color-cyan)" }[tone];
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label ?? "Progress"} ${v}%`}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="10" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-cream-2)" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={`${(v / 100) * c} ${c}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-2xl font-extrabold">{v}%</span>
      </div>
      {(label || sublabel) && (
        <div>
          {label && <p className="font-display text-lg font-extrabold leading-tight">{label}</p>}
          {sublabel && <p className="text-sm text-muted">{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

export function ProgressCard({
  title,
  value,
  detail,
  tone = "lime",
}: {
  title: string;
  value: number;
  detail?: string;
  tone?: "lime" | "pink" | "cyan";
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const fill = { lime: "bg-lime", pink: "bg-pink", cyan: "bg-cyan" }[tone];
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-ink bg-paper p-4 text-ink">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="font-display text-xl font-extrabold">{v}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-cream-2" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={title}>
        <div className={cn("h-full", fill)} style={{ width: `${v}%` }} />
      </div>
      {detail && <span className="text-xs text-muted">{detail}</span>}
    </div>
  );
}

/** Safe markdown (no raw HTML) for lessons, assignments and announcements. */
export function MarkdownContent({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-brutal", className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {c}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

export function KeyValue({ items }: { items: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-wider text-muted">{k}</dt>
          <dd className="break-words font-medium">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Locked({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-ink/40 bg-paper/70 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border-2 border-ink bg-cream-2 text-2xl" aria-hidden>
        🔒
      </span>
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      <div className="max-w-md text-sm text-muted">{children}</div>
    </div>
  );
}
