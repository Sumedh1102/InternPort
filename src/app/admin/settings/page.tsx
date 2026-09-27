import Link from "next/link";
import { Trash2 } from "lucide-react";

import { SettingsForm, TeamMemberDialog } from "@/components/admin/settings-forms";
import { PageHeader } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { cn, formatDateTime } from "@/lib/utils";
import { deleteTeamMember, setMessageHandled } from "@/server/actions/admin";
import { getAIProvider } from "@/server/ai";
import { requireRole } from "@/server/auth/session";
import { listContactMessages, listTeam } from "@/server/queries/platform";
import { getSettings } from "@/server/queries/settings";

export const metadata = { title: "Settings" };

const TABS = [
  { key: "platform", label: "Platform" },
  { key: "team", label: "Team page" },
  { key: "messages", label: "Messages" },
] as const;

export default async function AdminSettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "platform";

  let body: React.ReactNode;
  if (tab === "team") {
    const team = await listTeam();
    body = (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <TeamMemberDialog />
        </div>
        {team.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {team.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 rounded-2xl border-2 border-ink bg-paper p-4">
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-sm text-muted">{m.role}</p>
                  {!m.visible && <Badge tone="muted" className="mt-1">Hidden</Badge>}
                </div>
                <div className="flex gap-1">
                  <TeamMemberDialog member={m} />
                  <ActionButton
                    action={deleteTeamMember.bind(null, m.id)}
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${m.name}`}
                    confirm={{ title: `Remove ${m.name}?`, danger: true, confirmLabel: "Remove" }}
                  >
                    <Trash2 aria-hidden />
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No team members yet" description="Add founders, engineers and mentors to show them on the public Team page." />
        )}
      </div>
    );
  } else if (tab === "messages") {
    const messages = await listContactMessages(200);
    body = messages.length ? (
      <ul className="flex flex-col gap-3">
        {messages.map((m) => (
          <li key={m.id} className={cn("rounded-card border-2 border-ink p-5", m.handled ? "bg-cream" : "bg-paper shadow-brutal-sm")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {m.subject} <Badge tone={m.kind === "SUPPORT" ? "cyan" : "cream"}>{m.kind === "SUPPORT" ? "Student support" : "Contact form"}</Badge>
                </p>
                <p className="text-xs text-muted">
                  {m.name} · <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="underline">{m.email}</a>
                  {m.phone ? ` · ${m.phone}` : ""} · {formatDateTime(m.createdAt)}
                </p>
              </div>
              <ActionButton action={setMessageHandled.bind(null, m.id, !m.handled)} size="sm" variant={m.handled ? "ghost" : "outline"}>
                {m.handled ? "Reopen" : "Mark handled"}
              </ActionButton>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState title="No messages yet" />
    );
  } else {
    const settings = await getSettings();
    body = <SettingsForm settings={settings} aiConfigured={Boolean(getAIProvider())} />;
  }

  return (
    <>
      <PageHeader title="Settings" description="Platform configuration, public team page and incoming messages." />
      <nav aria-label="Settings sections" className="scrollbar-none mb-6 flex gap-1 overflow-x-auto rounded-full border-2 border-ink bg-paper p-1 shadow-brutal-xs sm:w-fit">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/settings?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition", tab === t.key ? "bg-ink text-paper" : "text-muted hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {body}
    </>
  );
}
