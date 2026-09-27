import type { CertificateCriteria } from "./types";

export const DEFAULT_CERTIFICATE_CRITERIA: CertificateCriteria = {
  minLessonPercent: 80,
  minAssignmentPercent: 70,
  minAttendancePercent: 75,
  requireProjectCompleted: true,
};

export interface EligibilityInput {
  enrollmentStatus: string;
  paymentConfirmed: boolean;
  lessonPercent: number;
  assignmentPercent: number;
  attendancePercent: number;
  hasAssignments: boolean;
  hasSessions: boolean;
  projectCompleted: boolean;
  hasCertificate: boolean;
}

export interface EligibilityCheck {
  key: string;
  label: string;
  required: string;
  actual: string;
  pass: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  checks: EligibilityCheck[];
}

/**
 * Evaluates the admin-configured completion criteria. Criteria without data
 * (e.g. no sessions were ever held) pass automatically instead of blocking everyone.
 */
export function evaluateEligibility(
  input: EligibilityInput,
  criteria: CertificateCriteria,
): EligibilityResult {
  const checks: EligibilityCheck[] = [
    {
      key: "enrollment",
      label: "Enrollment active or completed",
      required: "Active",
      actual: input.enrollmentStatus,
      pass: input.enrollmentStatus === "ACTIVE" || input.enrollmentStatus === "COMPLETED",
    },
    {
      key: "payment",
      label: "Payment verified",
      required: "Confirmed",
      actual: input.paymentConfirmed ? "Confirmed" : "Not confirmed",
      pass: input.paymentConfirmed,
    },
    {
      key: "lessons",
      label: "Lessons completed",
      required: `${criteria.minLessonPercent}%`,
      actual: `${input.lessonPercent}%`,
      pass: input.lessonPercent >= criteria.minLessonPercent,
    },
    {
      key: "assignments",
      label: "Assignments approved",
      required: `${criteria.minAssignmentPercent}%`,
      actual: input.hasAssignments ? `${input.assignmentPercent}%` : "No assignments",
      pass: !input.hasAssignments || input.assignmentPercent >= criteria.minAssignmentPercent,
    },
    {
      key: "attendance",
      label: "Attendance",
      required: `${criteria.minAttendancePercent}%`,
      actual: input.hasSessions ? `${input.attendancePercent}%` : "No sessions",
      pass: !input.hasSessions || input.attendancePercent >= criteria.minAttendancePercent,
    },
    {
      key: "project",
      label: "Project completed",
      required: criteria.requireProjectCompleted ? "Yes" : "Optional",
      actual: input.projectCompleted ? "Yes" : "No",
      pass: !criteria.requireProjectCompleted || input.projectCompleted,
    },
  ];
  return { eligible: !input.hasCertificate && checks.every((c) => c.pass), checks };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Human-friendly, unambiguous certificate IDs, e.g. ST-W26-7KX9-Q2MF. */
export function formatCertificateId(randomBytes: Uint8Array, year = new Date().getFullYear()): string {
  const chars = Array.from(randomBytes.slice(0, 8), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `ST-W${String(year).slice(-2)}-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

export const CERTIFICATE_ID_PATTERN = /^ST-W\d{2}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
