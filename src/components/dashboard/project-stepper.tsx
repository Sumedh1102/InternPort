import { Check } from "lucide-react";

import { PROJECT_STATUSES, label, type ProjectStatus } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";

/** Assigned → In progress → Submitted → Reviewed → Evaluated → Completed. */
export function ProjectStepper({ status }: { status: ProjectStatus }) {
  const current = PROJECT_STATUSES.indexOf(status);
  return (
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Project progress">
      {PROJECT_STATUSES.map((s, i) => {
        const done = i < current || status === "COMPLETED";
        const active = i === current && status !== "COMPLETED";
        return (
          <li
            key={s}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 px-2 py-1.5 text-xs font-semibold",
              done ? "border-ink bg-lime" : active ? "border-ink bg-amber-soft" : "border-ink/20 bg-cream text-muted",
            )}
          >
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2 border-ink text-[0.6rem]", done ? "bg-ink text-lime" : "bg-paper text-ink")}>
              {done ? <Check className="size-3" aria-hidden /> : i + 1}
            </span>
            <span className="truncate">{label(s)}</span>
          </li>
        );
      })}
    </ol>
  );
}
