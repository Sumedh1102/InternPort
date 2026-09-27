import Link from "next/link";
import { ArrowUpRight, Award, CalendarDays, ExternalLink, QrCode } from "lucide-react";

import { Github, Linkedin } from "@/components/brand/icons";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/feedback";
import { formatINR } from "@/lib/domain/pricing";
import type { Certificate, Program, Project, TeamMember } from "@/lib/domain/types";
import { cn, formatDate } from "@/lib/utils";

const ACCENT_BG = { lime: "bg-lime", pink: "bg-pink", cyan: "bg-cyan", blue: "bg-blue text-paper" } as const;

/** ProgramCard — rendered only from Firestore program documents. */
export function ProgramCard({ program, index = 0 }: { program: Program; index?: number }) {
  const paused = program.status === "PAUSED";
  return (
    <Card interactive className="group flex h-full flex-col overflow-hidden">
      <div className={cn("relative border-b-2 border-ink p-5", ACCENT_BG[program.accent] ?? "bg-lime")}>
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-xs font-bold uppercase tracking-widest">
            {String(index + 1).padStart(2, "0")} / {program.domain}
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper text-ink transition group-hover:rotate-45">
            <ArrowUpRight className="size-5" aria-hidden />
          </span>
        </div>
        <h3 className="mt-6 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
          <Link href={`/internships/${program.slug}`} className="after:absolute after:inset-0">
            {program.name}
          </Link>
        </h3>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-sm text-ink-2">{program.tagline}</p>
        <div className="flex flex-wrap gap-1.5">
          {program.technologies.slice(0, 4).map((t) => (
            <Badge key={t} tone="cream">
              {t}
            </Badge>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t-2 border-dashed border-ink/25 pt-4">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">Early bird from</p>
            <p className="font-display text-xl font-extrabold">
              {formatINR(program.fees.earlyBird)}
              <span className="text-sm font-semibold text-muted">/mo</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge tone="paper">
              <CalendarDays aria-hidden /> {program.durationLabel}
            </Badge>
            {paused && <Badge tone="amber">Applications paused</Badge>}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** ProjectCard — showcases projects an admin has explicitly featured. */
export function ProjectCard({ project }: { project: Project }) {
  const cover = project.screenshots[0]?.url;
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[16/10] border-b-2 border-ink bg-cream-2 bg-grid-sm">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- Firebase Storage URLs
          <img src={cover} alt={`Screenshot of ${project.title}`} className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="grid size-full place-items-center font-display text-3xl font-extrabold text-ink/30">
            {project.title.slice(0, 1)}
          </div>
        )}
        <Badge tone="lime" className="absolute left-3 top-3">
          {project.programName}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-xl font-extrabold">{project.title}</h3>
        <p className="line-clamp-3 text-sm text-ink-2">{project.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {project.techStack.slice(0, 5).map((t) => (
            <Badge key={t} tone="cream">
              {t}
            </Badge>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
          <span className="font-semibold">by {project.studentName}</span>
          <span className="flex gap-2">
            {project.githubUrl && (
              <a href={project.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                <Github className="size-4" aria-hidden /> Code
              </a>
            )}
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                <ExternalLink className="size-4" aria-hidden /> Live
              </a>
            )}
          </span>
        </div>
      </div>
    </Card>
  );
}

/** TeamCard — only admin-entered team members are ever shown. */
export function TeamCard({ member, index = 0 }: { member: TeamMember; index?: number }) {
  return (
    <Card className="flex flex-col gap-4 p-5" style={{ rotate: `${index % 2 ? 0.6 : -0.6}deg` }}>
      <div className="flex items-center gap-4">
        <Avatar name={member.name} src={member.photoUrl} size={64} />
        <div className="min-w-0">
          <h3 className="font-display text-xl font-extrabold">{member.name}</h3>
          <p className="font-mono text-xs uppercase tracking-wider text-muted">{member.role}</p>
        </div>
      </div>
      {member.bio && <p className="text-sm text-ink-2">{member.bio}</p>}
      {(member.linkedin || member.github) && (
        <div className="flex gap-2">
          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label={`${member.name} on LinkedIn`}
              className="grid size-9 place-items-center rounded-full border-2 border-ink bg-paper hover:bg-lime"
            >
              <Linkedin className="size-4" />
            </a>
          )}
          {member.github && (
            <a
              href={member.github}
              target="_blank"
              rel="noreferrer"
              aria-label={`${member.name} on GitHub`}
              className="grid size-9 place-items-center rounded-full border-2 border-ink bg-paper hover:bg-lime"
            >
              <Github className="size-4" />
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

/** CertificateCard — compact certificate tile with verify/download links. */
export function CertificateCard({ certificate }: { certificate: Certificate }) {
  const revoked = certificate.status === "REVOKED";
  return (
    <Card tone={revoked ? "paper" : "lime"} className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-2xl border-2 border-ink bg-paper">
          <Award className="size-6" aria-hidden />
        </span>
        <Badge tone={revoked ? "red" : "ink"}>{revoked ? "Revoked" : "Verified"}</Badge>
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-wider">Certificate of completion</p>
        <h3 className="font-display text-2xl font-extrabold leading-tight">{certificate.programName}</h3>
        <p className="mt-1 text-sm">
          {formatDate(certificate.startDate)} – {formatDate(certificate.endDate)}
        </p>
      </div>
      <p className="font-mono text-sm font-bold">{certificate.certificateId}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/verify/${certificate.certificateId}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-4 text-sm font-semibold"
        >
          <QrCode className="size-4" aria-hidden /> Verify
        </Link>
        {!revoked && (
          <a
            href={`/api/certificates/${certificate.certificateId}/pdf`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-ink bg-ink px-4 text-sm font-semibold text-paper"
          >
            Download PDF
          </a>
        )}
      </div>
    </Card>
  );
}
