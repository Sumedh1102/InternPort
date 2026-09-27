import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Mail, MessageCircle, Phone } from "lucide-react";

import { Github, Linkedin } from "@/components/brand/icons";
import { ApproveDialog, AssignDialog, NoteForm, RejectDialog, StatusSelect } from "@/components/admin/application-actions";
import { PaymentDialog } from "@/components/admin/enrollment-actions";
import { DashboardCard, KeyValue, PageHeader } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { label } from "@/lib/domain/enums";
import { earlyBirdRemaining, formatINR } from "@/lib/domain/pricing";
import { formatDateTime, waLink } from "@/lib/utils";
import { activateEnrollment } from "@/server/actions/payments";
import { requireRole } from "@/server/auth/session";
import { getAdminOptions } from "@/server/queries/admin";
import { getApplication, getEnrollment, getUser } from "@/server/queries/platform";
import { getSettings } from "@/server/queries/settings";

export const metadata = { title: "Application" };

export default async function ApplicationDetailPage({ params }: PageProps<"/admin/applications/[id]">) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { id } = await params;
  const application = await getApplication(id);
  if (!application) notFound();
  const [options, settings, enrollment, user] = await Promise.all([
    getAdminOptions(),
    getSettings(),
    application.enrollmentId ? getEnrollment(application.enrollmentId) : Promise.resolve(null),
    getUser(application.uid),
  ]);
  const a = application;
  const canDecide = a.status === "PENDING" || a.status === "UNDER_REVIEW";
  const resumeUrl = a.resumeUrl ?? user?.resumeUrl;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/applications", label: "Applications" }}
        kicker={a.programName}
        title={a.fullName}
        actions={
          <>
            <StatusSelect application={a} />
            <AssignDialog application={a} programs={options.programOptions} batches={options.batchOptions} mentors={options.mentorOptions} />
            {(canDecide || a.status === "APPROVED") && <RejectDialog applicationId={a.id} />}
            {canDecide && (
              <ApproveDialog
                application={a}
                batches={options.batchOptions}
                mentors={options.mentorOptions}
                earlyBirdRemaining={earlyBirdRemaining(settings)}
              />
            )}
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={a.status} />
        {a.pricingTier && <StatusBadge status={a.pricingTier} />}
        {a.earlyBirdInterest && <Badge tone="pink">Interested in early bird</Badge>}
        <span className="font-mono text-xs text-muted">Applied {formatDateTime(a.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <DashboardCard title="Student details">
            <KeyValue
              items={[
                ["Email", a.email],
                ["Phone / WhatsApp", a.phone],
                ["Location", a.location],
                ["Account", user ? `${user.name} (${label(user.role)})` : "—"],
              ]}
            />
          </DashboardCard>
          <DashboardCard title="Academic details">
            <KeyValue
              items={[
                ["College", a.college],
                ["Degree", label(a.degree)],
                ["Branch", a.branch],
                ["Academic year", label(a.academicYear)],
              ]}
            />
          </DashboardCard>
          <DashboardCard title="Skills & experience">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-1.5">
                {a.technicalSkills.map((s) => (
                  <Badge key={s} tone="lime">
                    {s}
                  </Badge>
                ))}
              </div>
              <KeyValue items={[["Skill level", label(a.skillLevel)]]} />
              {a.experience && <p className="whitespace-pre-wrap text-sm">{a.experience}</p>}
            </div>
          </DashboardCard>
          <DashboardCard title="Preferences & motivation">
            <KeyValue
              items={[
                ["Preferred mode", label(a.preferredMode)],
                ["Availability", label(a.availability)],
                ["Hours per week", label(a.hoursPerWeek)],
                ["Consent", a.consent ? "Given" : "Missing"],
              ]}
            />
            <p className="mt-4 whitespace-pre-wrap rounded-2xl border-2 border-ink/15 bg-cream p-4 text-sm">{a.motivation}</p>
          </DashboardCard>
          {a.rejectionReason && (
            <DashboardCard title="Rejection reason" tone="pink-soft">
              <p className="text-sm">{a.rejectionReason}</p>
            </DashboardCard>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <DashboardCard title="Contact">
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${a.email}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Mail aria-hidden /> Email
              </a>
              <a href={`tel:${a.phone.replace(/\s/g, "")}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Phone aria-hidden /> Call
              </a>
              <a
                href={waLink(a.phone, `Hi ${a.fullName.split(" ")[0]}, this is Sainam Technology about your ${a.programName} application.`)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <MessageCircle aria-hidden /> WhatsApp
              </a>
            </div>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {a.github && (
                <li>
                  <a href={a.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline">
                    <Github className="size-4" /> GitHub
                  </a>
                </li>
              )}
              {a.linkedin && (
                <li>
                  <a href={a.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline">
                    <Linkedin className="size-4" /> LinkedIn
                  </a>
                </li>
              )}
              {a.portfolio && (
                <li>
                  <a href={a.portfolio} target="_blank" rel="noreferrer" className="underline">
                    Portfolio
                  </a>
                </li>
              )}
              {resumeUrl && (
                <li>
                  <a href={resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline">
                    <FileText className="size-4" aria-hidden /> Resume
                  </a>
                </li>
              )}
            </ul>
          </DashboardCard>

          {enrollment && (
            <DashboardCard title="Enrollment & payment" tone="lime">
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={enrollment.status} />
                  <StatusBadge status={enrollment.payment.status} />
                </div>
                <KeyValue
                  items={[
                    ["Batch", enrollment.batchName ?? "Not assigned"],
                    ["Mentor", enrollment.mentorName ?? "Not assigned"],
                    ["Total due", formatINR(enrollment.payment.totalAmount)],
                    ["Reference", enrollment.payment.reference ?? "—"],
                  ]}
                />
                <div className="flex flex-wrap gap-2">
                  <PaymentDialog enrollment={enrollment} />
                  {enrollment.status === "AWAITING_PAYMENT" && enrollment.payment.status === "PAYMENT_CONFIRMED" && (
                    <ActionButton action={activateEnrollment.bind(null, enrollment.id)} size="sm" variant="dark">
                      Activate enrollment
                    </ActionButton>
                  )}
                </div>
                <Link href="/admin/students" className="text-xs font-semibold underline">
                  Manage in Students →
                </Link>
              </div>
            </DashboardCard>
          )}

          <DashboardCard title="Notes">
            <div className="flex flex-col gap-4">
              {a.notes?.length ? (
                <ol className="flex flex-col gap-3">
                  {[...a.notes].reverse().map((n, i) => (
                    <li key={i} className="border-l-2 border-ink pl-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.text}</p>
                      <p className="font-mono text-[0.68rem] text-muted">
                        {n.byName} · {formatDateTime(n.at)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">No notes yet.</p>
              )}
              <NoteForm applicationId={a.id} />
            </div>
          </DashboardCard>
        </aside>
      </div>
    </>
  );
}
