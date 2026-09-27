import Link from "next/link";
import { Check, X } from "lucide-react";

import { IssueCertificateButton, RevokeCertificateDialog } from "@/components/admin/certificate-actions";
import { PageHeader } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { cn, formatDate } from "@/lib/utils";
import { issueAllEligible } from "@/server/actions/certificates";
import { requireRole } from "@/server/auth/session";
import { eligibilityFor, metricsForEnrollments } from "@/server/metrics";
import { listCertificates, listEnrollments } from "@/server/queries/platform";
import { getSettings } from "@/server/queries/settings";

export const metadata = { title: "Certificates" };

export default async function AdminCertificatesPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [enrollments, certificates, settings] = await Promise.all([listEnrollments(), listCertificates(), getSettings()]);
  const candidates = enrollments.filter((e) => (e.status === "ACTIVE" || e.status === "COMPLETED") && !e.certificateId);
  const metrics = await metricsForEnrollments(candidates);
  const rows = candidates.map((e) => ({ e, result: eligibilityFor(e, metrics.get(e.id)!, settings.certificate) }));
  const eligibleCount = rows.filter((r) => r.result.eligible).length;
  const c = settings.certificate;

  return (
    <>
      <PageHeader
        title="Certificates"
        description={`Criteria: lessons ≥ ${c.minLessonPercent}%, approved assignments ≥ ${c.minAssignmentPercent}%, attendance ≥ ${c.minAttendancePercent}%${c.requireProjectCompleted ? ", project completed" : ""}, payment confirmed.`}
        actions={
          <>
            <Link href="/admin/settings" className="self-center text-sm font-semibold underline">
              Edit criteria
            </Link>
            {eligibleCount > 0 && (
              <ActionButton
                action={issueAllEligible}
                size="sm"
                confirm={{ title: `Issue ${eligibleCount} certificate${eligibleCount > 1 ? "s" : ""}?`, description: "Students are notified and their enrollments marked completed." }}
              >
                Issue all eligible ({eligibleCount})
              </ActionButton>
            )}
          </>
        }
      />
      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl font-extrabold">Eligibility</h2>
        <DataTable
          caption="Certificate eligibility"
          initialFilters={{ eligible: eligibleCount ? "yes" : "" }}
          filters={[{ key: "eligible", label: "Eligible", options: [{ value: "yes", label: "Eligible" }, { value: "no", label: "Not yet" }] }]}
          columns={[
            { key: "student", header: "Student", sortable: true },
            { key: "checks", header: "Criteria" },
            { key: "action", header: "" },
          ]}
          emptyTitle="No active interns"
          rows={rows.map(({ e, result }) => ({
            id: e.id,
            search: `${e.studentName} ${e.programName}`,
            filters: { eligible: result.eligible ? "yes" : "no" },
            sort: { student: e.studentName },
            cells: {
              student: (
                <div>
                  <p className="font-semibold">{e.studentName}</p>
                  <p className="text-xs text-muted">
                    {e.programName} · {e.batchName ?? "No batch"}
                  </p>
                </div>
              ),
              checks: (
                <ul className="flex flex-wrap gap-1.5">
                  {result.checks.map((ch) => (
                    <li
                      key={ch.key}
                      title={`${ch.label}: ${ch.actual} (needs ${ch.required})`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs font-semibold",
                        ch.pass ? "border-ink bg-lime-soft" : "border-ink/30 bg-red-soft",
                      )}
                    >
                      {ch.pass ? <Check className="size-3" aria-label="met" /> : <X className="size-3" aria-label="not met" />}
                      {ch.label.split(" ")[0]} {ch.actual}
                    </li>
                  ))}
                </ul>
              ),
              action: <IssueCertificateButton enrollmentId={e.id} eligible={result.eligible} studentName={e.studentName} />,
            },
          }))}
        />
      </section>
      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold">Issued certificates</h2>
        <DataTable
          caption="Issued certificates"
          columns={[
            { key: "id", header: "Certificate ID" },
            { key: "student", header: "Student", sortable: true },
            { key: "issued", header: "Issued", sortable: true, hideOnMobile: true },
            { key: "status", header: "Status" },
            { key: "actions", header: "" },
          ]}
          emptyTitle="No certificates issued yet"
          rows={certificates.map((cert) => ({
            id: cert.id,
            search: `${cert.certificateId} ${cert.studentName} ${cert.programName}`,
            sort: { student: cert.studentName, issued: cert.issuedAt },
            cells: {
              id: (
                <Link href={`/verify/${cert.certificateId}`} target="_blank" className="font-mono text-sm font-semibold underline">
                  {cert.certificateId}
                </Link>
              ),
              student: (
                <div>
                  <p className="font-semibold">{cert.studentName}</p>
                  <p className="text-xs text-muted">{cert.programName}</p>
                </div>
              ),
              issued: formatDate(cert.issuedAt),
              status: <StatusBadge status={cert.status} />,
              actions: (
                <div className="flex gap-1">
                  {cert.status === "VALID" && (
                    <>
                      <a href={`/api/certificates/${cert.certificateId}/pdf`} className="self-center text-sm font-semibold underline">
                        PDF
                      </a>
                      <RevokeCertificateDialog certificateId={cert.certificateId} />
                    </>
                  )}
                </div>
              ),
            },
          }))}
        />
      </section>
    </>
  );
}
