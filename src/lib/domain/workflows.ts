import type {
  ApplicationStatus,
  EnrollmentStatus,
  PaymentStatus,
  ProjectStatus,
  Role,
  SubmissionStatus,
} from "./enums";

/**
 * Explicit state machines. Server actions call `assertTransition` before writing,
 * so an invalid jump (e.g. PENDING → ENROLLED) is impossible regardless of the client.
 */

type Machine<S extends string> = Record<S, readonly S[]>;

export const APPLICATION_FLOW: Machine<ApplicationStatus> = {
  PENDING: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["PENDING", "APPROVED", "REJECTED"],
  APPROVED: ["ENROLLED", "REJECTED"],
  REJECTED: ["UNDER_REVIEW"],
  ENROLLED: [],
};

export const PAYMENT_FLOW: Machine<PaymentStatus> = {
  PAYMENT_PENDING: ["PAYMENT_IN_REVIEW", "PAYMENT_CONFIRMED", "PAYMENT_REJECTED"],
  PAYMENT_IN_REVIEW: ["PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PAYMENT_REJECTED"],
  PAYMENT_REJECTED: ["PAYMENT_PENDING", "PAYMENT_IN_REVIEW", "PAYMENT_CONFIRMED"],
  PAYMENT_CONFIRMED: ["PAYMENT_IN_REVIEW"],
};

/** Students may only move their payment into review (after paying offline). */
export const STUDENT_PAYMENT_FLOW: Machine<PaymentStatus> = {
  PAYMENT_PENDING: ["PAYMENT_IN_REVIEW"],
  PAYMENT_REJECTED: ["PAYMENT_IN_REVIEW"],
  PAYMENT_IN_REVIEW: ["PAYMENT_IN_REVIEW"],
  PAYMENT_CONFIRMED: [],
};

export const ENROLLMENT_FLOW: Machine<EnrollmentStatus> = {
  AWAITING_PAYMENT: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  COMPLETED: ["ACTIVE"],
  CANCELLED: ["AWAITING_PAYMENT"],
};

export const STUDENT_SUBMISSION_FLOW: Machine<SubmissionStatus> = {
  NOT_STARTED: ["IN_PROGRESS", "SUBMITTED"],
  IN_PROGRESS: ["IN_PROGRESS", "SUBMITTED"],
  SUBMITTED: [],
  UNDER_REVIEW: [],
  APPROVED: [],
  REVISION_REQUIRED: ["IN_PROGRESS", "SUBMITTED"],
};

export const REVIEWER_SUBMISSION_FLOW: Machine<SubmissionStatus> = {
  NOT_STARTED: [],
  IN_PROGRESS: [],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "REVISION_REQUIRED"],
  UNDER_REVIEW: ["APPROVED", "REVISION_REQUIRED"],
  APPROVED: ["REVISION_REQUIRED"],
  REVISION_REQUIRED: ["UNDER_REVIEW", "APPROVED"],
};

export const STUDENT_PROJECT_FLOW: Machine<ProjectStatus> = {
  ASSIGNED: ["IN_PROGRESS", "SUBMITTED"],
  IN_PROGRESS: ["IN_PROGRESS", "SUBMITTED"],
  SUBMITTED: [],
  REVIEWED: ["IN_PROGRESS", "SUBMITTED"],
  EVALUATED: [],
  COMPLETED: [],
};

export const REVIEWER_PROJECT_FLOW: Machine<ProjectStatus> = {
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["SUBMITTED", "ASSIGNED"],
  SUBMITTED: ["REVIEWED", "EVALUATED"],
  REVIEWED: ["EVALUATED", "SUBMITTED"],
  EVALUATED: ["COMPLETED", "REVIEWED"],
  COMPLETED: ["EVALUATED"],
};

export function canTransition<S extends string>(machine: Machine<S>, from: S, to: S): boolean {
  return (machine[from] ?? []).includes(to);
}

export class TransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`Cannot change ${entity} from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.`);
    this.name = "TransitionError";
  }
}

export function assertTransition<S extends string>(
  entity: string,
  machine: Machine<S>,
  from: S,
  to: S,
): void {
  if (from === to) return;
  if (!canTransition(machine, from, to)) throw new TransitionError(entity, from, to);
}

/** Visual progress for the student-facing application tracker. */
export const APPLICATION_JOURNEY = [
  { key: "SUBMITTED", title: "Application submitted" },
  { key: "REVIEW", title: "Admin review" },
  { key: "APPROVED", title: "Approved" },
  { key: "PAYMENT", title: "Payment verification" },
  { key: "ENROLLED", title: "Enrollment active" },
] as const;

export function journeyStep(
  application: { status: ApplicationStatus } | null,
  payment?: { status: PaymentStatus } | null,
): number {
  if (!application) return -1;
  switch (application.status) {
    case "PENDING":
      return 0;
    case "UNDER_REVIEW":
      return 1;
    case "REJECTED":
      return 1;
    case "APPROVED":
      return payment?.status === "PAYMENT_CONFIRMED" ? 3 : 2;
    case "ENROLLED":
      return 4;
  }
}

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/dashboard",
  MENTOR: "/mentor",
  ADMIN: "/admin",
  SUPER_ADMIN: "/admin",
};

export function isStaff(role: Role | null | undefined): boolean {
  return role === "MENTOR" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isAdmin(role: Role | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Only super admins can mint admins; admins can manage students and mentors. */
export function canAssignRole(actor: Role, target: Role, targetCurrent: Role): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor !== "ADMIN") return false;
  const manageable: Role[] = ["STUDENT", "MENTOR"];
  return manageable.includes(target) && manageable.includes(targetCurrent);
}
