"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FormError, FormSection } from "@/components/ui/field";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Avatar } from "@/components/ui/feedback";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { toast } from "@/components/ui/toaster";
import { ACADEMIC_YEARS, DEGREES, label } from "@/lib/domain/enums";
import { onboardingSchema, profileSchema } from "@/lib/domain/schemas";
import type { UserProfile } from "@/lib/domain/types";
import { completeOnboarding, updateProfile } from "@/server/actions/account";
import { applyServerErrors } from "./form-utils";

const SKILL_SUGGESTIONS = ["Python", "JavaScript", "React", "Node.js", "SQL", "Git", "Java", "C++", "HTML", "CSS"];

type Values = z.input<typeof profileSchema>;

export function ProfileForm({
  user,
  mode,
  onDone,
}: {
  user: UserProfile;
  mode: "onboarding" | "profile";
  onDone?: () => void;
}) {
  const router = useRouter();
  const schema = mode === "onboarding" ? onboardingSchema : profileSchema;
  const [error, setError] = React.useState<string | null>(null);
  const [photo, setPhoto] = React.useState<UploadedFile[]>([]);
  const [resume, setResume] = React.useState<UploadedFile[]>([]);
  const form = useForm<Values>({
    resolver: zodResolver(schema as typeof profileSchema),
    defaultValues: {
      name: user.name ?? "",
      phone: user.phone ?? "",
      college: user.college ?? "",
      degree: (user.degree as Values["degree"]) ?? "",
      branch: user.branch ?? "",
      year: (user.year as Values["year"]) ?? "",
      location: user.location ?? "",
      bio: user.bio ?? "",
      skills: user.skills ?? [],
      github: user.github ?? "",
      linkedin: user.linkedin ?? "",
      portfolio: user.portfolio ?? "",
    },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const required = mode === "onboarding";

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const payload = {
      ...values,
      profileImagePath: photo[0]?.path ?? "",
      resumePath: resume[0]?.path ?? "",
    };
    const result = mode === "onboarding" ? await completeOnboarding(payload) : await updateProfile(payload);
    if (result.ok) {
      toast.success(result.message ?? "Saved");
      setPhoto([]);
      setResume([]);
      if (onDone) onDone();
      else if (mode === "onboarding") {
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormError message={error} />
      <FormSection title="About you" step="1">
        <Field id="p-name" label="Full name" error={errors.name?.message} required>
          <Input autoComplete="name" {...register("name")} />
        </Field>
        <Field id="p-phone" label="Phone / WhatsApp" error={errors.phone?.message} required={required}>
          <Input type="tel" autoComplete="tel" {...register("phone")} />
        </Field>
        <Field id="p-location" label="City / location" error={errors.location?.message}>
          <Input autoComplete="address-level2" {...register("location")} />
        </Field>
        {mode === "profile" && (
          <div className="flex items-center gap-4 sm:col-span-2">
            <Avatar name={user.name} src={user.profileImage} size={64} />
            <div className="min-w-0 flex-1">
              <FileUploader
                id="p-photo"
                label="Upload a new photo"
                pathPrefix={`users/${user.id}/profile/`}
                accept={["image/png", "image/jpeg", "image/webp"]}
                maxBytes={2 * 1024 * 1024}
                value={photo}
                onChange={setPhoto}
              />
            </div>
          </div>
        )}
        <Field id="p-bio" label="Short bio" error={errors.bio?.message} className="sm:col-span-2">
          <Textarea rows={3} {...register("bio")} placeholder="What are you learning or building?" />
        </Field>
      </FormSection>

      <FormSection title="Academics" step="2">
        <Field id="p-college" label="College / institute" error={errors.college?.message} required={required}>
          <Input autoComplete="organization" {...register("college")} />
        </Field>
        <Field id="p-degree" label="Degree" error={errors.degree?.message} required={required}>
          <Select {...register("degree")}>
            <option value="">Select…</option>
            {DEGREES.map((d) => (
              <option key={d} value={d}>
                {label(d)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="p-branch" label="Branch" error={errors.branch?.message} required={required}>
          <Input {...register("branch")} placeholder="e.g. Computer Engineering" />
        </Field>
        <Field id="p-year" label="Academic year" error={errors.year?.message} required={required}>
          <Select {...register("year")}>
            <option value="">Select…</option>
            {ACADEMIC_YEARS.map((y) => (
              <option key={y} value={y}>
                {label(y)}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Skills & links" step="3">
        <Field id="p-skills" label="Skills" error={errors.skills?.message} className="sm:col-span-2">
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <TagInput value={field.value ?? []} onChange={field.onChange} suggestions={SKILL_SUGGESTIONS} max={25} />
            )}
          />
        </Field>
        <Field id="p-github" label="GitHub" error={errors.github?.message}>
          <Input type="url" placeholder="https://github.com/you" {...register("github")} />
        </Field>
        <Field id="p-linkedin" label="LinkedIn" error={errors.linkedin?.message}>
          <Input type="url" placeholder="https://linkedin.com/in/you" {...register("linkedin")} />
        </Field>
        <Field id="p-portfolio" label="Portfolio" error={errors.portfolio?.message}>
          <Input type="url" placeholder="https://" {...register("portfolio")} />
        </Field>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-semibold">Resume</span>
          {user.resumeUrl && (
            <a href={user.resumeUrl} target="_blank" rel="noreferrer" className="text-sm underline">
              View current resume
            </a>
          )}
          <FileUploader
            id="p-resume"
            label={user.resumeUrl ? "Replace resume" : "Upload resume"}
            pathPrefix={`users/${user.id}/resume/`}
            accept={[
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]}
            maxBytes={5 * 1024 * 1024}
            value={resume}
            onChange={setResume}
          />
        </div>
      </FormSection>

      <Button type="submit" size="lg" loading={isSubmitting} className="self-start">
        {mode === "onboarding" ? "Finish setup" : "Save profile"}
      </Button>
    </form>
  );
}
