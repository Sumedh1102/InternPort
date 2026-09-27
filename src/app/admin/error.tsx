"use client";

import { ErrorView } from "@/components/ui/error-view";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-10">
      <ErrorView error={error} reset={reset} homeHref="/admin" />
    </div>
  );
}
