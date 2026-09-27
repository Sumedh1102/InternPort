"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { QuizQuestion } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { completeLesson } from "@/server/actions/learning";

export function MarkCompleteButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  if (completed) {
    return (
      <span className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-lime px-5 font-semibold">
        <CircleCheck className="size-5" aria-hidden /> Completed
      </span>
    );
  }
  return (
    <Button
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await completeLesson({ lessonId });
          if (result.ok) {
            toast.success("Lesson completed — nice work!");
            router.refresh();
          } else toast.error(result.error);
        })
      }
    >
      <CircleCheck aria-hidden /> Mark as complete
    </Button>
  );
}

/** Quiz — answers are graded on the server against a key the browser never receives. */
export function QuizRunner({
  lessonId,
  questions,
  passPercent,
  completed,
}: {
  lessonId: string;
  questions: QuizQuestion[];
  passPercent: number;
  completed: boolean;
}) {
  const [answers, setAnswers] = React.useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = React.useState<{ passed: boolean; score?: number; correct?: boolean[] } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  const ready = answers.every((a) => a !== null);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await completeLesson({ lessonId, answers: answers as number[] });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          setResult(res.data);
          if (res.data.passed) {
            toast.success(`Passed with ${res.data.score}%!`);
            router.refresh();
          } else {
            toast.error(`You scored ${res.data.score}%. You need ${passPercent}% — review and try again.`);
          }
        });
      }}
    >
      {completed && !result && (
        <p className="rounded-2xl border-2 border-ink bg-lime-soft p-3 text-sm font-semibold">
          You&apos;ve already passed this quiz. You can retake it for practice.
        </p>
      )}
      {questions.map((q, qi) => (
        <fieldset key={q.id} className="rounded-2xl border-2 border-ink bg-paper p-4">
          <legend className="px-1 font-semibold">
            {qi + 1}. {q.question}
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {q.options.map((option, oi) => {
              const checked = answers[qi] === oi;
              const graded = result?.correct?.[qi];
              return (
                <label
                  key={oi}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 text-sm transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue",
                    checked ? "border-ink bg-lime-soft" : "border-ink/20 hover:border-ink",
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={checked}
                    onChange={() => {
                      setResult(null);
                      setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)));
                    }}
                    className="size-4 accent-ink"
                  />
                  {option}
                  {checked && result && (graded ? <CircleCheck className="ml-auto size-4 text-green" aria-label="Correct" /> : <CircleX className="ml-auto size-4 text-red" aria-label="Incorrect" />)}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} disabled={!ready}>
          Submit answers
        </Button>
        <span className="text-sm text-muted">Pass mark: {passPercent}%</span>
        {result?.score !== undefined && (
          <span className={cn("rounded-full border-2 border-ink px-3 py-1 text-sm font-bold", result.passed ? "bg-lime" : "bg-red-soft")} role="status">
            Score: {result.score}%
          </span>
        )}
      </div>
    </form>
  );
}
