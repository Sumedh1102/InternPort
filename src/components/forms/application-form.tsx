"use client";

import * as React from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleCheck, Send } from "lucide-react";
import type { z } from "zod";

import { StickerLabel } from "@/components/brand/decor";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FormError, FormSection } from "@/components/ui/field";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import {
  ACADEMIC_YEARS,
  AVAILABILITY_OPTIONS,
  DEGREES,
  HOURS_PER_WEEK,
  PREFERRED_MODES,
  SKILL_LEVELS,
  label,
} from "@/lib/domain/enums";
import { formatINR } from "@/lib/domain/pricing";
import { applicationSchema } from "@/lib/domain/schemas";
import type { UserProfile } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { submitApplication } from "@/server/actions/applications";
import { applyServerErrors } from "./form-utils";

export interface ApplyProgramOption {
  id: string;
  slug: string;
  name: string;
  domain: string;
  earlyBird: number;
  regular: number;
  durationLabel: string;
  disabledReason?: string;
}

const SKILLS = ["Python", "JavaScript", "TypeScript", "React", "Node.js", "HTML", "CSS", "SQL", "Java", "C++", "Git", "Machine Learning"];

type Input = z.input<typeof applicationSchema>;
type Output = z.output<typeof applicationSchema>;

function RadioCards<T extends string>({
  name,
  options,
  value,
  onChange,
  describedBy,
}: {
  name: string;
  options: readonly T[];
  value: T | undefined;
  onChange: (v: T) => void;
  describedBy?: string;
}) {
  return (
    <div role="radiogroup" aria-describedby={describedBy} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o}
          className={cn(
            "cursor-pointer rounded-full border-2 border-ink px-4 py-2 text-sm font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue",
            value === o ? "bg-ink text-paper" : "bg-paper hover:bg-lime-soft",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o}
            checked={value === o}
            onChange={() => onChange(o)}
            className="sr-only"
          />
          {label(o)}
        </label>
      ))}
    </div>
  );
}

