"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button, buttonVariants } from "./button";

/** Shared body for error.tsx boundaries. */
export function ErrorView({
  error,
  reset,
  homeHref = "/",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-chunk border-2 border-ink bg-paper p-8 text-center shadow-brutal">
      <span className="grid size-14 place-items-center rounded-2xl border-2 border-ink bg-amber">
        <TriangleAlert className="size-7" aria-hidden />
      </span>
      <h1 className="font-display text-2xl font-extrabold">Something went wrong</h1>
      <p className="text-sm text-muted">
        We couldn&apos;t load this page. Please try again — if it keeps happening, contact the Sainam team.
      </p>
      {error.digest && <p className="font-mono text-xs text-muted">Ref: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw aria-hidden /> Try again
        </Button>
        <Link href={homeHref} className={buttonVariants({ variant: "outline" })}>
          Go back
        </Link>
      </div>
    </div>
  );
}
