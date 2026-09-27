"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Shuffle, StickyNote, XCircle } from "lucide-react";
import type { z } from "zod";

import { applyServerErrors } from "@/components/forms/form-utils";
import { FormDialog } from "@/components/staff/form-dialog";
import type { Option } from "@/components/staff/assignment-form";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { label } from "@/lib/domain/enums";
import {
  applicationNoteSchema,
  approveApplicationSchema,
  assignApplicationSchema,
  rejectApplicationSchema,
} from "@/lib/domain/schemas";
import type { ActionResult, Application } from "@/lib/domain/types";
import {
  addApplicationNote,
  approveApplication,
  assignApplication,
  rejectApplication,
  setApplicationStatus,
} from "@/server/actions/applications";

function useSubmit<T>(fn: (values: T) => Promise<ActionResult<unknown>>, onDone?: () => void) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const submit = async (values: T, form?: Parameters<typeof applyServerErrors>[0]) => {
    setError(null);
    const result = await fn(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved");
      onDone?.();
      router.refresh();
    } else {
      setError(result.error);
      if (form) applyServerErrors(form, result);
    }
  };
  return { error, submit };
}

/* -------------------------------- Approve ------------------------------- */

type ApproveValues = z.input<typeof approveApplicationSchema>;

function ApproveForm({
  application,
  batches,
  mentors,
  earlyBirdRemaining,
  onDone,
}: {
  application: Application;
  batches: Option[];
  mentors: Option[];
  earlyBirdRemaining: number;
  onDone: () => void;
}) {
  const form = useForm<ApproveValues>({
    resolver: zodResolver(approveApplicationSchema),
    defaultValues: {
      applicationId: application.id,
      pricingTier: "AUTO",
      batchId: application.assignedBatchId ?? "",
      mentorId: application.assignedMentorId ?? "",
      note: "",
    },
  });
  const { error, submit } = useSubmit(approveApplication, onDone);
  const programBatches = batches.filter((b) => b.programId === application.programId);
  return (
    <form onSubmit={form.handleSubmit((v) => submit(v, form))} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <p className="text-sm">
        Approving creates an enrollment in <strong>Awaiting payment</strong> and shows the student payment instructions.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ap-tier" label="Pricing tier" hint={`${earlyBirdRemaining} early-bird seats remaining`} error={form.formState.errors.pricingTier?.message}>
          <Select {...form.register("pricingTier")}>
            <option value="AUTO">Automatic (early bird while seats remain)</option>
            <option value="EARLY_BIRD">Early bird</option>
            <option value="REGULAR">Regular</option>
          </Select>
        </Field>
        <Field id="ap-batch" label="Batch" hint="Required before activation" error={form.formState.errors.batchId?.message}>
          <Select {...form.register("batchId")}>
            <option value="">Assign later</option>
            {programBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ap-mentor" label="Mentor" error={form.formState.errors.mentorId?.message}>
          <Select {...form.register("mentorId")}>
            <option value="">Assign later</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="ap-note" label="Internal note" error={form.formState.errors.note?.message}>
        <Textarea rows={2} {...form.register("note")} />
      </Field>
      <Button type="submit" loading={form.formState.isSubmitting} className="self-start">
        <CheckCircle2 aria-hidden /> Approve application
      </Button>
    </form>
  );
}

export function ApproveDialog(props: {
  application: Application;
  batches: Option[];
  mentors: Option[];
  earlyBirdRemaining: number;
}) {
  return (
    <FormDialog
      title={`Approve ${props.application.fullName}`}
      description={props.application.programName}
      trigger={
        <Button size="sm">
          <CheckCircle2 aria-hidden /> Approve
        </Button>
      }
    >
      {(close) => <ApproveForm {...props} onDone={close} />}
    </FormDialog>
  );
}

/* --------------------------------- Reject ------------------------------- */

function RejectForm({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  const form = useForm<z.input<typeof rejectApplicationSchema>>({
    resolver: zodResolver(rejectApplicationSchema),
    defaultValues: { applicationId, reason: "" },
  });
  const { error, submit } = useSubmit(rejectApplication, onDone);
  return (
    <form onSubmit={form.handleSubmit((v) => submit(v, form))} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <Field id="rj-reason" label="Reason (shared with the student)" error={form.formState.errors.reason?.message} required>
        <Textarea rows={3} {...form.register("reason")} />
      </Field>
      <Button type="submit" variant="danger" loading={form.formState.isSubmitting} className="self-start">
        <XCircle aria-hidden /> Reject application
      </Button>
    </form>
  );
}

export function RejectDialog({ applicationId }: { applicationId: string }) {
  return (
    <FormDialog
      title="Reject application"
      trigger={
        <Button size="sm" variant="outline">
          <XCircle aria-hidden /> Reject
        </Button>
      }
    >
      {(close) => <RejectForm applicationId={applicationId} onDone={close} />}
    </FormDialog>
  );
}

/* --------------------------------- Assign ------------------------------- */

function AssignForm({
  application,
  programs,
  batches,
  mentors,
  onDone,
}: {
  application: Application;
  programs: Option[];
  batches: Option[];
  mentors: Option[];
  onDone: () => void;
}) {
  const form = useForm<z.input<typeof assignApplicationSchema>>({
    resolver: zodResolver(assignApplicationSchema),
    defaultValues: {
      applicationId: application.id,
      programId: application.programId,
      batchId: application.assignedBatchId ?? "",
      mentorId: application.assignedMentorId ?? "",
    },
  });
  const { error, submit } = useSubmit(assignApplication, onDone);
  const programId = form.watch("programId");
  const locked = Boolean(application.enrollmentId);
  return (
    <form onSubmit={form.handleSubmit((v) => submit(v, form))} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <Field id="as-program" label="Program" hint={locked ? "Locked after approval" : undefined}>
        <Select {...form.register("programId")} disabled={locked}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="as-batch" label="Batch">
        <Select {...form.register("batchId")}>
          <option value="">None</option>
          {batches
            .filter((b) => b.programId === programId)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field id="as-mentor" label="Mentor">
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
        Save assignment
      </Button>
    </form>
  );
}

export function AssignDialog(props: { application: Application; programs: Option[]; batches: Option[]; mentors: Option[] }) {
  return (
    <FormDialog
      title="Assign program, batch & mentor"
      trigger={
        <Button size="sm" variant="outline">
          <Shuffle aria-hidden /> Assign
        </Button>
      }
    >
      {(close) => <AssignForm {...props} onDone={close} />}
    </FormDialog>
  );
}

/* ---------------------------- Notes & status ---------------------------- */

export function NoteForm({ applicationId }: { applicationId: string }) {
  const form = useForm<z.input<typeof applicationNoteSchema>>({
    resolver: zodResolver(applicationNoteSchema),
    defaultValues: { applicationId, text: "" },
  });
  const { error, submit } = useSubmit(addApplicationNote, () => form.reset({ applicationId, text: "" }));
  return (
    <form onSubmit={form.handleSubmit((v) => submit(v, form))} noValidate className="flex flex-col gap-2">
      <FormError message={error} />
      <label htmlFor="note-text" className="sr-only">
        Add a note
      </label>
      <Textarea id="note-text" rows={2} placeholder="Add an internal note…" {...form.register("text")} />
      <Button type="submit" size="sm" variant="outline" loading={form.formState.isSubmitting} className="self-start">
        <StickyNote aria-hidden /> Add note
      </Button>
    </form>
  );
}

export function StatusSelect({ application }: { application: Application }) {
  const { submit } = useSubmit(setApplicationStatus);
  const [pending, startTransition] = React.useTransition();
  const options = (["PENDING", "UNDER_REVIEW"] as const).filter((s) => s !== application.status);
  if (application.status === "ENROLLED" || application.status === "APPROVED") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((s) => (
        <Button
          key={s}
          size="sm"
          variant="ghost"
          loading={pending}
          onClick={() => startTransition(() => submit({ applicationId: application.id, status: s }))}
        >
          Mark {label(s).toLowerCase()}
        </Button>
      ))}
    </div>
  );
}
