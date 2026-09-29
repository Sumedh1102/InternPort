import { z } from "zod";
import {
  ACADEMIC_YEARS,
  ANNOUNCEMENT_AUDIENCES,
  APPLICATION_STATUSES,
  ATTENDANCE_STATUSES,
  AVAILABILITY_OPTIONS,
  BATCH_STATUSES,
  CONTENT_STATUSES,
  DEGREES,
  ENROLLMENT_STATUSES,
  HOURS_PER_WEEK,
  LESSON_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PREFERRED_MODES,
  PRICING_TIERS,
  PROGRAM_STATUSES,
  PROJECT_STATUSES,
  RESOURCE_TYPES,
  ROLES,
  SESSION_STATUSES,
  SESSION_TYPES,
  SKILL_LEVELS,
} from "./enums";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const trimmed = (min: number, max: number, what = "This field") =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${what} is required` : `${what} must be at least ${min} characters`)
    .max(max, `${what} must be at most ${max} characters`);

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const httpUrl = z
  .url({ protocol: /^https?$/, error: "Enter a valid URL starting with https://" })
  .max(500);

export const optionalUrl = z.union([z.literal(""), httpUrl]).optional();

const hostUrl = (hosts: string[], name: string) =>
  z
    .union([
      z.literal(""),
      httpUrl.refine((value) => {
        try {
          const host = new URL(value).hostname.replace(/^www\./, "");
          return hosts.some((h) => host === h || host.endsWith(`.${h}`));
        } catch {
          return false;
        }
      }, `Enter a valid ${name} URL`),
    ])
    .optional();

export const githubUrl = hostUrl(["github.com"], "GitHub");
export const linkedinUrl = hostUrl(["linkedin.com"], "LinkedIn");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{8,16}[0-9]$/, "Enter a valid phone / WhatsApp number");

export const isoDate = z.iso.date({ error: "Enter a valid date" });
export const isoDateTime = z.iso.datetime({ offset: true, error: "Enter a valid date & time" });

const stringList = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems);

/** Firestore auto-ids and slugs only. Guards document-path injection. */
export const docId = z
  .string()
  .trim()
  .min(1, "Required")
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid identifier");

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

/* ------------------------------------------------------------------ */
/* Auth & profile                                                      */
/* ------------------------------------------------------------------ */

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: trimmed(2, 80, "Name"),
    email: z.email("Enter a valid email"),
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.literal(true, { error: "Please accept the terms to continue" }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const forgotPasswordSchema = z.object({ email: z.email("Enter a valid email") });

export const profileSchema = z.object({
  name: trimmed(2, 80, "Name"),
  phone: z.union([z.literal(""), phoneSchema]).optional(),
  college: optionalText(150),
  degree: z.union([z.literal(""), z.enum(DEGREES)]).optional(),
  branch: optionalText(100),
  year: z.union([z.literal(""), z.enum(ACADEMIC_YEARS)]).optional(),
  location: optionalText(100),
  bio: optionalText(600),
  skills: stringList(25, 40).optional(),
  github: githubUrl,
  linkedin: linkedinUrl,
  portfolio: optionalUrl,
  profileImagePath: optionalText(300),
  resumePath: optionalText(300),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const onboardingSchema = profileSchema.extend({
  phone: phoneSchema,
  college: trimmed(2, 150, "College"),
  degree: z.enum(DEGREES),
  branch: trimmed(2, 100, "Branch"),
  year: z.enum(ACADEMIC_YEARS),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

/* ------------------------------------------------------------------ */
/* Internship application (mirrors the Google Form structure)          */
/* ------------------------------------------------------------------ */

export const applicationSchema = z.object({
  // Student details
  fullName: trimmed(2, 100, "Full name"),
  email: z.email("Enter a valid email"),
  phone: phoneSchema,
  location: trimmed(2, 100, "Location"),
  // Academic details
  college: trimmed(2, 150, "College"),
  degree: z.enum(DEGREES, { error: "Select your degree" }),
  branch: trimmed(2, 100, "Branch"),
  academicYear: z.enum(ACADEMIC_YEARS, { error: "Select your academic year" }),
  // Internship domain
  programId: docId.describe("Selected domain"),
  // Technical skills & experience
  technicalSkills: z
    .array(z.string().trim().min(1).max(40))
    .min(1, "Add at least one skill")
    .max(20, "Up to 20 skills"),
  skillLevel: z.enum(SKILL_LEVELS, { error: "Select your skill level" }),
  experience: optionalText(1500),
  // Profile links
  github: githubUrl,
  linkedin: linkedinUrl,
  portfolio: optionalUrl,
  resumePath: optionalText(300),
  // Preferences
  preferredMode: z.enum(PREFERRED_MODES, { error: "Select a mode" }),
  availability: z.enum(AVAILABILITY_OPTIONS, { error: "Select your availability" }),
  hoursPerWeek: z.enum(HOURS_PER_WEEK, { error: "Select weekly hours" }),
  motivation: trimmed(30, 2000, "Motivation"),
  earlyBirdInterest: z.boolean(),
  consent: z.literal(true, { error: "Consent is required to submit" }),
  /** Honeypot: must stay empty. */
  website: z.string().max(0).optional(),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const contactSchema = z.object({
  name: trimmed(2, 80, "Name"),
  email: z.email("Enter a valid email"),
  phone: z.union([z.literal(""), phoneSchema]).optional(),
  subject: trimmed(3, 120, "Subject"),
  message: trimmed(10, 3000, "Message"),
  website: z.string().max(0).optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const supportSchema = z.object({
  subject: trimmed(3, 120, "Subject"),
  message: trimmed(10, 3000, "Message"),
});

/* ------------------------------------------------------------------ */
/* Admin: applications, enrollment, payment                            */
/* ------------------------------------------------------------------ */

export const applicationStatusSchema = z.object({
  applicationId: docId,
  status: z.enum(APPLICATION_STATUSES),
  note: optionalText(1000),
});

export const approveApplicationSchema = z.object({
  applicationId: docId,
  pricingTier: z.enum(["AUTO", ...PRICING_TIERS]),
  batchId: z.union([z.literal(""), docId]).optional(),
  mentorId: z.union([z.literal(""), docId]).optional(),
  note: optionalText(1000),
});
export type ApproveApplicationInput = z.infer<typeof approveApplicationSchema>;

export const rejectApplicationSchema = z.object({
  applicationId: docId,
  reason: trimmed(3, 1000, "Reason"),
});

export const applicationNoteSchema = z.object({
  applicationId: docId,
  text: trimmed(1, 1000, "Note"),
});

export const assignApplicationSchema = z.object({
  applicationId: docId,
  programId: z.union([z.literal(""), docId]).optional(),
  batchId: z.union([z.literal(""), docId]).optional(),
  mentorId: z.union([z.literal(""), docId]).optional(),
});

/** Student reports that they completed the offline/manual payment. */
export const paymentReportSchema = z.object({
  enrollmentId: docId,
  method: z.enum(PAYMENT_METHODS),
  reference: trimmed(3, 80, "Reference"),
  paidOn: isoDate,
  note: optionalText(500),
});
export type PaymentReportInput = z.infer<typeof paymentReportSchema>;

export const paymentUpdateSchema = z.object({
  enrollmentId: docId,
  status: z.enum(PAYMENT_STATUSES),
  method: z.union([z.literal(""), z.enum(PAYMENT_METHODS)]).optional(),
  reference: optionalText(80),
  paidOn: z.union([z.literal(""), isoDate]).optional(),
  totalAmount: z.number().int().min(0).max(1_000_000).optional(),
  adminNote: optionalText(1000),
  activate: z.boolean().optional(),
});
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;

export const enrollmentUpdateSchema = z.object({
  enrollmentId: docId,
  status: z.enum(ENROLLMENT_STATUSES).optional(),
  batchId: z.union([z.literal(""), docId]).optional(),
  mentorId: z.union([z.literal(""), docId]).optional(),
});

/* ------------------------------------------------------------------ */
/* Admin: configuration                                                */
/* ------------------------------------------------------------------ */

export const programSchema = z.object({
  slug: slugSchema,
  name: trimmed(3, 120, "Name"),
  domain: trimmed(2, 80, "Domain"),
  tagline: trimmed(3, 200, "Tagline"),
  description: trimmed(10, 4000, "Description"),
  durationMonths: z.number().int().min(1).max(24),
  durationLabel: trimmed(2, 40, "Duration label"),
  fees: z.object({
    earlyBird: z.number().int().min(0).max(1_000_000),
    regular: z.number().int().min(0).max(1_000_000),
  }),
  eligibility: stringList(20, 200),
  skills: stringList(40, 80),
  technologies: stringList(40, 60),
  benefits: stringList(20, 200),
  curriculum: z
    .array(z.object({ title: trimmed(2, 120, "Module title"), topics: stringList(30, 200) }))
    .max(30),
  roadmap: z
    .array(
      z.object({
        week: trimmed(1, 30, "Week"),
        title: trimmed(2, 120, "Title"),
        description: optionalText(600).transform((v) => v ?? ""),
      }),
    )
    .max(30),
  certificateInfo: optionalText(1000).transform((v) => v ?? ""),
  faqs: z
    .array(z.object({ question: trimmed(3, 200, "Question"), answer: trimmed(3, 1500, "Answer") }))
    .max(30),
  mode: trimmed(2, 60, "Mode"),
  accent: z.enum(["lime", "pink", "cyan", "blue"]),
  status: z.enum(PROGRAM_STATUSES),
  order: z.number().int().min(0).max(999),
});
export type ProgramInput = z.infer<typeof programSchema>;
export type ProgramFormValues = z.input<typeof programSchema>;

export const batchSchema = z
  .object({
    programId: docId,
    name: trimmed(2, 80, "Name"),
    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers and hyphens"),
    startDate: isoDate,
    endDate: isoDate,
    capacity: z.number().int().min(1).max(1000),
    mentorIds: z.array(docId).max(20),
    schedule: optionalText(300),
    status: z.enum(BATCH_STATUSES),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "End date must be after start date",
  });
export type BatchInput = z.infer<typeof batchSchema>;

export const courseSchema = z.object({
  programId: docId,
  title: trimmed(2, 120, "Title"),
  description: optionalText(2000).transform((v) => v ?? ""),
  modules: z
    .array(z.object({ id: z.string().max(40).optional(), title: trimmed(2, 120, "Module title") }))
    .min(1, "Add at least one module")
    .max(40),
  order: z.number().int().min(0).max(999),
  status: z.enum(CONTENT_STATUSES),
});
export type CourseInput = z.infer<typeof courseSchema>;

export const quizQuestionSchema = z.object({
  id: z.string().max(40).optional(),
  question: trimmed(3, 500, "Question"),
  options: z.array(trimmed(1, 200, "Option")).min(2, "At least 2 options").max(6),
  answerIndex: z.number().int().min(0).max(5),
});

export const lessonSchema = z
  .object({
    courseId: docId,
    moduleId: z.string().trim().min(1, "Select a module").max(40),
    title: trimmed(2, 160, "Title"),
    summary: optionalText(400).transform((v) => v ?? ""),
    type: z.enum(LESSON_TYPES),
    content: optionalText(20000).transform((v) => v ?? ""),
    videoUrl: optionalUrl,
    pdfUrl: optionalUrl,
    repoUrl: optionalUrl,
    resources: z.array(z.object({ label: trimmed(1, 100, "Label"), url: httpUrl })).max(20),
    quiz: z.array(quizQuestionSchema).max(30).optional(),
    quizPassPercent: z.number().int().min(0).max(100).optional(),
    durationMinutes: z.number().int().min(0).max(600),
    order: z.number().int().min(0).max(999),
    status: z.enum(CONTENT_STATUSES),
  })
  .superRefine((v, ctx) => {
    if (v.type === "VIDEO" && !v.videoUrl) {
      ctx.addIssue({ code: "custom", path: ["videoUrl"], message: "Video lessons need a video URL" });
    }
    if (v.type === "PDF" && !v.pdfUrl) {
      ctx.addIssue({ code: "custom", path: ["pdfUrl"], message: "PDF lessons need a PDF URL" });
    }
    if (v.type === "REPO" && !v.repoUrl) {
      ctx.addIssue({ code: "custom", path: ["repoUrl"], message: "Repository lessons need a repo URL" });
    }
    if (v.type === "QUIZ" && (!v.quiz || v.quiz.length === 0)) {
      ctx.addIssue({ code: "custom", path: ["quiz"], message: "Quiz lessons need at least one question" });
    }
    v.quiz?.forEach((q, i) => {
      if (q.answerIndex >= q.options.length) {
        ctx.addIssue({
          code: "custom",
          path: ["quiz", i, "answerIndex"],
          message: "Pick one of the options as the answer",
        });
      }
    });
  });
export type LessonInput = z.infer<typeof lessonSchema>;
export type LessonFormValues = z.input<typeof lessonSchema>;

export const storedFileSchema = z.object({
  name: z.string().max(200),
  path: z.string().max(400),
  url: z.string().max(2000),
  size: z.number().int().min(0),
  contentType: z.string().max(120),
});

export const assignmentSchema = z.object({
  programId: docId,
  batchId: z.union([z.literal(""), docId]).optional(),
  courseId: z.union([z.literal(""), docId]).optional(),
  title: trimmed(3, 160, "Title"),
  description: trimmed(10, 4000, "Description"),
  instructions: optionalText(8000).transform((v) => v ?? ""),
  dueDate: isoDateTime,
  maxScore: z.number().int().min(1).max(1000),
  allowFileUpload: z.boolean(),
  attachmentPaths: z.array(z.string().max(400)).max(10).optional(),
  status: z.enum(CONTENT_STATUSES),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const submissionSchema = z
  .object({
    assignmentId: docId,
    githubUrl: githubUrl,
    liveUrl: optionalUrl,
    explanation: optionalText(4000),
    filePaths: z.array(z.string().max(400)).max(5).optional(),
    submit: z.boolean(),
  })
  .refine((v) => !v.submit || Boolean(v.githubUrl || v.liveUrl || v.filePaths?.length), {
    path: ["githubUrl"],
    message: "Add a GitHub URL, a live URL or a file before submitting",
  });
export type SubmissionInput = z.infer<typeof submissionSchema>;

export const reviewSubmissionSchema = z.object({
  submissionId: z.string().regex(/^[A-Za-z0-9]+_[A-Za-z0-9]+$/, "Invalid submission"),
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REVISION_REQUIRED"]),
  score: z.number().min(0).max(1000).optional(),
  feedback: optionalText(4000),
});
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

export const projectAssignSchema = z.object({
  enrollmentId: docId,
  title: trimmed(3, 160, "Title"),
  description: trimmed(10, 4000, "Description"),
  techStack: stringList(20, 40),
  dueDate: z.union([z.literal(""), isoDate]).optional(),
  maxScore: z.number().int().min(1).max(1000),
});
export type ProjectAssignInput = z.infer<typeof projectAssignSchema>;

export const projectSubmitSchema = z.object({
  projectId: docId,
  githubUrl: githubUrl,
  liveUrl: optionalUrl,
  documentationUrl: optionalUrl,
  screenshotPaths: z.array(z.string().max(400)).max(6).optional(),
  submit: z.boolean(),
});
export type ProjectSubmitInput = z.infer<typeof projectSubmitSchema>;

export const projectReviewSchema = z.object({
  projectId: docId,
  status: z.enum(PROJECT_STATUSES),
  score: z.number().min(0).max(1000).optional(),
  feedback: optionalText(4000),
  featured: z.boolean().optional(),
});
export type ProjectReviewInput = z.infer<typeof projectReviewSchema>;

export const sessionSchema = z.object({
  batchId: docId,
  title: trimmed(3, 160, "Title"),
  description: optionalText(2000),
  type: z.enum(SESSION_TYPES),
  startAt: isoDateTime,
  durationMinutes: z.number().int().min(10).max(600),
  meetingUrl: optionalUrl,
  status: z.enum(SESSION_STATUSES),
});
export type SessionInput = z.infer<typeof sessionSchema>;

export const attendanceSchema = z.object({
  sessionId: docId,
  records: z
    .array(z.object({ uid: docId, status: z.enum(ATTENDANCE_STATUSES) }))
    .min(1)
    .max(500),
});
export type AttendanceInput = z.infer<typeof attendanceSchema>;

export const announcementSchema = z
  .object({
    title: trimmed(3, 160, "Title"),
    body: trimmed(3, 5000, "Message"),
    audience: z.enum(ANNOUNCEMENT_AUDIENCES),
    programId: z.union([z.literal(""), docId]).optional(),
    batchId: z.union([z.literal(""), docId]).optional(),
    pinned: z.boolean(),
    notify: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.audience === "PROGRAM" && !v.programId) {
      ctx.addIssue({ code: "custom", path: ["programId"], message: "Choose a program" });
    }
    if (v.audience === "BATCH" && !v.batchId) {
      ctx.addIssue({ code: "custom", path: ["batchId"], message: "Choose a batch" });
    }
  });
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const resourceSchema = z.object({
  programId: docId,
  batchId: z.union([z.literal(""), docId]).optional(),
  title: trimmed(2, 160, "Title"),
  description: optionalText(1000),
  type: z.enum(RESOURCE_TYPES),
  url: z.union([z.literal(""), httpUrl]).optional(),
  storagePath: optionalText(400),
});
export type ResourceInput = z.infer<typeof resourceSchema>;

/** A request for a signed upload URL; the server picks the final file name. */
export const uploadRequestSchema = z.object({
  folder: z.string().max(300),
  fileName: z.string().min(1).max(255),
  contentType: z.string().max(200),
  size: z.number().int().positive(),
});

export const roleChangeSchema = z.object({
  email: z.email(),
  role: z.enum(ROLES),
});

export const teamMemberSchema = z.object({
  name: trimmed(2, 80, "Name"),
  role: trimmed(2, 80, "Role"),
  bio: optionalText(600),
  photoUrl: optionalUrl,
  linkedin: linkedinUrl,
  github: githubUrl,
  order: z.number().int().min(0).max(999),
  visible: z.boolean(),
});
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

/** One tier's payment QR in the settings form: an uploaded (or already saved) image path and its amount. */
const paymentQrSchema = z.object({
  path: z.union([z.literal(""), z.string().max(400)]).optional(),
  amount: z.number().int().min(1, "Enter the amount in ₹").max(1_000_000).optional(),
});

export const settingsSchema = z.object({
  applicationsOpen: z.boolean(),
  earlyBird: z.object({
    enabled: z.boolean(),
    limit: z.number().int().min(0).max(10_000),
    showRemaining: z.boolean(),
  }),
  payment: z.object({
    instructions: trimmed(10, 4000, "Payment instructions"),
    payeeName: optionalText(120),
    upiId: optionalText(120),
    bankDetails: optionalText(1000),
    supportContact: optionalText(200),
    qrCodes: z.object({ EARLY_BIRD: paymentQrSchema, REGULAR: paymentQrSchema }),
  }),
  contact: z.object({
    email: z.union([z.literal(""), z.email()]).optional(),
    phone: optionalText(40),
    whatsapp: optionalText(40),
    address: optionalText(400),
    hours: optionalText(120),
    linkedin: optionalUrl,
    instagram: optionalUrl,
  }),
  certificate: z.object({
    minLessonPercent: z.number().int().min(0).max(100),
    minAssignmentPercent: z.number().int().min(0).max(100),
    minAttendancePercent: z.number().int().min(0).max(100),
    requireProjectCompleted: z.boolean(),
    signatoryName: optionalText(120),
    signatoryTitle: optionalText(120),
  }),
  ai: z.object({
    enabled: z.boolean(),
    dailyLimit: z.number().int().min(0).max(500),
  }),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

/* ------------------------------------------------------------------ */
/* AI                                                                  */
/* ------------------------------------------------------------------ */

export const AI_INTENTS = [
  "EXPLAIN_CONCEPT",
  "EXPLAIN_CODE",
  "DEBUG_ERROR",
  "HINT",
  "WHAT_NEXT",
  "EXPLAIN_ASSIGNMENT",
  "GENERAL",
] as const;

export const aiChatSchema = z.object({
  intent: z.enum(AI_INTENTS).default("GENERAL"),
  assignmentId: z.union([z.literal(""), docId]).optional(),
  lessonId: z.union([z.literal(""), docId]).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(6000),
      }),
    )
    .min(1)
    .max(20),
});
export type AIChatInput = z.infer<typeof aiChatSchema>;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Luhn check, used to refuse card numbers in free-text payment fields. */
export function looksLikeCardNumber(text: string): boolean {
  const candidates = text.replace(/[\s-]/g, "").match(/\d{13,19}/g) ?? [];
  return candidates.some((digits) => {
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = Number(digits[i]);
      if (double) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      double = !double;
    }
    return sum % 10 === 0;
  });
}

export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
