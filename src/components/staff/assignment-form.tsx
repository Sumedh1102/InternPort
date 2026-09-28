"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { applyServerErrors, isoToLocal, localToIso } from "@/components/forms/form-utils";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { assignmentSchema } from "@/lib/domain/schemas";
import type { Assignment } from "@/lib/domain/types";
import { saveAssignment } from "@/server/actions/assignments";
import { FormDialog, newId } from "./form-dialog";

export interface Option {
  id: string;
  name: string;
  programId?: string;
}

type Values = z.input<typeof assignmentSchema>;

const STAFF_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

function AssignmentForm({
  assignment,
  programs,
  batches,
  mentorMode,
  onDone,
}: {
  assignment?: Assignment;
  programs: Option[];
  batches: Option[];
  mentorMode: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [id] = React.useState(() => assignment?.id ?? newId());
  const [error, setError] = React.useState<string | null>(null);
  const [attachments, setAttachments] = React.useState<UploadedFile[]>(assignment?.attachments ?? []);
  const form = useForm<Values>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      programId: assignment?.programId ?? (mentorMode ? batches[0]?.programId : programs[0]?.id) ?? "",
      batchId: assignment?.batchId ?? (mentorMode ? batches[0]?.id : "") ?? "",
      courseId: assignment?.courseId ?? "",
      title: assignment?.title ?? "",
      description: assignment?.description ?? "",
      instructions: assignment?.instructions ?? "",
      dueDate: assignment?.dueDate ?? new Date(Date.now() + 7 * 86400e3).toISOString(),
      maxScore: assignment?.maxScore ?? 100,
      allowFileUpload: assignment?.allowFileUpload ?? true,
      status: assignment?.status ?? "PUBLISHED",
    },
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const programId = watch("programId");
  const batchOptions = batches.filter((b) => !programId || b.programId === programId);
  const [dueLocal, setDueLocal] = React.useState(isoToLocal(form.getValues("dueDate")));

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await saveAssignment(id, !assignment, { ...values, attachmentPaths: attachments.map((a) => a.path) });
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
      <div className="grid gap-4 sm:grid-cols-2">
        {mentorMode ? (
          <Field id="as-batch" label="Batch" error={errors.batchId?.message} required>
            <Select
              {...register("batchId")}
              onChange={(e) => {
                setValue("batchId", e.target.value);
                setValue("programId", batches.find((b) => b.id === e.target.value)?.programId ?? "");
              }}
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <>
            <Field id="as-program" label="Program" error={errors.programId?.message} required>
              <Select {...register("programId")} onChange={(e) => { setValue("programId", e.target.value); setValue("batchId", ""); }}>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="as-batch" label="Batch" hint="Leave empty to assign to every batch in the program" error={errors.batchId?.message}>
              <Select {...register("batchId")}>
                <option value="">All batches</option>
                {batchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        <Field id="as-title" label="Title" error={errors.title?.message} required className="sm:col-span-2">
          <Input {...register("title")} />
        </Field>
        <Field id="as-desc" label="Description (markdown)" error={errors.description?.message} required className="sm:col-span-2">
          <Textarea rows={4} {...register("description")} />
        </Field>
        <Field id="as-instr" label="Instructions (markdown)" error={errors.instructions?.message} className="sm:col-span-2">
          <Textarea rows={4} {...register("instructions")} />
        </Field>
        <Field id="as-due" label="Due date & time" error={errors.dueDate?.message} required>
          <Input
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => {
              setDueLocal(e.target.value);
              setValue("dueDate", localToIso(e.target.value), { shouldValidate: true });
            }}
          />
        </Field>
        <Field id="as-max" label="Max score" error={errors.maxScore?.message} required>
          <Input type="number" min={1} max={1000} {...register("maxScore", { valueAsNumber: true })} />
        </Field>
        <Field id="as-status" label="Status" error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="PUBLISHED">Published (notify students)</option>
            <option value="DRAFT">Draft</option>
          </Select>
        </Field>
        <label className="flex items-center gap-3 self-end rounded-2xl border-2 border-ink bg-paper p-3 text-sm font-semibold" htmlFor="as-files">
          <Checkbox id="as-files" {...register("allowFileUpload")} /> Allow file uploads
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Attachments</span>
        <FileUploader
          id="as-attachments"
          pathPrefix={`internship-documents/assignments/${id}/`}
          accept={STAFF_TYPES}
          maxBytes={20 * 1024 * 1024}
          maxFiles={10}
          value={attachments}
          onChange={setAttachments}
          label="Attach briefs, starter files or templates"
        />
      </div>
      <Button type="submit" loading={isSubmitting} className="self-start">
        {assignment ? "Save changes" : "Create assignment"}
      </Button>
    </form>
  );
}

export function AssignmentFormDialog(props: {
  assignment?: Assignment;
  programs: Option[];
  batches: Option[];
  mentorMode?: boolean;
}) {
  return (
    <FormDialog
      wide
      title={props.assignment ? "Edit assignment" : "New assignment"}
      trigger={
        props.assignment ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${props.assignment.title}`}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Plus aria-hidden /> New assignment
          </Button>
        )
      }
    >
      {(close) => <AssignmentForm {...props} mentorMode={Boolean(props.mentorMode)} onDone={close} />}
    </FormDialog>
  );
}
