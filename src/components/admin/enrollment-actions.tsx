"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings2, Wallet } from "lucide-react";
import type { z } from "zod";

import { applyServerErrors, isoToDate } from "@/components/forms/form-utils";
import { FormDialog } from "@/components/staff/form-dialog";
import type { Option } from "@/components/staff/assignment-form";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { ENROLLMENT_STATUSES, PAYMENT_METHODS, label } from "@/lib/domain/enums";
import { formatINR } from "@/lib/domain/pricing";
import { enrollmentUpdateSchema, paymentUpdateSchema } from "@/lib/domain/schemas";
import type { Enrollment } from "@/lib/domain/types";
import { ENROLLMENT_FLOW, PAYMENT_FLOW } from "@/lib/domain/workflows";
import { formatDate, formatDateTime } from "@/lib/utils";
import { updateEnrollment, updatePayment } from "@/server/actions/payments";

type PaymentValues = z.input<typeof paymentUpdateSchema>;

function PaymentForm({ enrollment, onDone }: { enrollment: Enrollment; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const p = enrollment.payment;
  const next = PAYMENT_FLOW[p.status];
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentUpdateSchema),
    defaultValues: {
      enrollmentId: enrollment.id,
      status: next.includes("PAYMENT_CONFIRMED") ? "PAYMENT_CONFIRMED" : next[0] ?? p.status,
      method: p.method ?? "",
      reference: p.reference ?? "",
      paidOn: isoToDate(p.paidOn) || "",
      totalAmount: p.totalAmount,
      adminNote: "",
      activate: Boolean(enrollment.batchId) && enrollment.status === "AWAITING_PAYMENT",
    },
  });
  const status = form.watch("status");
  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await updatePayment(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved");
      onDone();
      router.refresh();
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 rounded-2xl border-2 border-ink bg-cream p-4 text-sm sm:grid-cols-2">
        <p>
          Current: <StatusBadge status={p.status} />
        </p>
        <p>
          Due: <strong>{formatINR(p.totalAmount)}</strong> ({label(p.pricingTier)})
        </p>
        <p>Student reference: {p.reference ? <span className="font-mono">{p.reference}</span> : "—"}</p>
        <p>Paid on (reported): {p.paidOn ? formatDate(p.paidOn) : "—"}</p>
        {p.studentNote && <p className="sm:col-span-2">Student note: {p.studentNote}</p>}
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pm-status" label="New status" error={form.formState.errors.status?.message} required>
            <Select {...form.register("status")}>
              {next.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="pm-method" label="Method" error={form.formState.errors.method?.message}>
            <Select {...form.register("method")}>
              <option value="">—</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {label(m)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="pm-ref" label="Transaction / reference note" error={form.formState.errors.reference?.message}>
            <Input autoComplete="off" {...form.register("reference")} />
          </Field>
          <Field id="pm-date" label="Payment date" error={form.formState.errors.paidOn?.message}>
            <Input type="date" {...form.register("paidOn")} />
          </Field>
          <Field id="pm-amount" label="Total amount (₹)" error={form.formState.errors.totalAmount?.message}>
            <Input type="number" min={0} {...form.register("totalAmount", { valueAsNumber: true })} />
          </Field>
        </div>
        <Field id="pm-note" label="Admin note" hint="Shown to the student if the payment is rejected." error={form.formState.errors.adminNote?.message}>
          <Textarea rows={2} {...form.register("adminNote")} />
        </Field>
        {status === "PAYMENT_CONFIRMED" && enrollment.status === "AWAITING_PAYMENT" && (
          <label className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-lime-soft p-3 text-sm" htmlFor="pm-activate">
            <Checkbox id="pm-activate" {...form.register("activate")} disabled={!enrollment.batchId} />
            <span>
              <strong>Activate enrollment now</strong>
              <br />
              {enrollment.batchId ? `Starts access to ${enrollment.batchName}.` : "Assign a batch first to activate."}
            </span>
          </label>
        )}
        <Button type="submit" loading={form.formState.isSubmitting} className="self-start">
          Update payment
        </Button>
      </form>
      {p.history?.length > 0 && (
        <div>
          <p className="mb-2 font-semibold">History</p>
          <ol className="flex flex-col gap-2">
            {[...p.history].reverse().map((h, i) => (
              <li key={i} className="border-l-2 border-ink pl-3 text-xs">
                <StatusBadge status={h.status} /> <span className="text-muted">{formatDateTime(h.at)} · {h.byName}</span>
                {h.note && <p className="mt-0.5">{h.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function PaymentDialog({ enrollment }: { enrollment: Enrollment }) {
  const needsAttention = enrollment.payment.status === "PAYMENT_IN_REVIEW";
  return (
    <FormDialog
      wide
      title={`Payment · ${enrollment.studentName}`}
      description={enrollment.programName}
      trigger={
        <Button size="sm" variant={needsAttention ? "primary" : "outline"}>
          <Wallet aria-hidden /> {needsAttention ? "Verify" : "Payment"}
        </Button>
      }
    >
      {(close) => <PaymentForm enrollment={enrollment} onDone={close} />}
    </FormDialog>
  );
}

type EnrollmentValues = z.input<typeof enrollmentUpdateSchema>;

function EnrollmentForm({
  enrollment,
  batches,
  mentors,
  onDone,
}: {
  enrollment: Enrollment;
  batches: Option[];
  mentors: Option[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentUpdateSchema),
    defaultValues: {
      enrollmentId: enrollment.id,
      status: enrollment.status,
      batchId: enrollment.batchId ?? "",
      mentorId: enrollment.mentorId ?? "",
    },
  });
  const statuses = [enrollment.status, ...ENROLLMENT_FLOW[enrollment.status].filter((s) => !(s === "ACTIVE" && enrollment.status === "AWAITING_PAYMENT"))];
  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await updateEnrollment(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved");
      onDone();
      router.refresh();
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <Field id="en-status" label="Enrollment status">
        <Select {...form.register("status")}>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="en-batch" label="Batch">
        <Select {...form.register("batchId")}>
          <option value="">None</option>
          {batches
            .filter((b) => b.programId === enrollment.programId)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field id="en-mentor" label="Mentor">
        <Select {...form.register("mentorId")}>
          <option value="">None</option>
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" loading={form.formState.isSubmitting} className="self-start">
        Save
      </Button>
    </form>
  );
}

export function EnrollmentDialog(props: { enrollment: Enrollment; batches: Option[]; mentors: Option[] }) {
  return (
    <FormDialog
      title={`Enrollment · ${props.enrollment.studentName}`}
      description={props.enrollment.programName}
      trigger={
        <Button size="icon-sm" variant="ghost" aria-label={`Manage enrollment for ${props.enrollment.studentName}`}>
          <Settings2 aria-hidden />
        </Button>
      }
    >
      {(close) => <EnrollmentForm {...props} onDone={close} />}
    </FormDialog>
  );
}
