"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, UserPlus } from "lucide-react";
import type { z } from "zod";

import { applyServerErrors, errorAt } from "@/components/forms/form-utils";
import { FormDialog } from "@/components/staff/form-dialog";
import { Button } from "@/components/ui/button";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Field, FormError, FormSection } from "@/components/ui/field";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { SwitchField } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { PRICING_TIERS, label, type PricingTier } from "@/lib/domain/enums";
import { settingsSchema, teamMemberSchema } from "@/lib/domain/schemas";
import { storageFileUrl, UPLOAD_POLICIES } from "@/lib/domain/storage";
import type { PaymentQrCode, PlatformSettings, TeamMember } from "@/lib/domain/types";
import { saveSettings, saveTeamMember } from "@/server/actions/admin";

type SettingsValues = z.input<typeof settingsSchema>;

function qrDefaults(qr: PaymentQrCode | null | undefined) {
  return { path: qr?.path ?? "", amount: qr?.amount ?? undefined };
}

/** Upload slot and amount for one pricing tier's payment QR code. */
function PaymentQrField({
  tier,
  saved,
  control,
  register,
  error,
}: {
  tier: PricingTier;
  saved: PaymentQrCode | null | undefined;
  control: Control<SettingsValues>;
  register: UseFormRegister<SettingsValues>;
  error: (path: string) => string | undefined;
}) {
  const id = `st-qr-${tier.toLowerCase()}`;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-ink/20 p-4">
      <p className="font-display font-extrabold">{label(tier)} QR code</p>
      <Controller
        control={control}
        name={`payment.qrCodes.${tier}.path`}
        render={({ field }) => {
          const path = field.value ?? "";
          const isSaved = Boolean(saved && path === saved.path);
          const value: UploadedFile[] = !path
            ? []
            : isSaved && saved
              ? [{ path, name: saved.name, size: saved.size, contentType: saved.contentType, url: saved.url }]
              : [{ path, name: path.split("/").pop() ?? "QR code", size: 0, contentType: "" }];
          return (
            <div className="flex items-start gap-4">
              {path && (
                // eslint-disable-next-line @next/next/no-img-element -- uploads are served through /api/files
                <img
                  src={isSaved && saved ? saved.url : storageFileUrl(path)}
                  alt={`${label(tier)} payment QR code`}
                  className="size-24 shrink-0 rounded-xl border-2 border-ink bg-white p-1"
                />
              )}
              <div className="min-w-0 flex-1">
                <FileUploader
                  id={id}
                  label="Upload QR code image"
                  pathPrefix="internship-documents/settings/payment-qr/"
                  accept={UPLOAD_POLICIES.paymentQr.types}
                  maxBytes={UPLOAD_POLICIES.paymentQr.maxBytes}
                  value={value}
                  onChange={(files) => field.onChange(files[0]?.path ?? "")}
                />
              </div>
            </div>
          );
        }}
      />
      <Field id={`${id}-amount`} label="Amount (₹)" hint="Shown as “Scan to pay ₹…”" error={error(`payment.qrCodes.${tier}.amount`)}>
        <Input
          type="number"
          min={1}
          {...register(`payment.qrCodes.${tier}.amount`, { setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)) })}
        />
      </Field>
    </div>
  );
}

