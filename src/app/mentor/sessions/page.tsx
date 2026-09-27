import Link from "next/link";
import { BellRing, CalendarCheck } from "lucide-react";

import { PageHeader } from "@/components/dashboard/ui";
import { SessionFormDialog } from "@/components/staff/session-forms";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SESSION_STATUSES, label } from "@/lib/domain/enums";
import { formatDateTime } from "@/lib/utils";
import { sendSessionReminder } from "@/server/actions/sessions";
import { requireRole } from "@/server/auth/session";
import { getSessionsForBatches } from "@/server/queries/platform";
import { getMentorContext } from "@/server/queries/mentor";

export const metadata = { title: "Sessions" };

export default async function MentorSessionsPage() {
  const session = await requireRole(["MENTOR"]);
  const ctx = await getMentorContext(session.uid);
  const sessions = (await getSessionsForBatches(ctx.batchIds)).reverse();
  const batches = ctx.batches.map((b) => ({ id: b.id, name: `${b.name} · ${b.programName}`, programId: b.programId }));
  const now = Date.now();
  return (
    <>
      <PageHeader title="Sessions" description="Schedule live classes, workshops and doubt sessions. Students are notified automatically." actions={<SessionFormDialog batches={batches} />} />
      <DataTable
        caption="Sessions"
        filters={[{ key: "status", label: "Status", options: SESSION_STATUSES.map((s) => ({ value: s, label: label(s) })) }]}
        columns={[
          { key: "title", header: "Session", sortable: true },
          { key: "when", header: "When", sortable: true },
          { key: "batch", header: "Batch", hideOnMobile: true },
          { key: "status", header: "Status" },
          { key: "actions", header: "" },
        ]}
        emptyTitle="No sessions yet"
        emptyDescription="Schedule your first session for a batch."
        rows={sessions.map((s) => {
          const started = new Date(s.startAt).getTime() <= now + 3600e3;
          return {
            id: s.id,
            search: `${s.title} ${s.batchName}`,
            filters: { status: s.status },
            sort: { title: s.title, when: s.startAt },
            cells: {
              title: (
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs text-muted">
                    {label(s.type)} · {s.durationMinutes} min
                  </p>
                </div>
              ),
              when: formatDateTime(s.startAt),
              batch: s.batchName,
              status: <StatusBadge status={s.status} />,
              actions: (
                <div className="flex flex-wrap items-center gap-1">
                  {s.status !== "CANCELLED" && started && (
                    <Link href={`/mentor/attendance?session=${s.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      <CalendarCheck aria-hidden /> Attendance
                    </Link>
                  )}
                  {s.status === "SCHEDULED" && !started && (
                    <ActionButton action={sendSessionReminder.bind(null, s.id)} size="sm" variant="outline">
                      <BellRing aria-hidden /> Remind
                    </ActionButton>
                  )}
                  <SessionFormDialog session={s} batches={batches} />
                </div>
              ),
            },
          };
        })}
      />
    </>
  );
}
