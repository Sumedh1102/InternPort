"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import { applyServerErrors, errorAt } from "@/components/forms/form-utils";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSection } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { CONTENT_STATUSES, LESSON_TYPES, label } from "@/lib/domain/enums";
import { lessonSchema, type LessonFormValues } from "@/lib/domain/schemas";
import type { Course, Lesson } from "@/lib/domain/types";
import { saveLesson } from "@/server/actions/learning";

function QuizOptions({ control, register, qi, errors }: { control: Control<LessonFormValues>; register: UseFormRegister<LessonFormValues>; qi: number; errors: unknown }) {
  const options = useFieldArray({ control, name: `quiz.${qi}.options` as never });
  return (
    <div className="flex flex-col gap-2">
      <Controller
        control={control}
        name={`quiz.${qi}.answerIndex`}
        render={({ field }) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Options (select the correct one)</legend>
            {options.fields.map((f, oi) => (
              <div key={f.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  className="size-4 accent-ink"
                  checked={field.value === oi}
                  onChange={() => field.onChange(oi)}
                  aria-label={`Mark option ${oi + 1} as correct`}
                />
                <Input aria-label={`Option ${oi + 1}`} {...register(`quiz.${qi}.options.${oi}` as const)} />
                <Button type="button" size="icon-sm" variant="ghost" disabled={options.fields.length <= 2} onClick={() => options.remove(oi)} aria-label={`Remove option ${oi + 1}`}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
          </fieldset>
        )}
      />
      {errorAt(errors, `quiz.${qi}.answerIndex`) && <p className="text-xs font-semibold text-red">{errorAt(errors, `quiz.${qi}.answerIndex`)}</p>}
      {errorAt(errors, `quiz.${qi}.options`) && <p className="text-xs font-semibold text-red">{errorAt(errors, `quiz.${qi}.options`)}</p>}
      {options.fields.length < 6 && (
        <Button type="button" size="sm" variant="ghost" className="self-start" onClick={() => options.append("" as never)}>
          <Plus aria-hidden /> Add option
        </Button>
      )}
    </div>
  );
}

export function LessonForm({
  lesson,
  answerKey,
  courses,
  programNames,
}: {
  lesson?: Lesson;
  answerKey?: number[];
  courses: Course[];
  programNames: Record<string, string>;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      courseId: lesson?.courseId ?? courses[0]?.id ?? "",
      moduleId: lesson?.moduleId ?? courses[0]?.modules[0]?.id ?? "",
      title: lesson?.title ?? "",
      summary: lesson?.summary ?? "",
      type: lesson?.type ?? "ARTICLE",
      content: lesson?.content ?? "",
      videoUrl: lesson?.videoUrl ?? "",
      pdfUrl: lesson?.pdfUrl ?? "",
      repoUrl: lesson?.repoUrl ?? "",
      resources: lesson?.resources ?? [],
      quiz: (lesson?.quiz ?? []).map((q, i) => ({ id: q.id, question: q.question, options: q.options, answerIndex: answerKey?.[i] ?? 0 })),
      quizPassPercent: lesson?.quizPassPercent ?? 60,
      durationMinutes: lesson?.durationMinutes ?? 15,
      order: lesson?.order ?? 0,
      status: lesson?.status ?? "DRAFT",
    },
  });
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const resources = useFieldArray({ control, name: "resources" });
  const quiz = useFieldArray({ control, name: "quiz" });
  const courseId = watch("courseId");
  const type = watch("type");
  const course = courses.find((c) => c.id === courseId);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await saveLesson(lesson?.id ?? null, { ...values, quiz: values.type === "QUIZ" ? values.quiz : [] });
    if (result.ok) {
      toast.success(result.message ?? "Saved");
      if (!lesson) router.push(`/admin/lessons/${result.data.id}`);
      else router.refresh();
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormError message={error} />
      <FormSection title="Placement" step="1">
        <Field id="l-course" label="Course" error={errors.courseId?.message} required>
          <Select
            {...register("courseId", {
              onChange: (e) => setValue("moduleId", courses.find((c) => c.id === e.target.value)?.modules[0]?.id ?? ""),
            })}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} · {programNames[c.programId] ?? ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="l-module" label="Module" error={errors.moduleId?.message} required>
          <Select {...register("moduleId")}>
            {course?.modules
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
          </Select>
        </Field>
        <Field id="l-order" label="Order in module" error={errors.order?.message}>
          <Input type="number" min={0} {...register("order", { valueAsNumber: true })} />
        </Field>
        <Field id="l-status" label="Status" hint="Publishing notifies active students" error={errors.status?.message}>
          <Select {...register("status")}>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Content" step="2">
        <Field id="l-title" label="Title" error={errors.title?.message} required className="sm:col-span-2">
          <Input {...register("title")} />
        </Field>
        <Field id="l-summary" label="Summary" error={errors.summary?.message} className="sm:col-span-2">
          <Input {...register("summary")} />
        </Field>
        <Field id="l-type" label="Lesson type" error={errors.type?.message}>
          <Select {...register("type")}>
            {LESSON_TYPES.map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="l-duration" label="Duration (minutes)" error={errors.durationMinutes?.message}>
          <Input type="number" min={0} {...register("durationMinutes", { valueAsNumber: true })} />
        </Field>
        <Field id="l-video" label="Video URL" hint="YouTube, Vimeo or Google Drive links are embedded" error={errors.videoUrl?.message} required={type === "VIDEO"}>
          <Input type="url" {...register("videoUrl")} />
        </Field>
        <Field id="l-pdf" label="PDF URL" error={errors.pdfUrl?.message} required={type === "PDF"}>
          <Input type="url" {...register("pdfUrl")} />
        </Field>
        <Field id="l-repo" label="Code repository URL" error={errors.repoUrl?.message} required={type === "REPO"} className="sm:col-span-2">
          <Input type="url" {...register("repoUrl")} />
        </Field>
        <Field id="l-content" label="Notes (markdown)" error={errors.content?.message} className="sm:col-span-2">
          <Textarea rows={12} className="font-mono text-sm" {...register("content")} />
        </Field>
      </FormSection>

      <FormSection title="Extra resources" step="3">
        <div className="flex flex-col gap-3 sm:col-span-2">
          {resources.fields.map((f, i) => (
            <div key={f.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
              <Field id={`l-res-${i}-l`} label="Label" error={errorAt(errors, `resources.${i}.label`)}>
                <Input {...register(`resources.${i}.label`)} />
              </Field>
              <Field id={`l-res-${i}-u`} label="URL" error={errorAt(errors, `resources.${i}.url`)}>
                <Input type="url" {...register(`resources.${i}.url`)} />
              </Field>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => resources.remove(i)} aria-label="Remove resource" className="mb-1">
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => resources.append({ label: "", url: "" })}>
            <Plus aria-hidden /> Add resource
          </Button>
        </div>
      </FormSection>

      {type === "QUIZ" && (
        <FormSection title="Quiz" step="4" description="Answers are stored separately and never sent to students' browsers.">
          <Field id="l-pass" label="Pass mark (%)" error={errors.quizPassPercent?.message}>
            <Input type="number" min={0} max={100} {...register("quizPassPercent", { valueAsNumber: true })} />
          </Field>
          <div className="flex flex-col gap-4 sm:col-span-2">
            {errorAt(errors, "quiz") && <p className="text-xs font-semibold text-red">{errorAt(errors, "quiz")}</p>}
            {quiz.fields.map((f, qi) => (
              <div key={f.id} className="flex flex-col gap-3 rounded-2xl border-2 border-ink/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">QUESTION {qi + 1}</span>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => quiz.remove(qi)} aria-label={`Remove question ${qi + 1}`}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                <Field id={`l-q-${qi}`} label="Question" error={errorAt(errors, `quiz.${qi}.question`)}>
                  <Input {...register(`quiz.${qi}.question`)} />
                </Field>
                <QuizOptions control={control} register={register} qi={qi} errors={errors} />
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => quiz.append({ question: "", options: ["", ""], answerIndex: 0 })}>
              <Plus aria-hidden /> Add question
            </Button>
          </div>
        </FormSection>
      )}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" loading={isSubmitting} className="shadow-brutal">
          {lesson ? "Save lesson" : "Create lesson"}
        </Button>
      </div>
    </form>
  );
}
