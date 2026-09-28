import "server-only";

import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { BRAND_COLORS, LOGO_LOCKUP, LOGO_MARK_PATH, LOGO_WORDMARK_PATH } from "@/lib/brand";
import type { Certificate, PlatformSettings } from "@/lib/domain/types";
import { SITE } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export function verificationUrl(cert: Pick<Certificate, "certificateId" | "verificationToken">): string {
  return `${SITE.url}/verify/${cert.certificateId}?t=${cert.verificationToken}`;
}

export async function certificateQrSvg(cert: Certificate): Promise<string> {
  return QRCode.toString(verificationUrl(cert), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0b0c", light: "#fffdf7" },
  });
}

function hex(color: string) {
  const n = parseInt(color.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const INK = rgb(0.043, 0.043, 0.047);
const CREAM = rgb(0.98, 0.965, 0.925);
const PAPER = rgb(1, 0.992, 0.969);
const LIME = rgb(0.776, 1, 0.204);
const PINK = rgb(1, 0.239, 0.604);
const MUTED = rgb(0.34, 0.325, 0.294);
const TEAL = hex(BRAND_COLORS.teal);
const SLATE = hex(BRAND_COLORS.slate);

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - width) / 2, y, size, font, color });
}

/** Fits long names/program titles onto one line by shrinking the font. */
function fitSize(font: PDFFont, text: string, max: number, maxWidth: number) {
  let size = max;
  while (size > 14 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

/** Latin-1 safe text for the built-in PDF fonts. */
function pdfSafe(text: string) {
  return text.normalize("NFKD").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

export async function renderCertificatePdf(cert: Certificate, settings: PlatformSettings): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificate ${cert.certificateId}`);
  pdf.setAuthor(SITE.name);
  pdf.setSubject(`${cert.programName} — certificate of completion`);
  const page = pdf.addPage([842, 595]); // A4 landscape
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const { width, height } = page.getSize();

  // Frame
  page.drawRectangle({ x: 0, y: 0, width, height, color: CREAM });
  page.drawRectangle({ x: 34, y: 26, width: width - 60, height: height - 60, color: INK });
  page.drawRectangle({ x: 26, y: 34, width: width - 60, height: height - 60, color: PAPER, borderColor: INK, borderWidth: 3 });
  page.drawRectangle({ x: 26, y: height - 110, width: width - 60, height: 84, color: PAPER, borderColor: INK, borderWidth: 3 });
  page.drawRectangle({ x: 27.5, y: height - 108.5, width: width - 63, height: 8, color: LIME });

  // Header: logo on paper (its colours need a light background)
  const logoScale = 48 / LOGO_LOCKUP.height;
  page.drawSvgPath(LOGO_MARK_PATH, { x: 52, y: height - 40, scale: logoScale, color: TEAL });
  page.drawSvgPath(LOGO_WORDMARK_PATH, { x: 52, y: height - 40, scale: logoScale, color: SLATE });
  const tag = "CERTIFICATE OF COMPLETION";
  page.drawText(tag, { x: width - 56 - bold.widthOfTextAtSize(tag, 14), y: height - 74, size: 14, font: bold, color: INK });

  // Body
  centered(page, "This certifies that", height - 170, regular, 14, MUTED);
  const name = pdfSafe(cert.studentName);
  centered(page, name, height - 225, bold, fitSize(bold, name, 44, width - 180));
  page.drawRectangle({ x: width / 2 - 150, y: height - 240, width: 300, height: 5, color: PINK });
  centered(page, "has successfully completed the", height - 275, regular, 14, MUTED);
  const program = pdfSafe(`${cert.programName} Internship`);
  centered(page, program, height - 310, bold, fitSize(bold, program, 26, width - 180));
  centered(
    page,
    pdfSafe(`${SITE.program} · ${formatDate(cert.startDate)} to ${formatDate(cert.endDate)}${cert.batchName ? ` · ${cert.batchName}` : ""}`),
    height - 338,
    regular,
    12,
    MUTED,
  );

  // Footer: signatory, id, QR
  const signY = 110;
  page.drawLine({ start: { x: 70, y: signY }, end: { x: 290, y: signY }, thickness: 1.5, color: INK });
  page.drawText(pdfSafe(settings.certificate.signatoryName || SITE.name), { x: 70, y: signY - 18, size: 12, font: bold, color: INK });
  page.drawText(pdfSafe(settings.certificate.signatoryTitle || "Authorised signatory"), { x: 70, y: signY - 34, size: 10, font: regular, color: MUTED });

  page.drawText("Issued", { x: 340, y: signY + 6, size: 9, font: mono, color: MUTED });
  page.drawText(formatDate(cert.issuedAt), { x: 340, y: signY - 10, size: 12, font: bold, color: INK });
  page.drawText("Certificate ID", { x: 340, y: signY - 32, size: 9, font: mono, color: MUTED });
  page.drawText(cert.certificateId, { x: 340, y: signY - 48, size: 12, font: mono, color: INK });

  const qr = await QRCode.toBuffer(verificationUrl(cert), { margin: 1, width: 240, errorCorrectionLevel: "M" });
  const qrImage = await pdf.embedPng(qr);
  page.drawRectangle({ x: width - 186, y: 56, width: 124, height: 124, color: rgb(1, 1, 1), borderColor: INK, borderWidth: 2 });
  page.drawImage(qrImage, { x: width - 180, y: 62, width: 112, height: 112 });
  const scan = "Scan to verify";
  page.drawText(scan, { x: width - 124 - mono.widthOfTextAtSize(scan, 8) / 2, y: 44, size: 8, font: mono, color: MUTED });

  return pdf.save();
}
