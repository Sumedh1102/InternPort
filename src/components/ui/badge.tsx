import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { label } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 truncate rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-semibold leading-5 [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        paper: "bg-paper text-ink",
        cream: "bg-cream-2 text-ink",
        lime: "bg-lime text-ink",
        pink: "bg-pink text-ink",
        cyan: "bg-cyan text-ink",
        blue: "bg-blue text-paper",
        ink: "bg-ink text-paper",
        amber: "bg-amber text-ink",
        red: "bg-red-soft text-ink",
        green: "bg-green-soft text-ink",
        muted: "border-ink/30 bg-cream-2 text-muted",
      },
    },
    defaultVariants: { tone: "paper" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

type Tone = NonNullable<BadgeProps["tone"]>;

const STATUS_TONES: Record<string, Tone> = {
  // generic
  DRAFT: "muted",
  PUBLISHED: "lime",
  PAUSED: "amber",
  ARCHIVED: "muted",
  // application
  PENDING: "amber",
  UNDER_REVIEW: "cyan",
  APPROVED: "lime",
  REJECTED: "red",
  ENROLLED: "ink",
  // payment
  PAYMENT_PENDING: "amber",
  PAYMENT_IN_REVIEW: "cyan",
  PAYMENT_CONFIRMED: "green",
  PAYMENT_REJECTED: "red",
  // enrollment / batch
  AWAITING_PAYMENT: "amber",
  ACTIVE: "lime",
  COMPLETED: "ink",
  SUSPENDED: "red",
  CANCELLED: "muted",
  UPCOMING: "cyan",
  // submissions / projects
  NOT_STARTED: "muted",
  IN_PROGRESS: "cyan",
  SUBMITTED: "blue",
  REVISION_REQUIRED: "pink",
  ASSIGNED: "paper",
  REVIEWED: "cyan",
  EVALUATED: "lime",
  // attendance
  PRESENT: "green",
  ABSENT: "red",
  LATE: "amber",
  EXCUSED: "muted",
  // sessions / certificates
  SCHEDULED: "cyan",
  VALID: "green",
  REVOKED: "red",
  EARLY_BIRD: "pink",
  REGULAR: "paper",
};

/** StatusBadge — one consistent colour language for every workflow status. */
export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return null;
  return (
    <Badge tone={STATUS_TONES[status] ?? "paper"} className={className}>
      {label(status)}
    </Badge>
  );
}
