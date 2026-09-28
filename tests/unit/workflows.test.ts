import { describe, expect, it } from "vitest";

import {
  APPLICATION_FLOW,
  ENROLLMENT_FLOW,
  PAYMENT_FLOW,
  REVIEWER_SUBMISSION_FLOW,
  STUDENT_PAYMENT_FLOW,
  STUDENT_SUBMISSION_FLOW,
  TransitionError,
  assertTransition,
  canAssignRole,
  canTransition,
  journeyStep,
} from "@/lib/domain/workflows";

describe("application workflow", () => {
  it("allows review → approve → enroll", () => {
    expect(canTransition(APPLICATION_FLOW, "PENDING", "UNDER_REVIEW")).toBe(true);
    expect(canTransition(APPLICATION_FLOW, "UNDER_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition(APPLICATION_FLOW, "APPROVED", "ENROLLED")).toBe(true);
  });

  it("forbids skipping approval or leaving ENROLLED", () => {
    expect(canTransition(APPLICATION_FLOW, "PENDING", "ENROLLED")).toBe(false);
    expect(canTransition(APPLICATION_FLOW, "ENROLLED", "REJECTED")).toBe(false);
    expect(() => assertTransition("application", APPLICATION_FLOW, "PENDING", "ENROLLED")).toThrow(TransitionError);
  });

  it("treats a same-status write as a no-op", () => {
    expect(() => assertTransition("application", APPLICATION_FLOW, "ENROLLED", "ENROLLED")).not.toThrow();
  });
});

describe("manual payment workflow", () => {
  it("students can only move a payment into review", () => {
    expect(canTransition(STUDENT_PAYMENT_FLOW, "PAYMENT_PENDING", "PAYMENT_IN_REVIEW")).toBe(true);
    expect(canTransition(STUDENT_PAYMENT_FLOW, "PAYMENT_REJECTED", "PAYMENT_IN_REVIEW")).toBe(true);
    expect(canTransition(STUDENT_PAYMENT_FLOW, "PAYMENT_PENDING", "PAYMENT_CONFIRMED")).toBe(false);
    expect(canTransition(STUDENT_PAYMENT_FLOW, "PAYMENT_CONFIRMED", "PAYMENT_IN_REVIEW")).toBe(false);
  });

  it("admins can confirm or reject from review", () => {
    expect(canTransition(PAYMENT_FLOW, "PAYMENT_IN_REVIEW", "PAYMENT_CONFIRMED")).toBe(true);
    expect(canTransition(PAYMENT_FLOW, "PAYMENT_IN_REVIEW", "PAYMENT_REJECTED")).toBe(true);
    expect(canTransition(PAYMENT_FLOW, "PAYMENT_CONFIRMED", "PAYMENT_REJECTED")).toBe(false);
  });
});

describe("enrollment workflow", () => {
  it("activates only from awaiting payment or suspension", () => {
    expect(canTransition(ENROLLMENT_FLOW, "AWAITING_PAYMENT", "ACTIVE")).toBe(true);
    expect(canTransition(ENROLLMENT_FLOW, "SUSPENDED", "ACTIVE")).toBe(true);
    expect(canTransition(ENROLLMENT_FLOW, "CANCELLED", "ACTIVE")).toBe(false);
  });
});

describe("submission workflow", () => {
  it("locks student edits once submitted", () => {
    expect(canTransition(STUDENT_SUBMISSION_FLOW, "NOT_STARTED", "SUBMITTED")).toBe(true);
    expect(canTransition(STUDENT_SUBMISSION_FLOW, "SUBMITTED", "IN_PROGRESS")).toBe(false);
    expect(canTransition(STUDENT_SUBMISSION_FLOW, "REVISION_REQUIRED", "SUBMITTED")).toBe(true);
  });

  it("reviewers cannot approve work that was never submitted", () => {
    expect(canTransition(REVIEWER_SUBMISSION_FLOW, "IN_PROGRESS", "APPROVED")).toBe(false);
    expect(canTransition(REVIEWER_SUBMISSION_FLOW, "SUBMITTED", "APPROVED")).toBe(true);
  });
});

describe("role assignment", () => {
  it("only super admins manage admin roles", () => {
    expect(canAssignRole("SUPER_ADMIN", "ADMIN", "STUDENT")).toBe(true);
    expect(canAssignRole("ADMIN", "ADMIN", "STUDENT")).toBe(false);
    expect(canAssignRole("ADMIN", "MENTOR", "STUDENT")).toBe(true);
    expect(canAssignRole("ADMIN", "STUDENT", "ADMIN")).toBe(false);
    expect(canAssignRole("MENTOR", "MENTOR", "STUDENT")).toBe(false);
  });
});

describe("application journey tracker", () => {
  it("maps statuses to steps", () => {
    expect(journeyStep(null)).toBe(-1);
    expect(journeyStep({ status: "PENDING" })).toBe(0);
    expect(journeyStep({ status: "APPROVED" }, { status: "PAYMENT_PENDING" })).toBe(2);
    expect(journeyStep({ status: "APPROVED" }, { status: "PAYMENT_CONFIRMED" })).toBe(3);
    expect(journeyStep({ status: "ENROLLED" })).toBe(4);
  });
});
