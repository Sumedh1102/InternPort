import Link from "next/link";
import { Check, Wallet } from "lucide-react";

import { PaymentReportForm } from "@/components/forms/payment-report-form";
import { DashboardCard, KeyValue, PageHeader } from "@/components/dashboard/ui";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { label } from "@/lib/domain/enums";
import { formatINR } from "@/lib/domain/pricing";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { paymentProvider } from "@/server/payments/provider";
import { getSettings } from "@/server/queries/settings";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Payment status" };

const STEPS = [
  { key: "PAYMENT_PENDING", title: "Payment pending" },
  { key: "PAYMENT_IN_REVIEW", title: "Verification in progress" },
  { key: "PAYMENT_CONFIRMED", title: "Payment confirmed" },
] as const;

export default async function PaymentPage() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  const e = ctx.enrollment;
  const header = (
    <PageHeader
      title="Payment status"
      description="Payments are handled offline and verified manually by the Sainam Technology team — there is no online checkout."
    />
  );
  if (!e) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Wallet />}
          title="Nothing to pay yet"
          description="Payment instructions appear here once your application is approved."
          action={
            <Link href={ctx.application ? "/dashboard" : "/apply"} className={buttonVariants({ size: "sm" })}>
              {ctx.application ? "Track my application" : "Apply now"}
            </Link>
          }
        />
      </>
    );
  }

  const settings = await getSettings();
  const p = e.payment;
  const provider = paymentProvider(p.provider);
  const instructions = provider.instructions(e, settings);
  const stepIndex = p.status === "PAYMENT_REJECTED" ? 1 : STEPS.findIndex((s) => s.key === p.status);
  const canReport =
    e.status === "AWAITING_PAYMENT" && (p.status === "PAYMENT_PENDING" || p.status === "PAYMENT_REJECTED");

  return (
    <>
      {header}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm sm:p-6" aria-label="Verification progress">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold">{e.programName}</h2>
              <StatusBadge status={p.status} />
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {STEPS.map((s, i) => {
                const done = i < stepIndex || p.status === "PAYMENT_CONFIRMED";
                const current = i === stepIndex && p.status !== "PAYMENT_CONFIRMED";
                return (
                  <li
                    key={s.key}
                    aria-current={current ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border-2 p-3 text-sm font-semibold",
                      done ? "border-ink bg-lime" : current ? (p.status === "PAYMENT_REJECTED" ? "border-ink bg-red-soft" : "border-ink bg-amber-soft") : "border-ink/20 bg-cream",
                    )}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink", done ? "bg-ink text-lime" : "bg-paper")}>
                      {done ? <Check className="size-4" aria-hidden /> : i + 1}
                    </span>
                    {s.title}
                  </li>
                );
              })}
            </ol>
            {p.status === "PAYMENT_REJECTED" && (
              <Alert tone="error" title="We couldn't verify your payment" className="mt-4">
                {p.adminNote ?? "Please check your reference number and resubmit, or contact us."}
              </Alert>
            )}
            {p.status === "PAYMENT_IN_REVIEW" && (
              <Alert tone="info" title="Verification in progress" className="mt-4">
                We received your details (reference <span className="font-mono">{p.reference}</span>). You&apos;ll be notified once it&apos;s verified.
              </Alert>
            )}
            {p.status === "PAYMENT_CONFIRMED" && (
              <Alert tone="success" title="Payment verified" className="mt-4">
                {e.status === "ACTIVE" || e.status === "COMPLETED"
                  ? "Your enrollment is active. Happy learning!"
                  : "Your enrollment will be activated as soon as your batch is confirmed."}
              </Alert>
            )}
          </section>

          {e.status === "AWAITING_PAYMENT" && (
            <section className="rounded-card border-2 border-ink bg-lime-soft p-5 sm:p-6">
              <h2 className="font-display text-2xl font-extrabold">{instructions.heading}</h2>
              <p className="mt-2 whitespace-pre-line">{instructions.body}</p>
              {(instructions.payeeName || instructions.upiId || instructions.bankDetails || instructions.supportContact) && (
                <div className="mt-4 rounded-2xl border-2 border-ink bg-paper p-4">
                  <KeyValue
                    items={[
                      ...(instructions.payeeName ? [["Payee", instructions.payeeName] as [string, string]] : []),
                      ...(instructions.upiId ? [["UPI ID", <span key="upi" className="font-mono">{instructions.upiId}</span>] as [string, React.ReactNode]] : []),
                      ...(instructions.bankDetails ? [["Bank details", <span key="bank" className="whitespace-pre-line">{instructions.bankDetails}</span>] as [string, React.ReactNode]] : []),
                      ...(instructions.supportContact ? [["Questions?", instructions.supportContact] as [string, string]] : []),
                    ]}
                  />
                </div>
              )}
              {instructions.qrCode && (
                <figure className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-ink bg-paper p-4 sm:flex-row sm:items-center sm:gap-5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploads are served through /api/files */}
                  <img
                    src={instructions.qrCode.url}
                    alt={
                      instructions.qrCode.amount
                        ? `Payment QR code for ${formatINR(instructions.qrCode.amount)}`
                        : "Payment QR code"
                    }
                    className="size-48 shrink-0 rounded-xl border-2 border-ink bg-white p-1"
                  />
                  <figcaption className="text-center text-sm sm:text-left">
                    <strong className="block font-display text-lg">
                      {instructions.qrCode.amount ? `Scan to pay ${formatINR(instructions.qrCode.amount)}` : "Scan to pay"}
                    </strong>
                    {label(p.pricingTier)} pricing. After paying, submit your transaction reference below.
                  </figcaption>
                </figure>
              )}
              <p className="mt-4 text-sm">
                Amount due: <strong className="font-display text-lg">{formatINR(p.totalAmount)}</strong> ({formatINR(p.monthlyFee)} × {p.months}{" "}
                month{p.months > 1 ? "s" : ""}, {label(p.pricingTier).toLowerCase()} pricing)
              </p>
            </section>
          )}

          {canReport && (
            <section className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm sm:p-6">
              <h2 className="mb-4 font-display text-2xl font-extrabold">Submit your payment details</h2>
              <PaymentReportForm enrollmentId={e.id} resubmit={p.status === "PAYMENT_REJECTED"} />
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <DashboardCard title="Summary" icon={<Wallet />}>
            <KeyValue
              items={[
                ["Pricing", <StatusBadge key="tier" status={p.pricingTier} />],
                ["Monthly fee", formatINR(p.monthlyFee)],
                ["Duration", `${p.months} months`],
                ["Total", <strong key="total">{formatINR(p.totalAmount)}</strong>],
                ["Method", p.method ? label(p.method) : "—"],
                ["Paid on", p.paidOn ? formatDate(p.paidOn) : "—"],
              ]}
            />
          </DashboardCard>
          <DashboardCard title="History">
            {p.history?.length ? (
              <ol className="flex flex-col gap-3">
                {[...p.history].reverse().map((h, i) => (
                  <li key={i} className="border-l-2 border-ink pl-3 text-sm">
                    <StatusBadge status={h.status} />
                    {h.note && <p className="mt-1">{h.note}</p>}
                    <p className="font-mono text-[0.68rem] text-muted">{formatDateTime(h.at)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">No updates yet.</p>
            )}
          </DashboardCard>
        </aside>
      </div>
    </>
  );
}
