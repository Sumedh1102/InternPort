"use client";

import { ErrorView } from "@/components/ui/error-view";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-10">
      <ErrorView error={error} reset={reset} homeHref="/dashboard" />
    </div>
  );
}
