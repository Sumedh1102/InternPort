"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Layers, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import type { z } from "zod";

import { applyServerErrors, errorAt, isoToDate } from "@/components/forms/form-utils";
import { FormDialog } from "@/components/staff/form-dialog";
import type { Option } from "@/components/staff/assignment-form";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { BATCH_STATUSES, CONTENT_STATUSES, RESOURCE_TYPES, ROLES, label, type Role } from "@/lib/domain/enums";
import { batchSchema, courseSchema, resourceSchema, roleChangeSchema } from "@/lib/domain/schemas";
import type { ActionResult, Batch, Course, Resource } from "@/lib/domain/types";
import { saveBatch, setUserRole } from "@/server/actions/admin";
import { saveResource } from "@/server/actions/content";
import { saveCourse } from "@/server/actions/learning";

function useSave(onDone: () => void) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  return {
    error,
    async handle(result: ActionResult<unknown>, form?: Parameters<typeof applyServerErrors>[0]) {
      if (result.ok) {
        toast.success(result.message ?? "Saved");
        onDone();
        router.refresh();
      } else {
        setError(result.error);
        if (form) applyServerErrors(form, result);
      }
    },
  };
}

/* -------------------------------- Batches ------------------------------- */

type BatchValues = z.input<typeof batchSchema>;

function BatchForm({ batch, programs, mentors, onDone }: { batch?: Batch; programs: Option[]; mentors: Option[]; onDone: () => void }) {
  const { error, handle } = useSave(onDone);
  const form = useForm<BatchValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      programId: batch?.programId ?? programs[0]?.id ?? "",
      name: batch?.name ?? "",
      code: batch?.code ?? "",
      startDate: isoToDate(batch?.startDate) || "",
      endDate: isoToDate(batch?.endDate) || "",
      capacity: batch?.capacity ?? 30,
      mentorIds: batch?.mentorIds ?? [],
      schedule: batch?.schedule ?? "",
      status: batch?.status ?? "UPCOMING",
    },
  });
  const { register, control, handleSubmit, formState } = form;
  const { errors, isSubmitting } = formState;
  return (
    <form onSubmit={handleSubmit(async (v) => handle(await saveBatch(batch?.id ?? null, v), form))} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="b-program" label="Program" error={errors.programId?.message} required>
          <Select {...register("programId")}>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="b-status" label="Status" error={errors.status?.message}>
          <Select {...register("status")}>
            {BATCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="b-name" label="Name" error={errors.name?.message} required>
          <Input placeholder="Winter 2026 · Batch A" {...register("name")} />
        </Field>
        <Field id="b-code" label="Code" hint="e.g. FSD-W26-A" error={errors.code?.message} required>
          <Input className="uppercase" {...register("code", { setValueAs: (v: string) => v.toUpperCase() })} />
        </Field>
        <Field id="b-start" label="Start date" error={errors.startDate?.message} required>
          <Input type="date" {...register("startDate")} />
        </Field>
        <Field id="b-end" label="End date" error={errors.endDate?.message} required>
          <Input type="date" {...register("endDate")} />
        </Field>
        <Field id="b-cap" label="Capacity" error={errors.capacity?.message} required>
          <Input type="number" min={1} {...register("capacity", { valueAsNumber: true })} />
        </Field>
        <Field id="b-schedule" label="Schedule" hint="e.g. Mon/Wed/Fri 6–8 PM IST" error={errors.schedule?.message}>
          <Input {...register("schedule")} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Mentors</legend>
        {mentors.length === 0 ? (
          <p className="text-sm text-muted">No mentors yet — grant the Mentor role on the Mentors page.</p>
        ) : (
          <Controller
            control={control}
            name="mentorIds"
            render={({ field }) => (
              <div className="grid gap-2 sm:grid-cols-2">
                {mentors.map((m) => {
                  const checked = field.value.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 rounded-xl border-2 border-ink/20 px-3 py-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onChange={() => field.onChange(checked ? field.value.filter((x) => x !== m.id) : [...field.value, m.id])}
                      />
                      {m.name}
                    </label>
                  );
                })}
              </div>
            )}
          />
        )}
      </fieldset>
      <Button type="submit" loading={isSubmitting} className="self-start">
        {batch ? "Save batch" : "Create batch"}
      </Button>
    </form>
  );
}

