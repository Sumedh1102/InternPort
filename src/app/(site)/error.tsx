"use client";

import { ErrorView } from "@/components/ui/error-view";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 py-20">
      <ErrorView error={error} reset={reset} />
    </div>
  );
}
