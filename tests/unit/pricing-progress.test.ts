import { describe, expect, it } from "vitest";

import { evaluateEligibility, formatCertificateId, CERTIFICATE_ID_PATTERN, DEFAULT_CERTIFICATE_CRITERIA } from "@/lib/domain/certificates";
import { ruleInsights } from "@/lib/domain/insights";
import { earlyBirdRemaining, formatINR, monthlyFee, resolvePricingTier, totalFee } from "@/lib/domain/pricing";
import {
  assignmentPercent,
  attendancePercent,
  lessonPercent,
  overallProgress,
  projectPercent,
} from "@/lib/domain/progress";

const fees = { earlyBird: 1500, regular: 1800, currency: "INR" as const, unit: "MONTH" as const };
const eb = (claimed: number, enabled = true) => ({ earlyBird: { enabled, limit: 20, claimed, showRemaining: false } });

describe("early-bird pricing", () => {
  it("grants early bird while any of the first 20 seats remain", () => {
    expect(resolvePricingTier("AUTO", eb(0))).toBe("EARLY_BIRD");
    expect(resolvePricingTier("AUTO", eb(19))).toBe("EARLY_BIRD");
    expect(resolvePricingTier("AUTO", eb(20))).toBe("REGULAR");
    expect(resolvePricingTier("AUTO", eb(0, false))).toBe("REGULAR");
  });

  it("never grants an explicit early bird past the limit", () => {
    expect(resolvePricingTier("EARLY_BIRD", eb(20))).toBe("REGULAR");
    expect(resolvePricingTier("REGULAR", eb(0))).toBe("REGULAR");
    expect(earlyBirdRemaining(eb(25))).toBe(0);
  });

  it("computes monthly and total fees per course", () => {
    expect(monthlyFee(fees, "EARLY_BIRD")).toBe(1500);
    expect(monthlyFee(fees, "REGULAR")).toBe(1800);
    expect(totalFee(fees, "EARLY_BIRD", 3)).toBe(4500);
    expect(totalFee(fees, "REGULAR", 3)).toBe(5400);
    expect(formatINR(1500)).toBe("₹1,500");
  });
});

describe("progress", () => {
  it("counts only published lessons", () => {
    expect(lessonPercent(["a", "b", "old"], ["a", "b", "c", "d"])).toBe(50);
    expect(lessonPercent([], [])).toBe(0);
  });

  it("treats late as attended and excludes excused sessions", () => {
    expect(attendancePercent(["PRESENT", "LATE", "ABSENT", "EXCUSED"])).toBe(67);
    expect(attendancePercent(["EXCUSED"])).toBe(0);
  });

  it("counts approved assignments only", () => {
    expect(
      assignmentPercent(["x", "y"], [
        { assignmentId: "x", status: "APPROVED" },
        { assignmentId: "y", status: "SUBMITTED" },
      ]),
    ).toBe(50);
  });

  it("weights project stages", () => {
    expect(projectPercent([{ status: "COMPLETED" }])).toBe(100);
    expect(projectPercent([{ status: "ASSIGNED" }])).toBe(0);
  });

  it("ignores metrics that have no data yet", () => {
    const value = overallProgress({
      lessonPercent: 50,
      assignmentPercent: 0,
      attendancePercent: 0,
      projectPercent: 0,
      has: { lessons: true, assignments: false, attendance: false, projects: false },
    });
    expect(value).toBe(50);
  });
});

describe("certificate eligibility", () => {
  const base = {
    enrollmentStatus: "ACTIVE",
    paymentConfirmed: true,
    lessonPercent: 90,
    assignmentPercent: 80,
    attendancePercent: 90,
    hasAssignments: true,
    hasSessions: true,
    projectCompleted: true,
    hasCertificate: false,
  };

  it("is eligible when every criterion passes", () => {
    expect(evaluateEligibility(base, DEFAULT_CERTIFICATE_CRITERIA).eligible).toBe(true);
  });

  it("blocks on unconfirmed payment, low lessons or missing project", () => {
    expect(evaluateEligibility({ ...base, paymentConfirmed: false }, DEFAULT_CERTIFICATE_CRITERIA).eligible).toBe(false);
    expect(evaluateEligibility({ ...base, lessonPercent: 10 }, DEFAULT_CERTIFICATE_CRITERIA).eligible).toBe(false);
    expect(evaluateEligibility({ ...base, projectCompleted: false }, DEFAULT_CERTIFICATE_CRITERIA).eligible).toBe(false);
  });

  it("passes criteria that have no data", () => {
    const result = evaluateEligibility({ ...base, hasSessions: false, attendancePercent: 0 }, DEFAULT_CERTIFICATE_CRITERIA);
    expect(result.checks.find((c) => c.key === "attendance")?.pass).toBe(true);
  });

  it("never re-issues", () => {
    expect(evaluateEligibility({ ...base, hasCertificate: true }, DEFAULT_CERTIFICATE_CRITERIA).eligible).toBe(false);
  });

  it("formats unambiguous certificate IDs", () => {
    const id = formatCertificateId(new Uint8Array([0, 1, 2, 3, 250, 251, 252, 253]), 2026);
    expect(id).toMatch(CERTIFICATE_ID_PATTERN);
    expect(id.startsWith("ST-W26-")).toBe(true);
    // The random part avoids look-alike characters (0/O, 1/I).
    expect(id.slice("ST-W26-".length)).not.toMatch(/[01IO]/);
  });
});

describe("rule-based insights", () => {
  const metrics = {
    lessonPercent: 30,
    assignmentPercent: 0,
    attendancePercent: 50,
    projectPercent: 0,
    has: { lessons: true, assignments: true, attendance: true, projects: false },
    overall: 25,
    averageScore: 40,
    lessonsCompleted: 3,
    lessonsTotal: 10,
    assignmentsOverdue: 2,
    assignmentsTotal: 4,
    assignmentsSubmitted: 1,
    projectsTotal: 0,
    projectCompleted: false,
  };

  it("prioritises overdue work and caps recommendations", () => {
    const { recommendations } = ruleInsights(metrics);
    expect(recommendations[0]).toMatch(/overdue/);
    expect(recommendations.length).toBeLessThanOrEqual(4);
  });

  it("never promises jobs or placements", () => {
    const text = JSON.stringify(ruleInsights(metrics)) + JSON.stringify(ruleInsights({ ...metrics, overall: 95, assignmentsOverdue: 0 }));
    expect(text).not.toMatch(/job|placement|hire|guarantee/i);
  });
});