export function BatchDialog(props: { batch?: Batch; programs: Option[]; mentors: Option[] }) {
  return (
    <FormDialog
      wide
      title={props.batch ? `Edit ${props.batch.name}` : "New batch"}
      trigger={
        props.batch ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${props.batch.name}`}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Layers aria-hidden /> New batch
          </Button>
        )
      }
    >
      {(close) => <BatchForm {...props} onDone={close} />}
    </FormDialog>
  );
}

/* --------------------------------- Roles -------------------------------- */

export function RoleForm({ actorRole, defaultRole = "MENTOR" }: { actorRole: Role; defaultRole?: Role }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.input<typeof roleChangeSchema>>({
    resolver: zodResolver(roleChangeSchema),
    defaultValues: { email: "", role: defaultRole },
  });
  const roles = actorRole === "SUPER_ADMIN" ? ROLES : (["STUDENT", "MENTOR"] as const);
  return (
    <form
      noValidate
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={form.handleSubmit(async (v) => {
        setError(null);
        const result = await setUserRole(v);
        if (result.ok) {
          toast.success(result.message ?? "Role updated");
          form.reset({ email: "", role: defaultRole });
          router.refresh();
        } else {
          setError(result.error);
          applyServerErrors(form, result);
        }
      })}
    >
      <Field id="role-email" label="Account email" error={form.formState.errors.email?.message ?? error ?? undefined} className="flex-1">
        <Input type="email" placeholder="person@example.com" {...form.register("email")} />
      </Field>
      <Field id="role-role" label="Role">
        <Select {...form.register("role")}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {label(r)}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" loading={form.formState.isSubmitting}>
        <UserPlus aria-hidden /> Set role
      </Button>
    </form>
  );
}

/* -------------------------------- Courses ------------------------------- */

type CourseValues = z.input<typeof courseSchema>;

function CourseForm({ course, programs, onDone }: { course?: Course; programs: Option[]; onDone: () => void }) {
  const { error, handle } = useSave(onDone);
  const form = useForm<CourseValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      programId: course?.programId ?? programs[0]?.id ?? "",
      title: course?.title ?? "",
      description: course?.description ?? "",
      modules: course?.modules.slice().sort((a, b) => a.order - b.order).map((m) => ({ id: m.id, title: m.title })) ?? [{ title: "" }],
      order: course?.order ?? 0,
      status: course?.status ?? "PUBLISHED",
    },
  });
  const { register, control, handleSubmit, formState } = form;
  const modules = useFieldArray({ control, name: "modules" });
  const { errors, isSubmitting } = formState;
  return (
    <form onSubmit={handleSubmit(async (v) => handle(await saveCourse(course?.id ?? null, v), form))} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="c-program" label="Program" error={errors.programId?.message} required>
          <Select {...register("programId")}>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="c-status" label="Status" error={errors.status?.message}>
          <Select {...register("status")}>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="c-title" label="Title" error={errors.title?.message} required>
          <Input {...register("title")} />
        </Field>
        <Field id="c-order" label="Order" error={errors.order?.message}>
          <Input type="number" min={0} {...register("order", { valueAsNumber: true })} />
        </Field>
        <Field id="c-desc" label="Description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea rows={2} {...register("description")} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Modules</legend>
        {modules.fields.map((f, i) => (
          <div key={f.id} className="flex items-start gap-2">
            <Field id={`c-mod-${i}`} label={`Module ${i + 1}`} error={errorAt(errors, `modules.${i}.title`)} className="flex-1">
              <Input {...register(`modules.${i}.title`)} />
            </Field>
            <div className="mt-7 flex gap-1">
              <Button type="button" size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => modules.move(i, i - 1)} aria-label="Move module up">
                <ArrowUp aria-hidden />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" disabled={i === modules.fields.length - 1} onClick={() => modules.move(i, i + 1)} aria-label="Move module down">
                <ArrowDown aria-hidden />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => modules.remove(i)} aria-label="Remove module" disabled={modules.fields.length === 1}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          </div>
        ))}
        {errorAt(errors, "modules") && <p className="text-xs font-semibold text-red">{errorAt(errors, "modules")}</p>}
        <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => modules.append({ title: "" })}>
          <Plus aria-hidden /> Add module
        </Button>
      </fieldset>
      <Button type="submit" loading={isSubmitting} className="self-start">
        {course ? "Save course" : "Create course"}
      </Button>
    </form>
  );
}

export function CourseDialog(props: { course?: Course; programs: Option[] }) {
  return (
    <FormDialog
      wide
      title={props.course ? `Edit ${props.course.title}` : "New course"}
      trigger={
        props.course ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${props.course.title}`}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Plus aria-hidden /> New course
          </Button>
        )
      }
    >
      {(close) => <CourseForm {...props} onDone={close} />}
    </FormDialog>
  );
}

