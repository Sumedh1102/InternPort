"use client";

import * as React from "react";

import { Modal, ModalContent, ModalTrigger } from "@/components/ui/dialog";

/** Opens a form in a modal; the form receives `close` to dismiss after a successful save. */
export function FormDialog({
  trigger,
  title,
  description,
  wide,
  defaultOpen,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  wide?: boolean;
  defaultOpen?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>{trigger}</ModalTrigger>
      <ModalContent title={title} description={description} wide={wide}>
        {open && children(() => setOpen(false))}
      </ModalContent>
    </Modal>
  );
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}
