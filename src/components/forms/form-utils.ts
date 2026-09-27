"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import type { ActionResult } from "@/lib/domain/types";

/** Pushes server-side Zod field errors back into React Hook Form. */
export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  result: ActionResult<unknown>,
): void {
  if (result.ok || !result.fieldErrors) return;
  let first = true;
  for (const [key, messages] of Object.entries(result.fieldErrors)) {
    if (key === "_form") continue;
    form.setError(key as Path<T>, { type: "server", message: messages[0] }, { shouldFocus: first });
    first = false;
  }
}

/** Reads a (possibly nested, dotted) error message from RHF's errors object. */
export function errorAt(errors: unknown, path: string): string | undefined {
  let node: unknown = errors;
  for (const part of path.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  const message = (node as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message : undefined;
}

/** Converts a <input type="datetime-local"> value (local time) to an ISO string with offset. */
export function localToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** ISO → value for <input type="datetime-local"> in the browser's timezone. */
export function isoToLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO → yyyy-mm-dd (IST calendar day). */
export function isoToDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}