export function ApplicationForm({
  user,
  programs,
  initialProgramId,
  earlyBirdOpen,
}: {
  user: UserProfile;
  programs: ApplyProgramOption[];
  initialProgramId?: string;
  earlyBirdOpen: boolean;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [resume, setResume] = React.useState<UploadedFile[]>([]);
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      location: user.location ?? "",
      college: user.college ?? "",
      degree: (user.degree as Input["degree"]) || undefined,
      branch: user.branch ?? "",
      academicYear: (user.year as Input["academicYear"]) || undefined,
      programId: initialProgramId ?? "",
      technicalSkills: user.skills ?? [],
      skillLevel: undefined,
      experience: "",
      github: user.github ?? "",
      linkedin: user.linkedin ?? "",
      portfolio: user.portfolio ?? "",
      resumePath: "",
      preferredMode: undefined,
      availability: undefined,
      hoursPerWeek: undefined,
      motivation: "",
      earlyBirdInterest: earlyBirdOpen,
      consent: false as unknown as true,
      website: "",
    },
  });
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const selectedId = watch("programId");
  const selected = programs.find((p) => p.id === selectedId);
  const motivation = watch("motivation") ?? "";

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await submitApplication({ ...values, resumePath: resume[0]?.path ?? "" });
    if (result.ok) {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });

  if (submitted) {
    return (
      <div role="status" className="flex flex-col items-start gap-5 rounded-chunk border-2 border-ink bg-lime p-6 shadow-brutal-lg sm:p-10">
        <CircleCheck className="size-10" aria-hidden />
        <h2 className="font-display-wide text-4xl sm:text-5xl">Application submitted!</h2>
        <p className="max-w-xl text-lg">
          Thanks, {user.name.split(" ")[0]}. The Sainam Technology team will review your application for{" "}
          <strong>{selected?.name ?? "your selected program"}</strong>. You&apos;ll see every update — approval, payment
          instructions and enrollment — on your dashboard.
        </p>
        <Link href="/dashboard" className={buttonVariants({ variant: "dark", size: "lg" })}>
          Go to my dashboard <ArrowRight aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6" aria-label="Internship application">
      <FormError message={error} />

      <FormSection title="Internship domain" step="1" description="Choose the program you want to join.">
        <div className="flex flex-col gap-3 sm:col-span-2" role="radiogroup" aria-describedby={errors.programId ? "programId-error" : undefined}>
          <Controller
            control={control}
            name="programId"
            render={({ field }) => (
              <div className="grid gap-3 sm:grid-cols-2">
                {programs.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      "relative flex cursor-pointer flex-col gap-1 rounded-2xl border-2 border-ink p-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue",
                      field.value === p.id ? "bg-lime shadow-brutal-sm" : "bg-paper hover:bg-lime-soft",
                      p.disabledReason && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="programId"
                      value={p.id}
                      checked={field.value === p.id}
                      onChange={() => field.onChange(p.id)}
                      disabled={Boolean(p.disabledReason)}
                      className="sr-only"
                    />
                    <span className="font-display text-lg font-extrabold leading-tight">{p.name}</span>
                    <span className="text-xs">
                      {p.durationLabel} · {formatINR(p.earlyBird)}–{formatINR(p.regular)}/mo
                    </span>
                    {p.disabledReason && <span className="text-xs font-semibold">{p.disabledReason}</span>}
                  </label>
                ))}
              </div>
            )}
          />
          {errors.programId && (
            <p id="programId-error" role="alert" className="text-xs font-semibold text-red">
              Select a domain
            </p>
          )}
        </div>
      </FormSection>

      <FormSection title="Student details" step="2">
        <Field id="a-name" label="Full name" error={errors.fullName?.message} required>
          <Input autoComplete="name" {...register("fullName")} />
        </Field>
        <Field id="a-email" label="Email" error={errors.email?.message} required hint="We'll contact you on your account email.">
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field id="a-phone" label="Phone / WhatsApp" error={errors.phone?.message} required>
          <Input type="tel" autoComplete="tel" placeholder="+91 98xxxxxxx" {...register("phone")} />
        </Field>
        <Field id="a-location" label="Location (city, state)" error={errors.location?.message} required>
          <Input autoComplete="address-level2" {...register("location")} />
        </Field>
      </FormSection>

      <FormSection title="Academic details" step="3">
        <Field id="a-college" label="College / institute" error={errors.college?.message} required>
          <Input autoComplete="organization" {...register("college")} />
        </Field>
        <Field id="a-degree" label="Degree" error={errors.degree?.message} required>
          <Select {...register("degree")} defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {DEGREES.map((d) => (
              <option key={d} value={d}>
                {label(d)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="a-branch" label="Branch / specialisation" error={errors.branch?.message} required>
          <Input placeholder="e.g. Computer Science, IT" {...register("branch")} />
        </Field>
        <Field id="a-year" label="Academic year" error={errors.academicYear?.message} required>
          <Select {...register("academicYear")} defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {ACADEMIC_YEARS.map((y) => (
              <option key={y} value={y}>
                {label(y)}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Technical skills & experience" step="4">
        <Field id="a-skills" label="Technical skills" error={errors.technicalSkills?.message} required className="sm:col-span-2">
          <Controller
            control={control}
            name="technicalSkills"
            render={({ field }) => <TagInput value={field.value ?? []} onChange={field.onChange} suggestions={SKILLS} />}
          />
        </Field>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-semibold" id="a-level-label">
            Skill level <span className="text-pink">*</span>
          </span>
          <Controller
            control={control}
            name="skillLevel"
            render={({ field }) => (
              <RadioCards name="skillLevel" options={SKILL_LEVELS} value={field.value} onChange={field.onChange} describedBy="a-level-label" />
            )}
          />
          {errors.skillLevel && <p role="alert" className="text-xs font-semibold text-red">{errors.skillLevel.message}</p>}
        </div>
        <Field id="a-experience" label="Experience" hint="Projects, internships, hackathons, courses — optional" error={errors.experience?.message} className="sm:col-span-2">
          <Textarea rows={3} {...register("experience")} />
        </Field>
      </FormSection>

      <FormSection title="Profile links" step="5">
        <Field id="a-github" label="GitHub" error={errors.github?.message}>
          <Input type="url" placeholder="https://github.com/you" {...register("github")} />
        </Field>
        <Field id="a-linkedin" label="LinkedIn" error={errors.linkedin?.message}>
          <Input type="url" placeholder="https://linkedin.com/in/you" {...register("linkedin")} />
        </Field>
        <Field id="a-portfolio" label="Portfolio" error={errors.portfolio?.message}>
          <Input type="url" placeholder="https://" {...register("portfolio")} />
        </Field>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-semibold">Resume (optional)</span>
          <FileUploader
            id="a-resume"
            pathPrefix={`users/${user.id}/resume/`}
            accept={[
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]}
            maxBytes={5 * 1024 * 1024}
            value={resume}
            onChange={setResume}
            label="Upload resume"
          />
          {user.resumeUrl && !resume.length && (
            <p className="text-xs text-muted">Your profile resume will be available to reviewers if you don&apos;t upload a new one.</p>
          )}
        </div>
      </FormSection>

      <FormSection title="Internship preferences" step="6">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-semibold">
            Preferred mode <span className="text-pink">*</span>
          </span>
          <Controller
            control={control}
            name="preferredMode"
            render={({ field }) => <RadioCards name="preferredMode" options={PREFERRED_MODES} value={field.value} onChange={field.onChange} />}
          />
          {errors.preferredMode && <p role="alert" className="text-xs font-semibold text-red">{errors.preferredMode.message}</p>}
        </div>
        <Field id="a-availability" label="Availability" error={errors.availability?.message} required>
          <Select {...register("availability")} defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {label(o)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="a-hours" label="Hours per week" error={errors.hoursPerWeek?.message} required>
          <Select {...register("hoursPerWeek")} defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {HOURS_PER_WEEK.map((o) => (
              <option key={o} value={o}>
                {label(o)}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-pink-soft p-4 sm:col-span-2" htmlFor="a-earlybird">
          <Checkbox id="a-earlybird" {...register("earlyBirdInterest")} />
          <span className="text-sm">
            <StickerLabel tone="pink" rotate={0} className="mb-1">
              Early bird
            </StickerLabel>
            <br />
            I&apos;m interested in early-bird pricing ({selected ? formatINR(selected.earlyBird) : "₹1,500"}/month/course, first
            20 students only).{!earlyBirdOpen && " Early-bird seats may already be taken."}
          </span>
        </label>
      </FormSection>

      <FormSection title="Interest & motivation" step="7">
        <Field
          id="a-motivation"
          label="Why do you want to join this internship?"
          error={errors.motivation?.message}
          hint={`${motivation.length}/2000 · at least 30 characters`}
          required
          className="sm:col-span-2"
        >
          <Textarea rows={5} {...register("motivation")} />
        </Field>
      </FormSection>

      <div className="flex flex-col gap-2 rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
        <label className="flex items-start gap-3 text-sm" htmlFor="a-consent">
          <Checkbox id="a-consent" aria-invalid={errors.consent ? true : undefined} {...register("consent")} />
          <span>
            I confirm the information above is accurate and I consent to Sainam Technology using it to review my application
            and contact me about the internship. <span className="text-pink">*</span>
          </span>
        </label>
        {errors.consent && <p role="alert" className="text-xs font-semibold text-red">{errors.consent.message}</p>}
      </div>

      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="a-website">Website</label>
        <input id="a-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className="self-start">
        Submit application <Send aria-hidden />
      </Button>
    </form>
  );
}
