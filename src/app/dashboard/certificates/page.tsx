import { Award, Check, X } from "lucide-react";

import { CertificateCard } from "@/components/site/cards";
import { Locked, PageHeader } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { eligibilityFor, metricsForEnrollment } from "@/server/metrics";
import { getCertificatesForUser } from "@/server/queries/platform";
import { getSettings } from "@/server/queries/settings";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  const certificates = await getCertificatesForUser(session.uid);
  const e = ctx.enrollment;
  const showChecklist = ctx.active && e && !e.certificateId;
  const [metrics, settings] = showChecklist
    ? await Promise.all([metricsForEnrollment(e), getSettings()])
    : [null, null];
  const eligibility = showChecklist && metrics && settings ? eligibilityFor(e, metrics, settings.certificate) : null;

  return (
    <>
      <PageHeader title="Certificates" description="Certificates are issued by Sainam Technology once you meet the completion criteria. Each one has a QR code anyone can verify." />
      <div className="flex flex-col gap-6">
        {certificates.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((c) => (
              <li key={c.id}>
                <CertificateCard certificate={c} />
              </li>
            ))}
          </ul>
        )}
        {eligibility && (
          <section className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm sm:p-6" aria-labelledby="criteria">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-lime">
                <Award className="size-5" aria-hidden />
              </span>
              <div>
                <h2 id="criteria" className="font-display text-xl font-extrabold">
                  Completion criteria
                </h2>
                <p className="text-sm text-muted">
                  {eligibility.eligible
                    ? "You meet all criteria — your certificate will be issued by the admin team."
                    : "Keep going! Here's what's left before your certificate can be issued."}
                </p>
              </div>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {eligibility.checks.map((c) => (
                <li key={c.key} className={cn("flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm", c.pass ? "border-ink bg-lime-soft" : "border-ink/25 bg-cream")}>
                  <span className={cn("grid size-6 place-items-center rounded-full border-2 border-ink", c.pass ? "bg-ink text-lime" : "bg-paper")}>
                    {c.pass ? <Check className="size-3.5" aria-label="Met" /> : <X className="size-3.5" aria-label="Not met" />}
                  </span>
                  <span className="flex-1 font-semibold">{c.label}</span>
                  <span className="font-mono text-xs">
                    {c.actual} / {c.required}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {!certificates.length && !eligibility && (
          <Locked title="No certificates yet">Complete your internship to earn a verifiable certificate.</Locked>
        )}
      </div>
    </>
  );
}
