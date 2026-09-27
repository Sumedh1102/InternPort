import { NextResponse } from "next/server";

import { ADMIN_ROLES, label } from "@/lib/domain/enums";
import { getSession } from "@/server/auth/session";
import { listApplications } from "@/server/queries/platform";

/** Escapes a CSV cell and neutralises spreadsheet formula injection. */
function cell(value: unknown): string {
  let text = value === null || value === undefined ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getSession();
  if (!session || !session.emailVerified || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const applications = await listApplications(5000);
  const columns = [
    ["Applied", (a: (typeof applications)[number]) => a.createdAt],
    ["Status", (a) => label(a.status)],
    ["Full name", (a) => a.fullName],
    ["Email", (a) => a.email],
    ["Phone / WhatsApp", (a) => a.phone],
    ["College", (a) => a.college],
    ["Degree", (a) => label(a.degree)],
    ["Branch", (a) => a.branch],
    ["Academic year", (a) => label(a.academicYear)],
    ["Location", (a) => a.location],
    ["Program", (a) => a.programName],
    ["Technical skills", (a) => a.technicalSkills],
    ["Skill level", (a) => label(a.skillLevel)],
    ["Experience", (a) => a.experience],
    ["GitHub", (a) => a.github],
    ["LinkedIn", (a) => a.linkedin],
    ["Portfolio", (a) => a.portfolio],
    ["Preferred mode", (a) => label(a.preferredMode)],
    ["Availability", (a) => label(a.availability)],
    ["Hours per week", (a) => label(a.hoursPerWeek)],
    ["Early-bird interest", (a) => (a.earlyBirdInterest ? "Yes" : "No")],
    ["Pricing tier", (a) => (a.pricingTier ? label(a.pricingTier) : "")],
    ["Motivation", (a) => a.motivation],
  ] as const satisfies readonly (readonly [string, (a: (typeof applications)[number]) => unknown])[];

  const csv = [
    columns.map(([h]) => cell(h)).join(","),
    ...applications.map((a) => columns.map(([, get]) => cell(get(a))).join(",")),
  ].join("\r\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sainam-applications-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
