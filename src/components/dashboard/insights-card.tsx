"use client";

import * as React from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { AIInsights } from "@/lib/domain/types";
import { cn, relativeTime } from "@/lib/utils";
import { generateProgressInsights } from "@/server/actions/ai";

/** AI progress insights — generated from the student's real records on demand. */
export function InsightsCard({ initial, className }: { initial: AIInsights | null; className?: string }) {
  const [insights, setInsights] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();

  const load = (force: boolean) =>
    startTransition(async () => {
      const result = await generateProgressInsights(force);
      if (result.ok) setInsights(result.data);
      else toast.error(result.error);
    });

  return (
    <section
      className={cn("flex flex-col rounded-card border-2 border-ink bg-cyan-soft shadow-brutal-sm", className)}
      aria-live="polite"
      aria-busy={pending}
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink/15 px-5 py-3.5">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <Sparkles className="size-5" aria-hidden /> Progress insights
        </h2>
        {insights && (
          <Button variant="ghost" size="sm" onClick={() => load(true)} loading={pending} aria-label="Refresh insights">
            {!pending && <RefreshCw aria-hidden />} Refresh
          </Button>
        )}
      </div>
      <div className="flex-1 p-5">
        {insights ? (
          <div className="flex flex-col gap-3">
            <p className="font-semibold">{insights.summary}</p>
            <ul className="flex flex-col gap-2">
              {insights.recommendations.map((r) => (
                <li key={r} className="flex gap-2 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rotate-45 border border-ink bg-lime" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
            <p className="font-mono text-[0.68rem] text-muted">
              {insights.source === "ai" ? "AI-generated" : "Rule-based"} from your recorded progress · {relativeTime(insights.generatedAt)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm">
              Get personalised recommendations based on your lessons, assignments, attendance, project and scores.
            </p>
            <Button onClick={() => load(false)} loading={pending} variant="dark" size="sm">
              <Sparkles aria-hidden /> Generate insights
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
