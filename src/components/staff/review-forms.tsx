"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, FolderPlus, MessageSquareText, Paperclip } from "lucide-react";
import { Controller } from "react-hook-form";
import type { z } from "zod";

import { Github } from "@/components/brand/icons";
import { applyServerErrors } from "@/components/forms/form-utils";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { toast } from "@/components/ui/toaster";
import { label } from "@/lib/domain/enums";
import { projectAssignSchema, projectReviewSchema, reviewSubmissionSchema } from "@/lib/domain/schemas";
import type { Project, Submission } from "@/lib/domain/types";
import { REVIEWER_PROJECT_FLOW, REVIEWER_SUBMISSION_FLOW } from "@/lib/domain/workflows";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { reviewSubmission } from "@/server/actions/assignments";
import { assignProject, reviewProject } from "@/server/actions/projects";
import { FormDialog } from "./form-dialog";

function Links({ github, live, docs }: { github?: string; live?: string; docs?: string }) {
  if (!github && !live && !docs) return null;
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {github && (
        <a href={github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold underline">
          <Github className="size-4" /> Repository
        </a>
      )}
      {live && (
        <a href={live} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold underline">
          <ExternalLink className="size-4" aria-hidden /> Live
        </a>
      )}
      {docs && (
        <a href={docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold underline">
          <ExternalLink className="size-4" aria-hidden /> Docs
        </a>
      )}
    </div>
  );
}

/* ----------------------------- Submissions ---------------------------- */

type ReviewValues = z.input<typeof reviewSubmissionSchema>;

function SubmissionReviewForm({ submission, onDone }: { submission: Submission; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const allowed = REVIEWER_SUBMISSION_FLOW[submission.status] ?? [];
  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSubmissionSchema),
    defaultValues: {
      submissionId: submission.id,
      status: (allowed.includes("APPROVED") ? "APPROVED" : allowed[0] ?? "UNDER_REVIEW") as ReviewValues["status"],
      score: submission.score,
      feedback: submission.feedback ?? "",
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await reviewSubmission({ ...values, score: Number.isFinite(values.score) ? values.score : undefined });
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
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-cream p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{submission.studentName}</p>
          <StatusBadge status={submission.status} />
        </div>
        <p className="text-xs text-muted">Submitted {formatDateTime(submission.submittedAt)}</p>
        <Links github={submission.githubUrl} live={submission.liveUrl} />
        {submission.explanation && <p className="whitespace-pre-wrap text-sm">{submission.explanation}</p>}
        {submission.files.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {submission.files.map((f) => (
              <li key={f.path}>
                <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold underline">
                  <Paperclip className="size-4" aria-hidden /> {f.name} <span className="font-mono text-xs text-muted">{formatBytes(f.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {allowed.length === 0 ? (
        <p className="text-sm text-muted">This submission isn&apos;t ready for review.</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="rv-status" label="Decision" error={errors.status?.message} required>
              <Select {...register("status")}>
                {allowed.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="rv-score" label={`Score (out of ${submission.maxScore})`} error={errors.score?.message}>
              <Input type="number" min={0} max={submission.maxScore} step="0.5" {...register("score", { setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)) })} />
            </Field>
          </div>
          <Field id="rv-feedback" label="Feedback" error={errors.feedback?.message}>
            <Textarea rows={5} {...register("feedback")} placeholder="What went well, what to improve, and why." />
          </Field>
          <Button type="submit" loading={isSubmitting} className="self-start">
            Save review
          </Button>
        </form>
      )}
    </div>
  );
}

export function SubmissionReviewDialog({ submission, defaultOpen }: { submission: Submission; defaultOpen?: boolean }) {
  return (
    <FormDialog
      wide
      defaultOpen={defaultOpen}
      title={submission.assignmentTitle}
      description="Review the submission and give actionable feedback."
      trigger={
        <Button size="sm" variant={submission.status === "SUBMITTED" ? "primary" : "outline"}>
          <MessageSquareText aria-hidden /> Review
        </Button>
      }
    >
      {(close) => <SubmissionReviewForm submission={submission} onDone={close} />}
    </FormDialog>
  );
}

/* ------------------------------ Projects ------------------------------ */

type AssignValues = z.input<typeof projectAssignSchema>;

function ProjectAssignForm({ enrollmentId, onDone }: { enrollmentId: string; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<AssignValues>({
    resolver: zodResolver(projectAssignSchema),
    defaultValues: { enrollmentId, title: "", description: "", techStack: [], dueDate: "", maxScore: 100 },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await assignProject(values);
    if (result.ok) {
      toast.success(result.message ?? "Assigned");
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
      <Field id="pa-title" label="Project title" error={errors.title?.message} required>
        <Input {...register("title")} />
      </Field>
      <Field id="pa-desc" label="Brief" error={errors.description?.message} required>
        <Textarea rows={5} {...register("description")} />
      </Field>
      <Field id="pa-tech" label="Tech stack" error={errors.techStack?.message}>
        <Controller control={control} name="techStack" render={({ field }) => <TagInput value={field.value ?? []} onChange={field.onChange} />} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pa-due" label="Due date" error={errors.dueDate?.message}>
          <Input type="date" {...register("dueDate")} />
        </Field>
        <Field id="pa-max" label="Max score" error={errors.maxScore?.message} required>
          <Input type="number" min={1} {...register("maxScore", { valueAsNumber: true })} />
        </Field>
      </div>
      <Button type="submit" loading={isSubmitting} className="self-start">
        Assign project
      </Button>
    </form>
  );
}

export function ProjectAssignDialog({ enrollmentId, studentName }: { enrollmentId: string; studentName: string }) {
  return (
    <FormDialog
      title={`Assign a project to ${studentName}`}
      trigger={
        <Button size="sm" variant="outline">
          <FolderPlus aria-hidden /> Assign project
        </Button>
      }
    >
      {(close) => <ProjectAssignForm enrollmentId={enrollmentId} onDone={close} />}
    </FormDialog>
  );
}

type ProjectReviewValues = z.input<typeof projectReviewSchema>;

function ProjectReviewForm({ project, canFeature, onDone }: { project: Project; canFeature: boolean; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const next = REVIEWER_PROJECT_FLOW[project.status] ?? [];
  const form = useForm<ProjectReviewValues>({
    resolver: zodResolver(projectReviewSchema),
    defaultValues: {
      projectId: project.id,
      status: (next[0] ?? project.status) as ProjectReviewValues["status"],
      score: project.score,
      feedback: project.feedback ?? "",
      featured: canFeature ? project.featured : undefined,
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await reviewProject({
      ...values,
      score: Number.isFinite(values.score) ? values.score : undefined,
      featured: canFeature ? values.featured : undefined,
    });
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
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-cream p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{project.studentName}</p>
          <StatusBadge status={project.status} />
        </div>
        <p className="whitespace-pre-line text-sm">{project.description}</p>
        <Links github={project.githubUrl} live={project.liveUrl} docs={project.documentationUrl} />
        {project.screenshots.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {project.screenshots.map((s) => (
              <a key={s.path} href={s.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border-2 border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt={`Screenshot ${s.name}`} className="aspect-video w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pr-status" label="Move to" error={errors.status?.message} required>
            <Select {...register("status")}>
              <option value={project.status}>{label(project.status)} (no change)</option>
              {next.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="pr-score" label={`Score (out of ${project.maxScore})`} error={errors.score?.message}>
            <Input type="number" min={0} max={project.maxScore} step="0.5" {...register("score", { setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)) })} />
          </Field>
        </div>
        <Field id="pr-feedback" label="Feedback" error={errors.feedback?.message}>
          <Textarea rows={4} {...register("feedback")} />
        </Field>
        {canFeature && (
          <label className="flex items-center gap-3 text-sm font-semibold" htmlFor="pr-featured">
            <Checkbox id="pr-featured" {...register("featured")} /> Feature on the public projects page (evaluated/completed only, with the student&apos;s consent)
          </label>
        )}
        <Button type="submit" loading={isSubmitting} className="self-start">
          Save
        </Button>
      </form>
    </div>
  );
}

export function ProjectReviewDialog({ project, canFeature = false }: { project: Project; canFeature?: boolean }) {
  return (
    <FormDialog
      wide
      title={project.title}
      description="Review, evaluate and move the project through its workflow."
      trigger={
        <Button size="sm" variant={project.status === "SUBMITTED" ? "primary" : "outline"}>
          Review
        </Button>
      }
    >
      {(close) => <ProjectReviewForm project={project} canFeature={canFeature} onDone={close} />}
    </FormDialog>
  );
}
