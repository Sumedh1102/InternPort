"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { supportSchema } from "@/lib/domain/schemas";
import { submitSupport } from "@/server/actions/account";
import { applyServerErrors } from "./form-utils";

export function SupportForm() {
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof supportSchema>>({
    resolver: zodResolver(supportSchema),
    defaultValues: { subject: "", message: "" },
  });
  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await submitSupport(values);
    if (result.ok) {
      toast.success(result.message ?? "Sent");
      form.reset();
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <Field id="sup-subject" label="Subject" error={form.formState.errors.subject?.message} required>
        <Input {...form.register("subject")} />
      </Field>
      <Field id="sup-message" label="How can we help?" error={form.formState.errors.message?.message} required>
        <Textarea rows={5} {...form.register("message")} />
      </Field>
      <Button type="submit" loading={form.formState.isSubmitting} className="self-start">
        Send to support
      </Button>
    </form>
  );
}
