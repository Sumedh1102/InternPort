import { NextResponse } from "next/server";

import { CERTIFICATE_ID_PATTERN } from "@/lib/domain/certificates";
import { renderCertificatePdf } from "@/server/certificate-render";
import { isAdminConfigured } from "@/server/firebase-admin";
import { getCertificate } from "@/server/queries/platform";
import { getSettings } from "@/server/queries/settings";

/** Public download for valid certificates (same data as the public verify page). */
export async function GET(_request: Request, ctx: RouteContext<"/api/certificates/[certificateId]/pdf">) {
  const { certificateId } = await ctx.params;
  if (!CERTIFICATE_ID_PATTERN.test(certificateId) || !isAdminConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const cert = await getCertificate(certificateId);
  if (!cert || cert.status !== "VALID") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bytes = await renderCertificatePdf(cert, await getSettings());
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Sainam-Certificate-${cert.certificateId}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
