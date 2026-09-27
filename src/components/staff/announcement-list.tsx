import { Megaphone, Pin, Trash2 } from "lucide-react";

import { MarkdownContent } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { label } from "@/lib/domain/enums";
import type { Announcement } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/utils";
import { deleteAnnouncement } from "@/server/actions/content";
import { AnnouncementFormDialog } from "./announcement-form";
import type { Option } from "./assignment-form";

export function AnnouncementList({
  announcements,
  programs,
  batches,
  canEdit,
  mentorMode,
}: {
  announcements: Announcement[];
  programs: Option[];
  batches: Option[];
  canEdit: (a: Announcement) => boolean;
  mentorMode?: boolean;
}) {
  if (!announcements.length) return <EmptyState icon={<Megaphone />} title="No announcements yet" />;
  const target = (a: Announcement) =>
    a.audience === "PROGRAM"
      ? programs.find((p) => p.id === a.programId)?.name ?? "Program"
      : a.audience === "BATCH"
        ? batches.find((b) => b.id === a.batchId)?.name ?? "Batch"
        : label(a.audience);
  return (
    <ul className="flex flex-col gap-4">
      {announcements.map((a) => (
        <li key={a.id} className={`rounded-card border-2 border-ink p-5 shadow-brutal-sm ${a.pinned ? "bg-pink-soft" : "bg-paper"}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {a.pinned && (
                <Badge tone="pink">
                  <Pin aria-hidden /> Pinned
                </Badge>
              )}
              <Badge tone="cream">{target(a)}</Badge>
              <span className="font-mono text-xs text-muted">
                {a.authorName} · {formatDateTime(a.createdAt)}
              </span>
            </div>
            {canEdit(a) && (
              <div className="flex gap-1">
                <AnnouncementFormDialog announcement={a} programs={programs} batches={batches} mentorMode={mentorMode} />
                <ActionButton
                  action={deleteAnnouncement.bind(null, a.id)}
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${a.title}`}
                  confirm={{ title: "Delete announcement?", danger: true, confirmLabel: "Delete" }}
                >
                  <Trash2 aria-hidden />
                </ActionButton>
              </div>
            )}
          </div>
          <h2 className="mt-2 font-display text-xl font-extrabold">{a.title}</h2>
          <MarkdownContent className="mt-1 text-sm">{a.body}</MarkdownContent>
        </li>
      ))}
    </ul>
  );
}
