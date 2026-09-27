"use client";

import * as React from "react";
import { Switch as S } from "radix-ui";

import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-ink bg-cream-2 transition data-[state=checked]:bg-lime disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-5 translate-x-0.5 rounded-full border-2 border-ink bg-paper transition-transform data-[state=checked]:translate-x-[1.35rem]" />
    </S.Root>
  );
}

export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border-2 border-ink bg-paper p-3">
      <div>
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
