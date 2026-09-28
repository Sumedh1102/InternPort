"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: readonly string[];
  max?: number;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
}

/** Explicit props win; otherwise inherit the enclosing Field's label/aria wiring. */
function useControlProps(own: { id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string; "aria-required"?: boolean }) {
  const field = useFieldControl();
  return {
    id: own.id ?? field?.id,
    "aria-invalid": own["aria-invalid"] ?? field?.["aria-invalid"],
    "aria-describedby": own["aria-describedby"] ?? field?.["aria-describedby"],
    "aria-required": own["aria-required"] ?? field?.["aria-required"],
  };
}

/** Chip input: Enter or comma adds, Backspace on empty removes the last chip. */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  suggestions = [],
  max = 20,
  ...own
}: TagInputProps) {
  const { id, ...aria } = useControlProps(own);
  const [draft, setDraft] = React.useState("");

  function add(raw: string) {
    const tag = raw.trim().replace(/,$/, "").slice(0, 40);
    if (!tag || value.length >= max) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
    setDraft("");
  }

  const open = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-2xl border-2 border-ink bg-paper px-2 py-1.5 shadow-brutal-xs focus-within:shadow-brutal-sm",
          aria["aria-invalid"] && "border-red",
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-lime px-2.5 py-0.5 text-xs font-semibold"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="rounded-full hover:bg-ink hover:text-lime"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none"
          {...aria}
        />
      </div>
      {open.length > 0 && value.length < max && (
        <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
          {open.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border-2 border-dashed border-ink/50 px-2.5 py-0.5 text-xs font-medium text-muted transition hover:border-ink hover:bg-lime-soft hover:text-ink"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Edits a string[] as one item per line. */
export function LinesInput({
  value,
  onChange,
  rows = 4,
  placeholder,
  ...own
}: {
  id?: string;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  rows?: number;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
}) {
  const { id, ...aria } = useControlProps(own);
  const [text, setText] = React.useState((value ?? []).join("\n"));
  return (
    <textarea
      id={id}
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
      className="w-full rounded-2xl border-2 border-ink bg-paper px-4 py-3 text-[0.95rem] leading-relaxed shadow-brutal-xs outline-none focus-visible:shadow-brutal-sm aria-[invalid=true]:border-red"
      {...aria}
    />
  );
}
