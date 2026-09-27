"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Megaphone, Pencil } from "lucide-react";
import type { z } from "zod";

import { applyServerErrors } from "@/components/forms/form-utils";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { ANNOUNCEMENT_AUDIENCES, label } from "@/lib/domain/enums";
import { announcementSchema } from "@/lib/domain/schemas";
import type { Announcement } from "@/lib/domain/types";
import { saveAnnouncement } from "@/server/actions/content";
import type { Option } from "./assignment-form";
import { FormDialog } from "./form-dialog";

type Values = z.input<typeof announcementSchema>;

function AnnouncementForm({
  announcement,
  programs,
  batches,
  mentorMode,
  onDone,
}: {
  announcement?: Announcement;
  programs: Option[];
  batches: Option[];
  mentorMode: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: announcement?.title ?? "",
      body: announcement?.body ?? "",
      audience: announcement?.audience ?? (mentorMode ? "BATCH" : "ALL"),
      programId: announcement?.programId ?? "",
      batchId: announcement?.batchId ?? (mentorMode ? batches[0]?.id : "") ?? "",
      pinned: announcement?.pinned ?? false,
      notify: !announcement,
    },
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const audience = watch("audience");
  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await saveAnnouncement(announcement?.id ?? null, values);
    if (result.ok) {
      toast.success(values.notify ? `Published — ${result.data.notified} people notified` : "Saved");
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
        <Field id="an-audience" label="Audience" error={errors.audience?.message} required>
          <Select {...register("audience")} disabled={mentorMode}>
            {ANNOUNCEMENT_AUDIENCES.filter((a) => !mentorMode || a === "BATCH").map((a) => (
              <option key={a} value={a}>
                {a === "ALL" ? "All active students" : a === "MENTORS" ? "All mentors" : `A ${label(a).toLowerCase()}`}
              </option>
            ))}
          </Select>
        </Field>
        {audience === "PROGRAM" && (
          <Field id="an-program" label="Program" error={errors.programId?.message} required>
            <Select {...register("programId")}>
              <option value="">Select…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {audience === "BATCH" && (
          <Field id="an-batch" label="Batch" error={errors.batchId?.message} required>
            <Select {...register("batchId")}>
              <option value="">Select…</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field id="an-title" label="Title" error={errors.title?.message} required className="sm:col-span-2">
          <Input {...register("title")} />
        </Field>
        <Field id="an-body" label="Message (markdown)" error={errors.body?.message} required className="sm:col-span-2">
          <Textarea rows={6} {...register("body")} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="an-pinned">
          <Checkbox id="an-pinned" {...register("pinned")} /> Pin to top
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="an-notify">
          <Checkbox id="an-notify" {...register("notify")} /> Send in-app notification
        </label>
      </div>
      <Button type="submit" loading={isSubmitting} className="self-start">
        {announcement ? "Save" : "Publish"}
      </Button>
    </form>
  );
}

export function AnnouncementFormDialog(props: {
  announcement?: Announcement;
  programs: Option[];
  batches: Option[];
  mentorMode?: boolean;
}) {
  return (
    <FormDialog
      wide
      title={props.announcement ? "Edit announcement" : "New announcement"}
      trigger={
        props.announcement ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${props.announcement.title}`}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Megaphone aria-hidden /> New announcement
          </Button>
        )
      }
    >
      {(close) => <AnnouncementForm {...props} mentorMode={Boolean(props.mentorMode)} onDone={close} />}
    </FormDialog>
  );
}
