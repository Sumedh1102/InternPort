import { describe, expect, it } from "vitest";

import {
  applicationSchema,
  lessonSchema,
  looksLikeCardNumber,
  paymentReportSchema,
  registerSchema,
  submissionSchema,
} from "@/lib/domain/schemas";
import { safeNext } from "@/lib/utils";

const validApplication = {
  fullName: "Asha Patil",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  location: "Pune, Maharashtra",
  college: "Example College of Engineering",
  degree: "BTECH",
  branch: "Computer Engineering",
  academicYear: "THIRD_YEAR",
  programId: "abc123",
  technicalSkills: ["Python", "React"],
  skillLevel: "INTERMEDIATE",
  experience: "",
  github: "https://github.com/asha",
  linkedin: "https://www.linkedin.com/in/asha",
  portfolio: "",
  resumePath: "",
  preferredMode: "ONLINE",
  availability: "WEEKDAYS",
  hoursPerWeek: "10_20",
  motivation: "I want to build real machine learning projects with mentor feedback.",
  earlyBirdInterest: true,
  consent: true,
  website: "",
};

describe("application schema (Google Form parity)", () => {
  it("accepts a complete application", () => {
    expect(applicationSchema.safeParse(validApplication).success).toBe(true);
  });

  it("requires consent", () => {
    expect(applicationSchema.safeParse({ ...validApplication, consent: false }).success).toBe(false);
  });

  it("validates profile link hosts", () => {
    expect(applicationSchema.safeParse({ ...validApplication, github: "https://gitlab.com/asha" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...validApplication, linkedin: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects a filled honeypot and document-path injection", () => {
    expect(applicationSchema.safeParse({ ...validApplication, website: "spam" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...validApplication, programId: "../users/x" }).success).toBe(false);
  });

  it("requires at least one skill and a real motivation", () => {
    expect(applicationSchema.safeParse({ ...validApplication, technicalSkills: [] }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...validApplication, motivation: "pls" }).success).toBe(false);
  });
});

describe("payment reference safety", () => {
  it("detects Luhn-valid card numbers", () => {
    expect(looksLikeCardNumber("4111 1111 1111 1111")).toBe(true);
    expect(looksLikeCardNumber("card 5555-5555-5555-4444")).toBe(true);
  });

  it("allows UPI / UTR references", () => {
    expect(looksLikeCardNumber("412345678901")).toBe(false);
    expect(looksLikeCardNumber("UTR SBIN0023456789")).toBe(false);
  });

  it("validates the student report", () => {
    expect(
      paymentReportSchema.safeParse({ enrollmentId: "e1", method: "UPI", reference: "412345678901", paidOn: "2026-10-01", note: "" }).success,
    ).toBe(true);
    expect(paymentReportSchema.safeParse({ enrollmentId: "e1", method: "CARD", reference: "x", paidOn: "yesterday" }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("requires matching strong passwords", () => {
    const base = { name: "Asha", email: "a@b.co", password: "secret123", confirmPassword: "secret123", terms: true };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, confirmPassword: "nope1234" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success).toBe(false);
  });

  it("requires something to submit", () => {
    expect(submissionSchema.safeParse({ assignmentId: "a1", githubUrl: "", liveUrl: "", submit: true }).success).toBe(false);
    expect(submissionSchema.safeParse({ assignmentId: "a1", githubUrl: "", liveUrl: "", submit: false }).success).toBe(true);
  });

  it("validates quiz answer keys", () => {
    const lesson = {
      courseId: "c1",
      moduleId: "m1",
      title: "Quiz",
      summary: "",
      type: "QUIZ",
      content: "",
      resources: [],
      quiz: [{ question: "2+2?", options: ["3", "4"], answerIndex: 5 }],
      durationMinutes: 5,
      order: 0,
      status: "PUBLISHED",
    };
    expect(lessonSchema.safeParse(lesson).success).toBe(false);
    expect(lessonSchema.safeParse({ ...lesson, quiz: [{ ...lesson.quiz[0], answerIndex: 1 }] }).success).toBe(true);
  });
});

describe("safeNext (open-redirect guard)", () => {
  it("keeps internal paths only", () => {
    expect(safeNext("/apply?program=x")).toBe("/apply?program=x");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext(null, "/dashboard")).toBe("/dashboard");
  });
});
