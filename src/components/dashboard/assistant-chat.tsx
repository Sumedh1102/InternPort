"use client";

import * as React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Bot, Eraser, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { AI_INTENTS } from "@/lib/domain/schemas";
import { cn } from "@/lib/utils";

type Intent = (typeof AI_INTENTS)[number];

const INTENTS: { value: Intent; label: string; starter: string }[] = [
  { value: "EXPLAIN_CONCEPT", label: "Explain a concept", starter: "Can you explain " },
  { value: "EXPLAIN_CODE", label: "Explain this code", starter: "What does this code do?\n\n```\n\n```" },
  { value: "DEBUG_ERROR", label: "Understand an error", starter: "I'm getting this error:\n\n```\n\n```" },
  { value: "HINT", label: "Give me a hint", starter: "I'm stuck on " },
  { value: "WHAT_NEXT", label: "What should I learn next?", starter: "Based on my progress, what should I learn next?" },
  { value: "EXPLAIN_ASSIGNMENT", label: "Explain my assignment", starter: "Can you help me understand what this assignment is asking?" },
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Option {
  id: string;
  title: string;
}

export function AssistantChat({
  lessons,
  assignments,
  initialLessonId,
  initialAssignmentId,
  firstName,
}: {
  lessons: Option[];
  assignments: Option[];
  initialLessonId?: string;
  initialAssignmentId?: string;
  firstName: string;
}) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [intent, setIntent] = React.useState<Intent>(initialAssignmentId ? "EXPLAIN_ASSIGNMENT" : "GENERAL" as Intent);
  const [lessonId, setLessonId] = React.useState(initialLessonId ?? "");
  const [assignmentId, setAssignmentId] = React.useState(initialAssignmentId ?? "");
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [remaining, setRemaining] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setError(null);
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, lessonId, assignmentId, messages: history.slice(-12) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "The assistant is unavailable right now.");
      }
      setRemaining(res.headers.get("X-AI-Remaining"));
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setMessages((list) => {
          const copy = [...list];
          const last = copy[copy.length - 1]!;
          copy[copy.length - 1] = { ...last, content: last.content + value };
          return copy;
        });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setMessages((list) => (list.at(-1)?.content ? list : list.slice(0, -1)));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="flex min-h-[60dvh] min-w-0 flex-col overflow-hidden rounded-card border-2 border-ink bg-paper shadow-brutal" aria-label="Chat with the AI assistant">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
              <span className="grid size-16 place-items-center rounded-2xl border-2 border-ink bg-lime shadow-brutal-sm">
                <Bot className="size-8" aria-hidden />
              </span>
              <h2 className="font-display text-2xl font-extrabold">Hi {firstName}, what are we learning today?</h2>
              <p className="max-w-md text-sm text-muted">
                I know your program, current module and assignments. I&apos;ll explain and give hints — you do the building.
              </p>
              <div className="flex max-w-xl flex-wrap justify-center gap-2">
                {INTENTS.map((i) => (
                  <button
                    key={i.value}
                    type="button"
                    onClick={() => {
                      setIntent(i.value);
                      setInput(i.starter);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border-2 border-ink bg-cream px-3 py-1.5 text-sm font-semibold transition hover:bg-lime"
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl border-2 border-ink px-4 py-3 text-sm sm:max-w-[80%]",
                    m.role === "user" ? "rounded-br-sm bg-pink-soft" : "rounded-bl-sm bg-cream",
                  )}
                >
                  {m.role === "assistant" ? (
                    m.content ? (
                      <div className="prose-brutal text-sm [&_pre]:text-xs">
                        <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                      </div>
                    ) : (
                      <span className="inline-flex gap-1" aria-label="Thinking">
                        <span className="size-2 animate-bounce rounded-full bg-ink" />
                        <span className="size-2 animate-bounce rounded-full bg-ink [animation-delay:0.15s]" />
                        <span className="size-2 animate-bounce rounded-full bg-ink [animation-delay:0.3s]" />
                      </span>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
        {error && (
          <p role="alert" className="border-t-2 border-ink bg-red-soft px-4 py-2 text-sm font-semibold">
            {error}
          </p>
        )}
        <form
          className="flex items-end gap-2 border-t-2 border-ink bg-cream-2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <label htmlFor="ai-input" className="sr-only">
            Your question
          </label>
          <textarea
            ref={inputRef}
            id="ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={Math.min(8, Math.max(1, input.split("\n").length))}
            maxLength={6000}
            placeholder="Ask about a concept, paste code or an error…"
            className="min-h-11 flex-1 resize-none rounded-2xl border-2 border-ink bg-paper px-4 py-2.5 text-sm outline-none focus-visible:shadow-brutal-sm"
          />
          {streaming ? (
            <Button type="button" size="icon" variant="dark" onClick={() => abortRef.current?.abort()} aria-label="Stop">
              <Square aria-hidden />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
              <ArrowUp aria-hidden />
            </Button>
          )}
        </form>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="rounded-card border-2 border-ink bg-paper p-4 shadow-brutal-sm">
          <h2 className="font-display text-lg font-extrabold">Focus</h2>
          <p className="mb-3 text-xs text-muted">Give the assistant extra context.</p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Mode
              <Select value={intent} onChange={(e) => setIntent(e.target.value as Intent)}>
                <option value="GENERAL">General question</option>
                {INTENTS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Lesson
              <Select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
                <option value="">None</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Assignment
              <Select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}>
                <option value="">None</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>
        <div className="rounded-card border-2 border-ink bg-lime-soft p-4 text-xs">
          <p className="font-semibold">How the assistant helps</p>
          <p className="mt-1 text-ink-2">
            It explains and hints rather than writing graded work for you. Check important facts with your mentor.
          </p>
          {remaining !== null && <p className="mt-2 font-mono">{remaining} questions left today</p>}
          {messages.length > 0 && (
            <button type="button" onClick={() => setMessages([])} className="mt-3 inline-flex items-center gap-1 font-semibold underline" disabled={streaming}>
              <Eraser className="size-3.5" aria-hidden /> New conversation
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
