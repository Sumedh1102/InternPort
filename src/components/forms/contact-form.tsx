"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { contactSchema, type ContactInput } from "@/lib/domain/schemas";
import { submitContact } from "@/server/actions/account";
import { applyServerErrors } from "./form-utils";

export function ContactForm() {
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "", website: "" },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await submitContact(values);
    if (result.ok) {
      setDone(true);
      form.reset();
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });

  if (done) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-card border-2 border-ink bg-lime p-6 shadow-brutal">
        <CircleCheck className="size-8" aria-hidden />
        <h2 className="font-display text-2xl font-extrabold">Message sent!</h2>
        <p>Thanks for reaching out. The Sainam Technology team will get back to you by email.</p>
        <Button variant="outline" size="sm" onClick={() => setDone(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-card border-2 border-ink bg-paper p-5 shadow-brutal sm:p-6">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="contact-name" label="Name" error={errors.name?.message} required>
          <Input autoComplete="name" {...register("name")} />
        </Field>
        <Field id="contact-email" label="Email" error={errors.email?.message} required>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field id="contact-phone" label="Phone / WhatsApp" error={errors.phone?.message} hint="Optional">
          <Input type="tel" autoComplete="tel" {...register("phone")} />
        </Field>
        <Field id="contact-subject" label="Subject" error={errors.subject?.message} required>
          <Input {...register("subject")} />
        </Field>
      </div>
      <Field id="contact-message" label="Message" error={errors.message?.message} required>
        <Textarea rows={6} {...register("message")} />
      </Field>
      {/* Honeypot — hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <Button type="submit" size="lg" loading={isSubmitting} className="self-start">
        Send message <Send aria-hidden />
      </Button>
    </form>
  );
}
