"use client";

import { Toaster as Sonner, toast } from "sonner";

import type { ActionResult } from "@/lib/domain/types";

/** Toast — sonner, restyled to the brutalist system. Announced via aria-live. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(92vw,380px)] items-start gap-3 rounded-2xl border-2 border-ink bg-paper p-4 text-sm text-ink shadow-brutal",
          title: "font-semibold",
          description: "text-muted",
          success: "!bg-lime-soft",
          error: "!bg-red-soft",
          closeButton:
            "!left-auto !right-2 !top-2 !border-2 !border-ink !bg-paper hover:!bg-lime",
        },
      }}
    />
  );
}

export { toast };

/** Shows the outcome of a server action. Returns true on success. */
export function toastResult(result: ActionResult<unknown>, fallback = "Saved"): boolean {
  if (result.ok) {
    toast.success(result.message ?? fallback);
    return true;
  }
  toast.error(result.error);
  return false;
}
