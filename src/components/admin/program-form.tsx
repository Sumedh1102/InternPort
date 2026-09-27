"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { applyServerErrors, errorAt } from "@/components/forms/form-utils";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSection } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { LinesInput, TagInput } from "@/components/ui/tag-input";
import { toast } from "@/components/ui/toaster";
import { PROGRAM_STATUSES, label } from "@/lib/domain/enums";
import { programSchema, type ProgramFormValues } from "@/lib/domain/schemas";
import type { Program } from "@/lib/domain/types";
import { saveProgram } from "@/server/actions/admin";

const EMPTY: ProgramFormValues = {
  slug: "",
  name: "",
  domain: "",
  tagline: "",
  description: "",
  durationMonths: 3,
  durationLabel: "3 Months",
  fees: { earlyBird: 1500, regular: 1800 },
  eligibility: [],
  skills: [],
  technologies: [],
  benefits: [],
  curriculum: [],
  roadmap: [],
  certificateInfo: "",
  faqs: [],
  mode: "Announced with batch schedule",
  accent: "lime",
  status: "DRAFT",
  order: 0,
};

function slugify(v: string) {
  return v
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function MoveButtons({ index, length, move, remove, what }: { index: number; length: number; move: (a: number, b: number) => void; remove: (i: number) => void; what: string }) {
  return (
    <div className="flex gap-1">
      <Button type="button" size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move ${what} up`}>
        <ArrowUp aria-hidden />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" disabled={index === length - 1} onClick={() => move(index, index + 1)} aria-label={`Move ${what} down`}>
        <ArrowDown aria-hidden />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" onClick={() => remove(index)} aria-label={`Remove ${what}`}>
        <Trash2 aria-hidden />
      </Button>
    </div>
  );
}

export function ProgramForm({ program }: { program?: Program }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: program
      ? {
          ...EMPTY,
          ...program,
          fees: { earlyBird: program.fees.earlyBird, regular: program.fees.regular },
        }
      : EMPTY,
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = form;
  const curriculum = useFieldArray({ control, name: "curriculum" });
  const roadmap = useFieldArray({ control, name: "roadmap" });
  const faqs = useFieldArray({ control, name: "faqs" });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await saveProgram(program?.id ?? null, values);
    if (result.ok) {
      toast.success(result.message ?? "Saved");
      if (!program) router.push(`/admin/programs/${result.data.id}`);
      else router.refresh();
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormError message={error} />
      {Object.keys(errors).length > 0 && <FormError message="Some fields need attention — check the highlighted sections." />}

      <FormSection title="Basics" step="1">
        <Field id="pg-name" label="Program name" error={errors.name?.message} required>
          <Input
            {...register("name", {
              onBlur: (e) => {
                if (!getValues("slug")) setValue("slug", slugify(e.target.value), { shouldValidate: true });
              },
            })}
          />
        </Field>
        <Field id="pg-slug" label="URL slug" hint="/internships/your-slug" error={errors.slug?.message} required>
          <Input {...register("slug")} />
        </Field>
        <Field id="pg-domain" label="Domain" error={errors.domain?.message} required>
          <Input {...register("domain")} />
        </Field>
        <Field id="pg-status" label="Status" error={errors.status?.message} hint="Only Published programs accept applications">
          <Select {...register("status")}>
            {PROGRAM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="pg-tagline" label="Tagline" error={errors.tagline?.message} required className="sm:col-span-2">
          <Input {...register("tagline")} />
        </Field>
        <Field id="pg-desc" label="Description" error={errors.description?.message} required className="sm:col-span-2">
          <Textarea rows={5} {...register("description")} />
        </Field>
        <Field id="pg-accent" label="Accent colour" error={errors.accent?.message}>
          <Select {...register("accent")}>
            {(["lime", "pink", "cyan", "blue"] as const).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="pg-order" label="Display order" error={errors.order?.message}>
          <Input type="number" min={0} {...register("order", { valueAsNumber: true })} />
        </Field>
      </FormSection>

      <FormSection title="Duration, fees & mode" step="2" description="Fees are per month, per course (INR).">
        <Field id="pg-months" label="Duration (months)" error={errors.durationMonths?.message} required>
          <Input type="number" min={1} max={24} {...register("durationMonths", { valueAsNumber: true })} />
        </Field>
        <Field id="pg-dlabel" label="Duration label" error={errors.durationLabel?.message} required>
          <Input {...register("durationLabel")} />
        </Field>
        <Field id="pg-early" label="Early-bird fee (₹/month)" error={errorAt(errors, "fees.earlyBird")} required>
          <Input type="number" min={0} {...register("fees.earlyBird", { valueAsNumber: true })} />
        </Field>
        <Field id="pg-regular" label="Regular fee (₹/month)" error={errorAt(errors, "fees.regular")} required>
          <Input type="number" min={0} {...register("fees.regular", { valueAsNumber: true })} />
        </Field>
        <Field id="pg-mode" label="Mode" error={errors.mode?.message} required className="sm:col-span-2">
          <Input {...register("mode")} />
        </Field>
      </FormSection>

      <FormSection title="Audience & outcomes" step="3">
        <Field id="pg-elig" label="Eligibility (one per line)" error={errors.eligibility?.message} className="sm:col-span-2">
          <Controller control={control} name="eligibility" render={({ field }) => <LinesInput value={field.value} onChange={field.onChange} rows={3} />} />
        </Field>
        <Field id="pg-skills" label="Skills" error={errors.skills?.message} className="sm:col-span-2">
          <Controller control={control} name="skills" render={({ field }) => <TagInput value={field.value ?? []} onChange={field.onChange} max={40} />} />
        </Field>
        <Field id="pg-tech" label="Technologies" error={errors.technologies?.message} className="sm:col-span-2">
          <Controller control={control} name="technologies" render={({ field }) => <TagInput value={field.value ?? []} onChange={field.onChange} max={40} />} />
        </Field>
        <Field id="pg-benefits" label="What students receive (one per line)" error={errors.benefits?.message} className="sm:col-span-2">
          <Controller control={control} name="benefits" render={({ field }) => <LinesInput value={field.value} onChange={field.onChange} rows={4} />} />
        </Field>
        <Field id="pg-cert" label="Certificate information" error={errors.certificateInfo?.message} className="sm:col-span-2">
          <Textarea rows={3} {...register("certificateInfo")} />
        </Field>
      </FormSection>

      <FormSection title="Curriculum" step="4" description="Modules and their topics.">
        <div className="flex flex-col gap-4 sm:col-span-2">
          {curriculum.fields.map((f, i) => (
            <div key={f.id} className="rounded-2xl border-2 border-ink/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold">MODULE {i + 1}</span>
                <MoveButtons index={i} length={curriculum.fields.length} move={curriculum.move} remove={curriculum.remove} what="module" />
              </div>
              <div className="grid gap-3">
                <Field id={`pg-cur-${i}-t`} label="Title" error={errorAt(errors, `curriculum.${i}.title`)}>
                  <Input {...register(`curriculum.${i}.title`)} />
                </Field>
                <Field id={`pg-cur-${i}-topics`} label="Topics (one per line)" error={errorAt(errors, `curriculum.${i}.topics`)}>
                  <Controller control={control} name={`curriculum.${i}.topics`} render={({ field }) => <LinesInput value={field.value} onChange={field.onChange} rows={3} />} />
                </Field>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => curriculum.append({ title: "", topics: [] })}>
            <Plus aria-hidden /> Add module
          </Button>
        </div>
      </FormSection>

      <FormSection title="Weekly roadmap" step="5">
        <div className="flex flex-col gap-4 sm:col-span-2">
          {roadmap.fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 rounded-2xl border-2 border-ink/20 p-4 sm:grid-cols-[140px_1fr_auto] sm:items-start">
              <Field id={`pg-rm-${i}-w`} label="Week" error={errorAt(errors, `roadmap.${i}.week`)}>
                <Input placeholder="Week 1" {...register(`roadmap.${i}.week`)} />
              </Field>
              <div className="grid gap-3">
                <Field id={`pg-rm-${i}-t`} label="Title" error={errorAt(errors, `roadmap.${i}.title`)}>
                  <Input {...register(`roadmap.${i}.title`)} />
                </Field>
                <Field id={`pg-rm-${i}-d`} label="Description" error={errorAt(errors, `roadmap.${i}.description`)}>
                  <Input {...register(`roadmap.${i}.description`)} />
                </Field>
              </div>
              <MoveButtons index={i} length={roadmap.fields.length} move={roadmap.move} remove={roadmap.remove} what="roadmap item" />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => roadmap.append({ week: `Week ${roadmap.fields.length + 1}`, title: "", description: "" })}>
            <Plus aria-hidden /> Add roadmap item
          </Button>
        </div>
      </FormSection>

      <FormSection title="FAQ" step="6">
        <div className="flex flex-col gap-4 sm:col-span-2">
          {faqs.fields.map((f, i) => (
            <div key={f.id} className="rounded-2xl border-2 border-ink/20 p-4">
              <div className="mb-3 flex justify-end">
                <MoveButtons index={i} length={faqs.fields.length} move={faqs.move} remove={faqs.remove} what="question" />
              </div>
              <div className="grid gap-3">
                <Field id={`pg-faq-${i}-q`} label="Question" error={errorAt(errors, `faqs.${i}.question`)}>
                  <Input {...register(`faqs.${i}.question`)} />
                </Field>
                <Field id={`pg-faq-${i}-a`} label="Answer" error={errorAt(errors, `faqs.${i}.answer`)}>
                  <Textarea rows={2} {...register(`faqs.${i}.answer`)} />
                </Field>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => faqs.append({ question: "", answer: "" })}>
            <Plus aria-hidden /> Add question
          </Button>
        </div>
      </FormSection>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" loading={isSubmitting} className="shadow-brutal">
          {program ? "Save program" : "Create program"}
        </Button>
      </div>
    </form>
  );
}
