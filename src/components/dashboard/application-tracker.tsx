import Link from "next/link";
import { Check, X } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Application, Enrollment } from "@/lib/domain/types";
import { APPLICATION_JOURNEY, journeyStep } from "@/lib/domain/workflows";
import { cn, formatDate } from "@/lib/utils";

/** Visual Application → Review → Approved → Payment → Enrolled tracker. */
export function ApplicationTracker({
  application,
  enrollment,
}: {
  application: Application;
  enrollment: Enrollment | null;
}) {
  const step = journeyStep(application, enrollment?.payment);
  const rejected = application.status === "REJECTED";
  return (
    <section className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal sm:p-6" aria-label="Application progress">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">Your application</p>
          <h2 className="font-display text-2xl font-extrabold">{application.programName}</h2>
          <p className="text-sm text-muted">Submitted {formatDate(application.createdAt)}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>
      <ol className="mt-6 grid gap-3 sm:grid-cols-5">
        {APPLICATION_JOURNEY.map((s, i) => {
          const done = i < step || (i === step && application.status === "ENROLLED");
          const current = i === step && !done;
          const failed = rejected && i === 1;
          return (
            <li
              key={s.key}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl border-2 p-3 sm:flex-col sm:items-start",
                failed ? "border-ink bg-red-soft" : done ? "border-ink bg-lime" : current ? "border-ink bg-amber-soft" : "border-ink/25 bg-cream",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink font-mono text-xs font-bold",
                  done ? "bg-ink text-lime" : "bg-paper",
                )}
              >
                {failed ? <X className="size-4" aria-hidden /> : done ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className="text-sm font-semibold leading-tight">{s.title}</span>
            </li>
          );
        })}
      </ol>
      {rejected ? (
        <div className="mt-5 rounded-2xl border-2 border-ink bg-red-soft p-4 text-sm">
          <p className="font-semibold">This application was not approved.</p>
          {application.rejectionReason && <p className="mt-1">Reason: {application.rejectionReason}</p>}
          <Link href="/apply" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3")}>
            Apply to another program
          </Link>
        </div>
      ) : application.status === "APPROVED" ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-lime-soft p-4 text-sm">
          <p className="font-semibold">
            {enrollment?.payment.status === "PAYMENT_IN_REVIEW"
              ? "We received your payment details — verification in progress."
              : enrollment?.payment.status === "PAYMENT_CONFIRMED"
                ? "Payment verified! Your enrollment will be activated shortly."
                : "Approved! Complete your payment to activate your enrollment."}
          </p>
          <Link href="/dashboard/payment" className={buttonVariants({ size: "sm", variant: "dark" })}>
            Payment status
          </Link>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">
          Our team reviews every application personally. You&apos;ll get a notification here as soon as there&apos;s an update.
        </p>
      )}
    </section>
  );
}
