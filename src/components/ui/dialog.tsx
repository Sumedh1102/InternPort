"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/** Modal — Radix Dialog (focus trap, Esc, aria) with the brutalist frame. */
export const Modal = D.Root;
export const ModalTrigger = D.Trigger;
export const ModalClose = D.Close;

export function ModalContent({
  title,
  description,
  children,
  className,
  wide,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-[2px] data-[state=open]:animate-[fade-up_0.2s_ease-out]" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[min(90dvh,860px)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-chunk border-2 border-ink bg-paper shadow-brutal-lg outline-none data-[state=open]:animate-pop",
          wide ? "max-w-3xl" : "max-w-lg",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <D.Title className="font-display text-xl font-extrabold leading-tight">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description>
            )}
          </div>
          <D.Close
            className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-cream transition hover:bg-lime"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

/** Drawer — side sheet used for the mobile dashboard navigation. */
export const Drawer = D.Root;
export const DrawerTrigger = D.Trigger;
export const DrawerClose = D.Close;

export function DrawerContent({
  title,
  children,
  side = "left",
  className,
}: {
  title: string;
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/50" />
      <D.Content
        className={cn(
          "fixed top-0 z-50 flex h-dvh w-[min(86vw,340px)] flex-col border-ink bg-cream outline-none",
          side === "left" ? "left-0 border-r-2" : "right-0 border-l-2",
          className,
        )}
      >
        <D.Title className="sr-only">{title}</D.Title>
        <D.Description className="sr-only">{title}</D.Description>
        {children}
      </D.Content>
    </D.Portal>
  );
}
