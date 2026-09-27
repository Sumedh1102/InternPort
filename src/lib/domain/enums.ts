/**
 * Canonical status vocabularies for the whole platform.
 * Every Firestore document, Zod schema, security rule and UI badge uses these values.
 */

export const ROLES = ["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES: readonly Role[] = ["MENTOR", "ADMIN", "SUPER_ADMIN"];
export const ADMIN_ROLES: readonly Role[] = ["ADMIN", "SUPER_ADMIN"];

export const PROGRAM_STATUSES = ["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "ENROLLED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Manual payment tracking (V1 has no payment gateway). */
export const PAYMENT_STATUSES = [
  "PAYMENT_PENDING",
  "PAYMENT_IN_REVIEW",
  "PAYMENT_CONFIRMED",
  "PAYMENT_REJECTED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Where a payment is processed. Only MANUAL exists in V1; gateways plug in later. */
export const PAYMENT_PROVIDERS = ["MANUAL"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_METHODS = ["UPI", "BANK_TRANSFER", "CASH", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PRICING_TIERS = ["EARLY_BIRD", "REGULAR"] as const;
export type PricingTier = (typeof PRICING_TIERS)[number];

export const ENROLLMENT_STATUSES = [
  "AWAITING_PAYMENT",
  "ACTIVE",
  "COMPLETED",
  "SUSPENDED",
  "CANCELLED",
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const BATCH_STATUSES = ["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const LESSON_TYPES = ["VIDEO", "ARTICLE", "PDF", "QUIZ", "REPO"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const SUBMISSION_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REVISION_REQUIRED",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const PROJECT_STATUSES = [
  "ASSIGNED",
  "IN_PROGRESS",
  "SUBMITTED",
  "REVIEWED",
  "EVALUATED",
  "COMPLETED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const SESSION_TYPES = ["LIVE_CLASS", "WORKSHOP", "DOUBT_SESSION", "REVIEW"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const CERTIFICATE_STATUSES = ["VALID", "REVOKED"] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

export const ANNOUNCEMENT_AUDIENCES = ["ALL", "PROGRAM", "BATCH", "MENTORS"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const EVALUATION_TYPES = ["ASSIGNMENT", "PROJECT"] as const;
export type EvaluationType = (typeof EVALUATION_TYPES)[number];

export const RESOURCE_TYPES = ["LINK", "PDF", "VIDEO", "REPO", "DOC"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "APPLICATION_RECEIVED",
  "APPLICATION_APPROVED",
  "APPLICATION_REJECTED",
  "PAYMENT_UPDATE",
  "PAYMENT_VERIFIED",
  "ENROLLMENT_ACTIVATED",
  "NEW_LESSON",
  "NEW_ASSIGNMENT",
  "ASSIGNMENT_FEEDBACK",
  "SESSION_SCHEDULED",
  "SESSION_REMINDER",
  "PROJECT_ASSIGNED",
  "PROJECT_FEEDBACK",
  "CERTIFICATE_ISSUED",
  "ANNOUNCEMENT",
  "GENERAL",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/* ---------- Application form vocabularies (mirrors the Google Form) ---------- */

export const DEGREES = [
  "DIPLOMA",
  "BE",
  "BTECH",
  "BCA",
  "MCA",
  "BSC",
  "MSC",
  "OTHER",
] as const;
export type Degree = (typeof DEGREES)[number];

export const ACADEMIC_YEARS = [
  "FIRST_YEAR",
  "SECOND_YEAR",
  "THIRD_YEAR",
  "FOURTH_YEAR",
  "FINAL_YEAR",
  "GRADUATED",
] as const;
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const PREFERRED_MODES = ["ONLINE", "OFFLINE", "HYBRID"] as const;
export type PreferredMode = (typeof PREFERRED_MODES)[number];

export const AVAILABILITY_OPTIONS = [
  "FULL_TIME",
  "WEEKDAYS",
  "WEEKENDS",
  "FLEXIBLE",
] as const;
export type Availability = (typeof AVAILABILITY_OPTIONS)[number];

export const HOURS_PER_WEEK = ["LT_10", "10_20", "20_30", "GT_30"] as const;
export type HoursPerWeek = (typeof HOURS_PER_WEEK)[number];

/* ---------- Human labels ---------- */

export const LABELS: Record<string, string> = {
  STUDENT: "Student",
  MENTOR: "Mentor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ENROLLED: "Enrolled",
  PAYMENT_PENDING: "Payment pending",
  PAYMENT_IN_REVIEW: "Payment in review",
  PAYMENT_CONFIRMED: "Payment confirmed",
  PAYMENT_REJECTED: "Payment rejected",
  MANUAL: "Manual",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash / in person",
  OTHER: "Other",
  EARLY_BIRD: "Early bird",
  REGULAR: "Regular",
  AWAITING_PAYMENT: "Awaiting payment",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  UPCOMING: "Upcoming",
  VIDEO: "Video",
  ARTICLE: "Notes",
  PDF: "PDF",
  QUIZ: "Quiz",
  REPO: "Code repo",
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  REVISION_REQUIRED: "Revision required",
  ASSIGNED: "Assigned",
  REVIEWED: "Reviewed",
  EVALUATED: "Evaluated",
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
  LIVE_CLASS: "Live class",
  WORKSHOP: "Workshop",
  DOUBT_SESSION: "Doubt session",
  REVIEW: "Review",
  SCHEDULED: "Scheduled",
  VALID: "Valid",
  REVOKED: "Revoked",
  ALL: "Everyone",
  PROGRAM: "Program",
  BATCH: "Batch",
  MENTORS: "Mentors",
  LINK: "Link",
  DOC: "Document",
  ASSIGNMENT: "Assignment",
  PROJECT: "Project",
  DIPLOMA: "Diploma",
  BE: "B.E.",
  BTECH: "B.Tech",
  BCA: "BCA",
  MCA: "MCA",
  BSC: "B.Sc",
  MSC: "M.Sc",
  FIRST_YEAR: "1st year",
  SECOND_YEAR: "2nd year",
  THIRD_YEAR: "3rd year",
  FOURTH_YEAR: "4th year",
  FINAL_YEAR: "Final year",
  GRADUATED: "Graduated",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  ONLINE: "Online",
  OFFLINE: "Offline",
  HYBRID: "Hybrid",
  FULL_TIME: "Full time",
  WEEKDAYS: "Weekdays",
  WEEKENDS: "Weekends",
  FLEXIBLE: "Flexible",
  LT_10: "Less than 10 hrs",
  "10_20": "10–20 hrs",
  "20_30": "20–30 hrs",
  GT_30: "30+ hrs",
};

export function label(value: string | null | undefined): string {
  if (!value) return "—";
  return LABELS[value] ?? value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