export function SettingsForm({ settings, aiConfigured }: { settings: PlatformSettings; aiConfigured: boolean }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      applicationsOpen: settings.applicationsOpen,
      earlyBird: { enabled: settings.earlyBird.enabled, limit: settings.earlyBird.limit, showRemaining: settings.earlyBird.showRemaining },
      payment: {
        instructions: settings.payment.instructions,
        payeeName: settings.payment.payeeName ?? "",
        upiId: settings.payment.upiId ?? "",
        bankDetails: settings.payment.bankDetails ?? "",
        supportContact: settings.payment.supportContact ?? "",
        qrCodes: {
          EARLY_BIRD: qrDefaults(settings.payment.qrCodes?.EARLY_BIRD),
          REGULAR: qrDefaults(settings.payment.qrCodes?.REGULAR),
        },
      },
      contact: {
        email: settings.contact.email ?? "",
        phone: settings.contact.phone ?? "",
        whatsapp: settings.contact.whatsapp ?? "",
        address: settings.contact.address ?? "",
        hours: settings.contact.hours ?? "",
        linkedin: settings.contact.linkedin ?? "",
        instagram: settings.contact.instagram ?? "",
      },
      certificate: {
        minLessonPercent: settings.certificate.minLessonPercent,
        minAssignmentPercent: settings.certificate.minAssignmentPercent,
        minAttendancePercent: settings.certificate.minAttendancePercent,
        requireProjectCompleted: settings.certificate.requireProjectCompleted,
        signatoryName: settings.certificate.signatoryName ?? "",
        signatoryTitle: settings.certificate.signatoryTitle ?? "",
      },
      ai: { enabled: settings.ai.enabled, dailyLimit: settings.ai.dailyLimit },
    },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const e = (path: string) => errorAt(errors, path);

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        const result = await saveSettings(values);
        if (result.ok) {
          toast.success(result.message ?? "Saved");
          router.refresh();
        } else {
          setError(result.error);
          applyServerErrors(form, result);
        }
      })}
    >
      <FormError message={error} />
      <FormSection title="Applications & early bird" step="1">
        <Controller control={control} name="applicationsOpen" render={({ field }) => <SwitchField id="st-open" label="Accept new applications" checked={field.value} onCheckedChange={field.onChange} />} />
        <Controller control={control} name="earlyBird.enabled" render={({ field }) => <SwitchField id="st-eb" label="Early-bird pricing enabled" checked={field.value} onCheckedChange={field.onChange} />} />
        <Field id="st-eb-limit" label="Early-bird seats" hint={`${settings.earlyBird.claimed} claimed so far`} error={e("earlyBird.limit")}>
          <Input type="number" min={0} {...register("earlyBird.limit", { valueAsNumber: true })} />
        </Field>
        <Controller
          control={control}
          name="earlyBird.showRemaining"
          render={({ field }) => <SwitchField id="st-eb-show" label="Show seats remaining publicly" description="Displays the live count on the homepage" checked={field.value} onCheckedChange={field.onChange} />}
        />
      </FormSection>

      <FormSection title="Manual payment instructions" step="2" description="Shown to approved students. Never ask students for card details, OTPs or passwords.">
        <Field id="st-pay-instr" label="Instructions" error={e("payment.instructions")} required className="sm:col-span-2">
          <Textarea rows={4} {...register("payment.instructions")} />
        </Field>
        <Field id="st-payee" label="Payee name" error={e("payment.payeeName")}>
          <Input {...register("payment.payeeName")} />
        </Field>
        <Field id="st-upi" label="UPI ID" error={e("payment.upiId")}>
          <Input {...register("payment.upiId")} />
        </Field>
        <Field id="st-bank" label="Bank transfer details" error={e("payment.bankDetails")} className="sm:col-span-2">
          <Textarea rows={3} {...register("payment.bankDetails")} />
        </Field>
        <Field id="st-paycontact" label="Payment support contact" error={e("payment.supportContact")} className="sm:col-span-2">
          <Input {...register("payment.supportContact")} />
        </Field>
        <p className="text-sm text-muted sm:col-span-2">
          Payment QR codes: each student sees the one for their pricing tier. PNG, JPEG or WebP up to 2 MB.
        </p>
        {PRICING_TIERS.map((tier) => (
          <PaymentQrField key={tier} tier={tier} saved={settings.payment.qrCodes?.[tier]} control={control} register={register} error={e} />
        ))}
      </FormSection>

      <FormSection title="Public contact details" step="3" description="Shown on the Contact page, footer and student support page.">
        <Field id="st-email" label="Email" error={e("contact.email")}>
          <Input type="email" {...register("contact.email")} />
        </Field>
        <Field id="st-phone" label="Phone" error={e("contact.phone")}>
          <Input {...register("contact.phone")} />
        </Field>
        <Field id="st-wa" label="WhatsApp" error={e("contact.whatsapp")}>
          <Input {...register("contact.whatsapp")} />
        </Field>
        <Field id="st-hours" label="Hours" error={e("contact.hours")}>
          <Input {...register("contact.hours")} />
        </Field>
        <Field id="st-address" label="Address" error={e("contact.address")} className="sm:col-span-2">
          <Textarea rows={2} {...register("contact.address")} />
        </Field>
        <Field id="st-li" label="LinkedIn URL" error={e("contact.linkedin")}>
          <Input type="url" {...register("contact.linkedin")} />
        </Field>
        <Field id="st-ig" label="Instagram URL" error={e("contact.instagram")}>
          <Input type="url" {...register("contact.instagram")} />
        </Field>
      </FormSection>

      <FormSection title="Certificate criteria" step="4">
        <Field id="st-c-lessons" label="Min. lessons completed (%)" error={e("certificate.minLessonPercent")}>
          <Input type="number" min={0} max={100} {...register("certificate.minLessonPercent", { valueAsNumber: true })} />
        </Field>
        <Field id="st-c-assign" label="Min. assignments approved (%)" error={e("certificate.minAssignmentPercent")}>
          <Input type="number" min={0} max={100} {...register("certificate.minAssignmentPercent", { valueAsNumber: true })} />
        </Field>
        <Field id="st-c-att" label="Min. attendance (%)" error={e("certificate.minAttendancePercent")}>
          <Input type="number" min={0} max={100} {...register("certificate.minAttendancePercent", { valueAsNumber: true })} />
        </Field>
        <Controller
          control={control}
          name="certificate.requireProjectCompleted"
          render={({ field }) => <SwitchField id="st-c-proj" label="Require completed project" checked={field.value} onCheckedChange={field.onChange} />}
        />
        <Field id="st-c-sig" label="Signatory name" error={e("certificate.signatoryName")}>
          <Input {...register("certificate.signatoryName")} />
        </Field>
        <Field id="st-c-sigt" label="Signatory title" error={e("certificate.signatoryTitle")}>
          <Input {...register("certificate.signatoryTitle")} />
        </Field>
      </FormSection>

      <FormSection title="AI features" step="5" description={aiConfigured ? "An AI provider is configured on the server." : "No AI provider is configured (set AI_PROVIDER and an API key on the server)."}>
        <Controller control={control} name="ai.enabled" render={({ field }) => <SwitchField id="st-ai" label="Enable AI assistant & insights" checked={field.value} onCheckedChange={field.onChange} />} />
        <Field id="st-ai-limit" label="Daily questions per student" error={e("ai.dailyLimit")}>
          <Input type="number" min={0} max={500} {...register("ai.dailyLimit", { valueAsNumber: true })} />
        </Field>
      </FormSection>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" loading={isSubmitting} className="shadow-brutal">
          Save settings
        </Button>
      </div>
    </form>
  );
}