/* ------------------------------- Resources ------------------------------ */

type ResourceValues = z.input<typeof resourceSchema>;

const RESOURCE_FILE_TYPES = [
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

function ResourceForm({ resource, programs, batches, onDone }: { resource?: Resource; programs: Option[]; batches: Option[]; onDone: () => void }) {
  const { error, handle } = useSave(onDone);
  const [file, setFile] = React.useState<UploadedFile[]>([]);
  const form = useForm<ResourceValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      programId: resource?.programId ?? programs[0]?.id ?? "",
      batchId: resource?.batchId ?? "",
      title: resource?.title ?? "",
      description: resource?.description ?? "",
      type: resource?.type ?? "LINK",
      url: resource?.storagePath ? "" : (resource?.url ?? ""),
      storagePath: resource?.storagePath ?? "",
    },
  });
  const { register, handleSubmit, watch, formState } = form;
  const { errors, isSubmitting } = formState;
  const programId = watch("programId");
  return (
    <form
      onSubmit={handleSubmit(async (v) => handle(await saveResource(resource?.id ?? null, { ...v, storagePath: file[0]?.path ?? v.storagePath }), form))}
      noValidate
      className="flex flex-col gap-4"
    >
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="r-program" label="Program" error={errors.programId?.message} required>
          <Select {...register("programId")}>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="r-batch" label="Batch" hint="Empty = whole program" error={errors.batchId?.message}>
          <Select {...register("batchId")}>
            <option value="">All batches</option>
            {batches
              .filter((b) => b.programId === programId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field id="r-title" label="Title" error={errors.title?.message} required>
          <Input {...register("title")} />
        </Field>
        <Field id="r-type" label="Type" error={errors.type?.message}>
          <Select {...register("type")}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="r-url" label="Link" hint="Or upload a file below" error={errors.url?.message} className="sm:col-span-2">
          <Input type="url" placeholder="https://" {...register("url")} />
        </Field>
        <Field id="r-desc" label="Description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea rows={2} {...register("description")} />
        </Field>
      </div>
      <FileUploader
        id="r-file"
        pathPrefix={`internship-documents/programs/${programId}/resources/`}
        accept={RESOURCE_FILE_TYPES}
        maxBytes={20 * 1024 * 1024}
        value={file}
        onChange={setFile}
        label={resource?.storagePath ? "Replace uploaded file" : "Upload a file"}
      />
      <Button type="submit" loading={isSubmitting} className="self-start">
        {resource ? "Save resource" : "Add resource"}
      </Button>
    </form>
  );
}

export function ResourceDialog(props: { resource?: Resource; programs: Option[]; batches: Option[] }) {
  return (
    <FormDialog
      wide
      title={props.resource ? `Edit ${props.resource.title}` : "New resource"}
      trigger={
        props.resource ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${props.resource.title}`}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus aria-hidden /> New resource
          </Button>
        )
      }
    >
      {(close) => <ResourceForm {...props} onDone={close} />}
    </FormDialog>
  );
}
