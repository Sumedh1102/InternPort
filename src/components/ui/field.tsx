import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "./input";

interface FieldProps {
  id: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}

/**
 * Accessible form field: wires label ↔ control, hint + error via aria-describedby,
 * and marks the control invalid for assistive tech.
 */
export function Field({ id, label, error, hint, required, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
  });
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-0.5 text-pink" aria-hidden>
            *
          </span>
        )}
      </Label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-red">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  step,
}: {
  title: string;
  description?: string;
  step?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-start gap-3">
        {step && (
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime font-mono text-sm font-bold">
            {step}
          </span>
        )}
        <div>
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-2xl border-2 border-ink bg-red-soft px-4 py-3 text-sm font-semibold">
      {message}
    </div>
  );
}
