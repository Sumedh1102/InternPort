"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Send } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { projectSubmitSchema } from "@/lib/domain/schemas";
import type { Project } from "@/lib/domain/types";
import { submitProject } from "@/server/actions/projects";
import { applyServerErrors } from "./form-utils";

type Values = z.input<typeof projectSubmitSchema>;

export function ProjectSubmitForm({ project, uid, locked }: { project: Project; uid: string; locked: boolean }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [shots, setShots] = React.useState<UploadedFile[]>(project.screenshots.map((s) => ({ ...s })));
  const form = useForm<Values>({
    resolver: zodResolver(projectSubmitSchema),
    defaultValues: {
      projectId: project.id,
      githubUrl: project.githubUrl ?? "",
      liveUrl: project.liveUrl ?? "",
      documentationUrl: project.documentationUrl ?? "",
      submit: true,
    },
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await submitProject({ ...values, screenshotPaths: shots.map((s) => s.path) });
    if (result.ok) {
      toast.success(result.message ?? "Saved");
      router.refresh();
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <fieldset disabled={locked || isSubmitting} className="grid min-w-0 gap-4 sm:grid-cols-3">
        <Field id={`p-${project.id}-gh`} label="GitHub" error={errors.githubUrl?.message}>
          <Input type="url" placeholder="https://github.com/…" {...register("githubUrl")} />
        </Field>
        <Field id={`p-${project.id}-live`} label="Live URL" error={errors.liveUrl?.message}>
          <Input type="url" placeholder="https://" {...register("liveUrl")} />
        </Field>
        <Field id={`p-${project.id}-docs`} label="Documentation" error={errors.documentationUrl?.message}>
          <Input type="url" placeholder="README / docs link" {...register("documentationUrl")} />
        </Field>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Screenshots</span>
        <FileUploader
          id={`p-${project.id}-shots`}
          pathPrefix={`users/${uid}/projects/${project.id}/`}
          accept={["image/png", "image/jpeg", "image/webp"]}
          maxBytes={5 * 1024 * 1024}
          maxFiles={6}
          value={shots}
          onChange={setShots}
          label="Add screenshots"
          disabled={locked}
        />
      </div>
      {!locked && (
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting} onClick={() => setValue("submit", true)}>
            <Send aria-hidden /> Submit project
          </Button>
          <Button type="submit" variant="outline" disabled={isSubmitting} onClick={() => setValue("submit", false)}>
            <Save aria-hidden /> Save progress
          </Button>
        </div>
      )}
    </form>
  );
}
