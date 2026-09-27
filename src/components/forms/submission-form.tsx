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
import { Input, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { submissionSchema } from "@/lib/domain/schemas";
import type { StoredFile, Submission } from "@/lib/domain/types";
import { saveSubmission } from "@/server/actions/assignments";
import { applyServerErrors } from "./form-utils";

const SUBMISSION_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
] as const;

type Values = z.input<typeof submissionSchema>;

export function SubmissionForm({
  assignmentId,
  uid,
  submission,
  allowFiles,
  locked,
}: {
  assignmentId: string;
  uid: string;
  submission: Submission | null;
  allowFiles: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [files, setFiles] = React.useState<UploadedFile[]>(
    (submission?.files ?? []).map((f: StoredFile) => ({ ...f })),
  );
  const [mode, setMode] = React.useState<"draft" | "submit">("submit");
  const form = useForm<Values>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      assignmentId,
      githubUrl: submission?.githubUrl ?? "",
      liveUrl: submission?.liveUrl ?? "",
      explanation: submission?.explanation ?? "",
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
    const result = await saveSubmission({ ...values, filePaths: files.map((f) => f.path) });
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
      <fieldset disabled={locked || isSubmitting} className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="s-github" label="GitHub repository" error={errors.githubUrl?.message}>
            <Input type="url" placeholder="https://github.com/you/project" {...register("githubUrl")} />
          </Field>
          <Field id="s-live" label="Live URL" error={errors.liveUrl?.message}>
            <Input type="url" placeholder="https://" {...register("liveUrl")} />
          </Field>
        </div>
        <Field id="s-explanation" label="Explanation" hint="What did you build, what was tricky, what would you improve?" error={errors.explanation?.message}>
          <Textarea rows={5} {...register("explanation")} />
        </Field>
        {allowFiles && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Files</span>
            <FileUploader
              id="s-files"
              pathPrefix={`submissions/${assignmentId}_${uid}/`}
              accept={SUBMISSION_TYPES}
              maxBytes={10 * 1024 * 1024}
              maxFiles={5}
              value={files}
              onChange={setFiles}
              label="Attach files (PDF, ZIP, images, text)"
              disabled={locked}
            />
          </div>
        )}
      </fieldset>
      {!locked && (
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            loading={isSubmitting && mode === "submit"}
            disabled={isSubmitting}
            onClick={() => {
              setMode("submit");
              setValue("submit", true);
            }}
          >
            <Send aria-hidden /> Submit for review
          </Button>
          <Button
            type="submit"
            variant="outline"
            loading={isSubmitting && mode === "draft"}
            disabled={isSubmitting}
            onClick={() => {
              setMode("draft");
              setValue("submit", false);
            }}
          >
            <Save aria-hidden /> Save draft
          </Button>
        </div>
      )}
    </form>
  );
}
