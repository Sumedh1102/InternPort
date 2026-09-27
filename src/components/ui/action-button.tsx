"use client";

import * as React from "react";
import { AlertDialog } from "radix-ui";
import { useRouter } from "next/navigation";

import type { ActionResult } from "@/lib/domain/types";
import { Button, type ButtonProps } from "./button";
import { toastResult } from "./toaster";

interface ActionButtonProps extends Omit<ButtonProps, "onClick"> {
  /** A server action (optionally pre-bound with `.bind(null, id)` in a server component). */
  action: () => Promise<ActionResult<unknown>>;
  confirm?: { title: string; description?: string; confirmLabel?: string; danger?: boolean };
  successMessage?: string;
}

/** Runs a server action with a pending state, optional confirmation and a result toast. */
export function ActionButton({ action, confirm, successMessage, children, ...props }: ActionButtonProps) {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const run = () =>
    startTransition(async () => {
      const result = await action();
      if (toastResult(result, successMessage)) router.refresh();
    });

  if (!confirm) {
    return (
      <Button {...props} loading={pending} onClick={run}>
        {children}
      </Button>
    );
  }

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button {...props} loading={pending}>
          {children}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-chunk border-2 border-ink bg-paper p-6 shadow-brutal-lg data-[state=open]:animate-pop">
          <AlertDialog.Title className="font-display text-xl font-extrabold">{confirm.title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted">
            {confirm.description ?? "Are you sure you want to continue?"}
          </AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={confirm.danger ? "danger" : "primary"} size="sm" onClick={run}>
                {confirm.confirmLabel ?? "Confirm"}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
