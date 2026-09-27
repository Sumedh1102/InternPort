"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldAlert } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { PAYMENT_METHODS, label } from "@/lib/domain/enums";
import { looksLikeCardNumber, paymentReportSchema } from "@/lib/domain/schemas";
import { reportPayment } from "@/server/actions/payments";
import { applyServerErrors } from "./form-utils";

type Values = z.input<typeof paymentReportSchema>;

/** Lets a student tell the team they've paid offline. No card/bank credentials are ever collected. */
export function PaymentReportForm({ enrollmentId, resubmit }: { enrollmentId: string; resubmit?: boolean }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(paymentReportSchema),
    defaultValues: { enrollmentId, method: "UPI", reference: "", paidOn: new Date().toISOString().slice(0, 10), note: "" },
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const reference = watch("reference");
  const cardWarning = looksLikeCardNumber(reference ?? "");

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await reportPayment(values);
    if (result.ok) {
      toast.success(result.message ?? "Sent for verification");
      router.refresh();
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <div className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-amber-soft p-3 text-sm">
        <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          Only enter the <strong>transaction / UTR reference</strong>. Never share card numbers, CVV, OTPs, UPI PINs or
          banking passwords — Sainam Technology will never ask for them.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="pay-method" label="Payment method" error={errors.method?.message} required>
          <Select {...register("method")}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {label(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="pay-ref"
          label="Transaction reference"
          error={errors.reference?.message ?? (cardWarning ? "That looks like a card number — don't enter card details." : undefined)}
          required
        >
          <Input autoComplete="off" placeholder="e.g. UTR / receipt no." {...register("reference")} />
        </Field>
        <Field id="pay-date" label="Paid on" error={errors.paidOn?.message} required>
          <Input type="date" max={new Date().toISOString().slice(0, 10)} {...register("paidOn")} />
        </Field>
      </div>
      <Field id="pay-note" label="Note for the team" hint="Optional — e.g. who paid, or anything we should know." error={errors.note?.message}>
        <Textarea rows={2} {...register("note")} />
      </Field>
      <Button type="submit" loading={isSubmitting} disabled={cardWarning} className="self-start">
        {resubmit ? "Resubmit for verification" : "I've paid — verify my payment"}
      </Button>
    </form>
  );
}
