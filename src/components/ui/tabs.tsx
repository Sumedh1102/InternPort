"use client";

import * as React from "react";
import { Tabs as T } from "radix-ui";

import { cn } from "@/lib/utils";

export const Tabs = T.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return (
    <T.List
      className={cn(
        "scrollbar-none flex max-w-full gap-1 overflow-x-auto rounded-full border-2 border-ink bg-paper p-1 shadow-brutal-xs",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold text-muted transition hover:text-ink data-[state=active]:bg-ink data-[state=active]:text-paper",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof T.Content>) {
  return <T.Content className={cn("mt-5 outline-none", className)} {...props} />;
}
