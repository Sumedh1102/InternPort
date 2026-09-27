import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { PageHeader } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState } from "@/components/ui/feedback";
import { cn, formatDateTime } from "@/lib/utils";
import { markAllNotificationsRead } from "@/server/actions/account";
import { requireRole } from "@/server/auth/session";
import { getNotifications } from "@/server/queries/platform";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await requireRole(["STUDENT"]);
  const notifications = await getNotifications(session.uid, 100);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        actions={
          unread > 0 ? (
            <ActionButton action={markAllNotificationsRead} variant="outline" size="sm">
              <CheckCheck aria-hidden /> Mark all read
            </ActionButton>
          ) : undefined
        }
      />
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell />} title="No notifications yet" />
      ) : (
        <ul className="overflow-hidden rounded-card border-2 border-ink bg-paper shadow-brutal-sm">
          {notifications.map((n) => {
            const body = (
              <>
                <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", n.read ? "bg-ink/15" : "bg-pink")} aria-label={n.read ? "Read" : "Unread"} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{n.title}</span>
                  <span className="block text-sm text-ink-2">{n.body}</span>
                  <span className="block font-mono text-xs text-muted">{formatDateTime(n.createdAt)}</span>
                </span>
              </>
            );
            return (
              <li key={n.id} className="border-b-2 border-ink/10 last:border-0">
                {n.link ? (
                  <Link href={n.link} className={cn("flex gap-3 px-5 py-4 transition hover:bg-lime-soft", !n.read && "bg-cream")}>
                    {body}
                  </Link>
                ) : (
                  <div className={cn("flex gap-3 px-5 py-4", !n.read && "bg-cream")}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