type TeamValues = z.input<typeof teamMemberSchema>;

function TeamForm({ member, onDone }: { member?: TeamMember; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<TeamValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: member?.name ?? "",
      role: member?.role ?? "",
      bio: member?.bio ?? "",
      photoUrl: member?.photoUrl ?? "",
      linkedin: member?.linkedin ?? "",
      github: member?.github ?? "",
      order: member?.order ?? 0,
      visible: member?.visible ?? true,
    },
  });
  const { register, handleSubmit, formState } = form;
  const { errors, isSubmitting } = formState;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        const result = await saveTeamMember(member?.id ?? null, values);
        if (result.ok) {
          toast.success(result.message ?? "Saved");
          onDone();
          router.refresh();
        } else {
          setError(result.error);
          applyServerErrors(form, result);
        }
      })}
    >
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tm-name" label="Name" error={errors.name?.message} required>
          <Input {...register("name")} />
        </Field>
        <Field id="tm-role" label="Role / title" error={errors.role?.message} required>
          <Input {...register("role")} />
        </Field>
        <Field id="tm-bio" label="Short bio" error={errors.bio?.message} className="sm:col-span-2">
          <Textarea rows={3} {...register("bio")} />
        </Field>
        <Field id="tm-photo" label="Photo URL" error={errors.photoUrl?.message}>
          <Input type="url" {...register("photoUrl")} />
        </Field>
        <Field id="tm-order" label="Order" error={errors.order?.message}>
          <Input type="number" min={0} {...register("order", { valueAsNumber: true })} />
        </Field>
        <Field id="tm-li" label="LinkedIn" error={errors.linkedin?.message}>
          <Input type="url" {...register("linkedin")} />
        </Field>
        <Field id="tm-gh" label="GitHub" error={errors.github?.message}>
          <Input type="url" {...register("github")} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="tm-visible">
        <Checkbox id="tm-visible" {...register("visible")} /> Show on the public Team page
      </label>
      <Button type="submit" loading={isSubmitting} className="self-start">
        Save
      </Button>
    </form>
  );
}

export function TeamMemberDialog({ member }: { member?: TeamMember }) {
  return (
    <FormDialog
      wide
      title={member ? `Edit ${member.name}` : "Add team member"}
      trigger={
        member ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${member.name}`}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <UserPlus aria-hidden /> Add member
          </Button>
        )
      }
    >
      {(close) => <TeamForm member={member} onDone={close} />}
    </FormDialog>
  );
}
