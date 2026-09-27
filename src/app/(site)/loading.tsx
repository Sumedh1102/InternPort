import { Skeleton } from "@/components/ui/feedback";

export default function SiteLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="mt-6 h-16 w-3/4" />
      <Skeleton className="mt-3 h-6 w-1/2" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-card" />
        ))}
      </div>
    </div>
  );
}
