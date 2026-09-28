import * as React from "react";
import { AlertTriangle, CircleCheck, Info, OctagonX } from "lucide-react";

import { cn, initials } from "@/lib/utils";

/* ------------------------------ Progress ------------------------------ */

export function Progress({
  value,
  label,
  tone = "lime",
  className,
  size = "md",
}: {
  value: number;
  label?: string;
  tone?: "lime" | "pink" | "cyan" | "blue";
  className?: string;
  size?: "sm" | "md";
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const fill = { lime: "bg-lime", pink: "bg-pink", cyan: "bg-cyan", blue: "bg-blue" }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cn(
        "relative w-full overflow-hidden rounded-full border-2 border-ink bg-paper",
        size === "sm" ? "h-3" : "h-5",
        className,
      )}
    >
      <div
        className={cn("h-full border-r-2 border-ink transition-[width] duration-700", fill, v === 0 && "border-r-0")}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/* ------------------------------ Skeleton ------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-2xl bg-ink/10", className)} />;
}

/* ----------------------------- Empty state ---------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-ink/40 bg-paper/60 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="grid size-14 place-items-center rounded-2xl border-2 border-ink bg-lime shadow-brutal-xs [&_svg]:size-6">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-extrabold">{title}</h3>
      {description && <div className="max-w-md text-sm text-muted">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* -------------------------------- Alert ------------------------------- */

const ALERT = {
  info: { icon: Info, cls: "bg-cyan-soft" },
  success: { icon: CircleCheck, cls: "bg-lime-soft" },
  warning: { icon: AlertTriangle, cls: "bg-amber-soft" },
  error: { icon: OctagonX, cls: "bg-red-soft" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: keyof typeof ALERT;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const { icon: Icon, cls } = ALERT[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex flex-col gap-3 rounded-2xl border-2 border-ink p-4 sm:flex-row sm:items-start", cls, className)}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-1", "text-ink-2")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------- Avatar ------------------------------- */

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-ink bg-pink font-display font-extrabold text-ink",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden={!src}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploads are served through /api/files
        <img src={src} alt={name ? `${name}'s photo` : ""} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/* ----------------------------- Stat number ---------------------------- */

export function Stat({
  label,
  value,
  hint,
  tone = "paper",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "paper" | "lime" | "pink" | "cyan" | "ink";
  icon?: React.ReactNode;
}) {
  const tones = {
    paper: "bg-paper",
    lime: "bg-lime",
    pink: "bg-pink",
    cyan: "bg-cyan",
    ink: "bg-ink text-paper",
  };
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 rounded-card border-2 border-ink p-4 shadow-brutal-sm", tones[tone])}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[0.7rem] font-semibold uppercase tracking-wider opacity-80">
          {label}
        </span>
        {icon && <span className="[&_svg]:size-4">{icon}</span>}
      </div>
      <span className="font-display text-3xl font-extrabold leading-none">{value}</span>
      {hint && <span className="text-xs opacity-80">{hint}</span>}
    </div>
  );
}
