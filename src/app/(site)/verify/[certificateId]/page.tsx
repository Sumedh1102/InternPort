import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Download, OctagonX, SearchX, ShieldCheck } from "lucide-react";

import { Burst, StickerLabel } from "@/components/brand/decor";
import { Container } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { CERTIFICATE_ID_PATTERN } from "@/lib/domain/certificates";
import type { Certificate } from "@/lib/domain/types";
import { SITE } from "@/lib/site";
import { cn, formatDate } from "@/lib/utils";
import { certificateQrSvg } from "@/server/certificate-render";
import { isAdminConfigured } from "@/server/firebase-admin";
import { getCertificate } from "@/server/queries/platform";

export const metadata: Metadata = {
  title: "Certificate verification",
  // Personal data: reachable by ID/QR, but never indexed.
  robots: { index: false, follow: false },
};

export default async function VerifyCertificatePage({ params, searchParams }: PageProps<"/verify/[certificateId]">) {
  const { certificateId: raw } = await params;
  const { t } = await searchParams;
  const certificateId = decodeURIComponent(raw).toUpperCase();

  let cert: Certificate | null = null;
  if (CERTIFICATE_ID_PATTERN.test(certificateId) && isAdminConfigured()) {
    cert = await getCertificate(certificateId);
  }

  if (!cert) {
    return (
      <Container className="py-20">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-chunk border-2 border-ink bg-paper p-8 text-center shadow-brutal">
          <SearchX className="size-12" aria-hidden />
          <h1 className="font-display-wide text-4xl">Certificate not found</h1>
          <p className="text-muted">
            We couldn&apos;t find a certificate with ID <span className="font-mono font-semibold text-ink">{certificateId}</span>.
            Check the ID and try again.
          </p>
          <Link href="/verify" className={buttonVariants()}>
            Try another ID
          </Link>
        </div>
      </Container>
    );
  }

  const valid = cert.status === "VALID";
  const tokenMatched = typeof t === "string" && t === cert.verificationToken;
  const qr = valid ? await certificateQrSvg(cert) : null;

  return (
    <Container className="py-12 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <div
          className={cn(
            "relative flex flex-col items-start gap-3 overflow-hidden rounded-chunk border-2 border-ink p-6 shadow-brutal sm:flex-row sm:items-center sm:p-8",
            valid ? "bg-lime" : "bg-red-soft",
          )}
          role="status"
        >
          {valid ? <BadgeCheck className="size-12 shrink-0" aria-hidden /> : <OctagonX className="size-12 shrink-0" aria-hidden />}
          <div>
            <h1 className="font-display-wide text-4xl sm:text-5xl">{valid ? "Certificate Verified" : "Certificate Revoked"}</h1>
            <p className="mt-1 font-semibold">
              {valid
                ? `Issued by ${SITE.name}. The details below match our records.`
                : `This certificate is no longer valid.${cert.revokedReason ? ` Reason: ${cert.revokedReason}` : ""}`}
            </p>
          </div>
          {valid && <Burst className="absolute -right-8 -top-8 hidden size-32 text-paper/70 sm:block" aria-hidden />}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <dl className="grid gap-0 overflow-hidden rounded-card border-2 border-ink bg-paper shadow-brutal-sm">
            {[
              ["Student", cert.studentName],
              ["Program", `${cert.programName} Internship`],
              ["Duration", `${formatDate(cert.startDate)} – ${formatDate(cert.endDate)}`],
              ["Issue date", formatDate(cert.issuedAt)],
              ["Certificate ID", cert.certificateId],
              ["Issued by", SITE.name],
            ].map(([k, v], i) => (
              <div key={k} className={cn("grid gap-1 px-5 py-4 sm:grid-cols-[160px_1fr]", i > 0 && "border-t-2 border-ink/10")}>
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">{k}</dt>
                <dd className={cn("font-semibold", k === "Certificate ID" && "font-mono")}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col items-center gap-4 rounded-card border-2 border-ink bg-paper p-5 text-center shadow-brutal-sm">
            {qr && (
              <div
                className="w-44 rounded-xl border-2 border-ink bg-paper p-1 [&_svg]:h-auto [&_svg]:w-full"
                role="img"
                aria-label="QR code linking to this verification page"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            )}
            {tokenMatched && (
              <StickerLabel tone="lime" rotate={0}>
                <ShieldCheck className="size-3.5" /> QR code authenticated
              </StickerLabel>
            )}
            {valid && (
              <a href={`/api/certificates/${cert.certificateId}/pdf`} className={cn(buttonVariants({ variant: "dark" }), "w-full")}>
                <Download aria-hidden /> Download certificate
              </a>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
