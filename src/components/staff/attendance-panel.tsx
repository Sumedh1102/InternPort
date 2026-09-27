import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import type { AttendanceRecord, Enrollment, Session } from "@/lib/domain/types";
import { cn, formatDateTime } from "@/lib/utils";
import { AttendanceMarker } from "./session-forms";

/** Session picker + roster marker. Shared by the mentor and admin attendance pages. */
export function AttendancePanel({
  basePath,
  sessions,
  selected,
  enrollments,
  records,
}: {
  basePath: string;
  sessions: Session[];
  selected: Session | null;
  enrollments: Enrollment[];
  records: AttendanceRecord[];
}) {
  const now = Date.now();
  const markable = sessions
    .filter((s) => s.status !== "CANCELLED" && new Date(s.startAt).getTime() <= now + 3600e3)
    .sort((a, b) => b.startAt.localeCompare(a.startAt));

  if (!markable.length) {
    return (
      <EmptyState
        icon={<CalendarCheck />}
        title="No sessions to mark yet"
        description="Attendance opens an hour before a scheduled session starts."
      />
    );
  }

  const roster = selected
    ? enrollments
        .filter((e) => e.batchId === selected.batchId && (e.status === "ACTIVE" || e.status === "COMPLETED"))
        .map((e) => ({
          uid: e.uid,
          name: e.studentName,
          status: records.find((r) => r.uid === e.uid)?.status,
        }))
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <nav aria-label="Sessions" className="flex flex-col gap-2">
        {markable.map((s) => (
          <Link
            key={s.id}
            href={`${basePath}?session=${s.id}`}
            aria-current={selected?.id === s.id ? "page" : undefined}
            className={cn(
              "flex flex-col gap-1 rounded-2xl border-2 px-4 py-3 transition hover:border-ink",
              selected?.id === s.id ? "border-ink bg-lime shadow-brutal-xs" : "border-ink/20 bg-paper",
            )}
          >
            <span className="font-semibold">{s.title}</span>
            <span className="text-xs">
              {s.batchName} · {formatDateTime(s.startAt)}
            </span>
            <StatusBadge status={s.status} />
          </Link>
        ))}
      </nav>
      <section className="min-w-0">
        {selected ? (
          roster.length ? (
            <>
              <h2 className="mb-1 font-display text-2xl font-extrabold">{selected.title}</h2>
              <p className="mb-4 text-sm text-muted">
                {selected.batchName} · {formatDateTime(selected.startAt)} · {roster.length} students
              </p>
              <AttendanceMarker sessionId={selected.id} roster={roster} />
            </>
          ) : (
            <EmptyState title="No active students in this batch" />
          )
        ) : (
          <EmptyState title="Pick a session" description="Choose a session on the left to mark attendance." />
        )}
      </section>
    </div>
  );
}
