import type {
  AcademicYear,
  AnnouncementAudience,
  ApplicationStatus,
  AttendanceStatus,
  Availability,
  BatchStatus,
  CertificateStatus,
  ContentStatus,
  Degree,
  EnrollmentStatus,
  EvaluationType,
  HoursPerWeek,
  LessonType,
  NotificationType,
  PaymentMethod,
  PaymentProviderId,
  PaymentStatus,
  PreferredMode,
  PricingTier,
  ProgramStatus,
  ProjectStatus,
  ResourceType,
  Role,
  SessionStatus,
  SessionType,
  SkillLevel,
  SubmissionStatus,
} from "./enums";

/**
 * Document shapes as they cross the server → client boundary.
 * Firestore Timestamps are serialized to ISO strings by the data layer.
 */

export type ISODate = string;

export interface StoredFile {
  name: string;
  path: string;
  url: string;
  size: number;
  contentType: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  college?: string;
  degree?: string;
  branch?: string;
  year?: string;
  location?: string;
  profileImage?: string;
  profileImagePath?: string;
  resumeUrl?: string;
  resumePath?: string;
  skills?: string[];
  github?: string;
  linkedin?: string;
  portfolio?: string;
  bio?: string;
  onboarded?: boolean;
  disabled?: boolean;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface CurriculumModule {
  title: string;
  topics: string[];
}

export interface RoadmapItem {
  week: string;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ProgramFees {
  earlyBird: number;
  regular: number;
  currency: "INR";
  /** Fees are quoted per month, per course. */
  unit: "MONTH";
}

export interface Program {
  id: string;
  slug: string;
  name: string;
  domain: string;
  tagline: string;
  description: string;
  durationMonths: number;
  durationLabel: string;
  fees: ProgramFees;
  eligibility: string[];
  skills: string[];
  technologies: string[];
  curriculum: CurriculumModule[];
  roadmap: RoadmapItem[];
  benefits: string[];
  certificateInfo: string;
  faqs: FaqItem[];
  mode: string;
  accent: "lime" | "pink" | "cyan" | "blue";
  status: ProgramStatus;
  order: number;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface AdminNote {
  text: string;
  by: string;
  byName: string;
  at: ISODate;
}

export interface Application {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  degree: Degree;
  branch: string;
  academicYear: AcademicYear;
  location: string;
  programId: string;
  programSlug: string;
  programName: string;
  technicalSkills: string[];
  skillLevel: SkillLevel;
  experience?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  resumeUrl?: string;
  resumePath?: string;
  preferredMode: PreferredMode;
  availability: Availability;
  hoursPerWeek: HoursPerWeek;
  motivation: string;
  earlyBirdInterest: boolean;
  consent: boolean;
  status: ApplicationStatus;
  notes: AdminNote[];
  pricingTier?: PricingTier;
  enrollmentId?: string;
  assignedBatchId?: string;
  assignedMentorId?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: ISODate;
  createdAt: ISODate;
  updatedAt?: ISODate;
}

export interface Batch {
  id: string;
  programId: string;
  programName: string;
  name: string;
  code: string;
  startDate: ISODate;
  endDate: ISODate;
  mentorIds: string[];
  capacity: number;
  studentCount: number;
  schedule?: string;
  status: BatchStatus;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface PaymentHistoryEntry {
  status: PaymentStatus;
  note?: string;
  by: string;
  byName: string;
  at: ISODate;
}

/** Payment record embedded in an enrollment. Gateway fields can be added without restructuring. */
export interface EnrollmentPayment {
  provider: PaymentProviderId;
  status: PaymentStatus;
  pricingTier: PricingTier;
  monthlyFee: number;
  months: number;
  totalAmount: number;
  currency: "INR";
  method?: PaymentMethod;
  reference?: string;
  paidOn?: ISODate;
  studentNote?: string;
  adminNote?: string;
  verifiedBy?: string;
  verifiedAt?: ISODate;
  history: PaymentHistoryEntry[];
  updatedAt?: ISODate;
}

export interface EnrollmentProgress {
  lessonsCompleted: number;
  lessonsTotal: number;
  lessonPercent: number;
  updatedAt?: ISODate;
}

export interface AIInsights {
  summary: string;
  recommendations: string[];
  generatedAt: ISODate;
  source: "ai" | "rules";
}

export interface Enrollment {
  id: string;
  uid: string;
  studentName: string;
  studentEmail: string;
  applicationId: string;
  programId: string;
  programName: string;
  programSlug: string;
  batchId?: string;
  batchName?: string;
  mentorId?: string;
  mentorName?: string;
  status: EnrollmentStatus;
  payment: EnrollmentPayment;
  completedLessonIds: string[];
  progress: EnrollmentProgress;
  insights?: AIInsights;
  certificateId?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  activatedAt?: ISODate;
  completedAt?: ISODate;
  createdAt: ISODate;
  updatedAt?: ISODate;
}

export interface CourseModule {
  id: string;
  title: string;
  order: number;
}

export interface Course {
  id: string;
  programId: string;
  title: string;
  description: string;
  modules: CourseModule[];
  order: number;
  status: ContentStatus;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface LessonLink {
  label: string;
  url: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  programId: string;
  moduleId: string;
  title: string;
  summary: string;
  type: LessonType;
  content: string;
  videoUrl?: string;
  pdfUrl?: string;
  repoUrl?: string;
  resources: LessonLink[];
  /** Questions only. Answer keys live in lessons/{id}/answerKey/key and never reach students. */
  quiz?: QuizQuestion[];
  quizPassPercent?: number;
  durationMinutes: number;
  order: number;
  status: ContentStatus;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface Assignment {
  id: string;
  programId: string;
  batchId?: string | null;
  courseId?: string | null;
  title: string;
  description: string;
  instructions: string;
  dueDate: ISODate;
  maxScore: number;
  allowFileUpload: boolean;
  attachments: StoredFile[];
  status: ContentStatus;
  createdBy: string;
  createdByName: string;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  uid: string;
  studentName: string;
  enrollmentId: string;
  programId: string;
  batchId?: string;
  status: SubmissionStatus;
  githubUrl?: string;
  liveUrl?: string;
  explanation?: string;
  files: StoredFile[];
  score?: number;
  maxScore: number;
  feedback?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: ISODate;
  submittedAt?: ISODate;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface Project {
  id: string;
  uid: string;
  studentName: string;
  enrollmentId: string;
  programId: string;
  programName: string;
  batchId?: string;
  mentorId?: string;
  title: string;
  description: string;
  techStack: string[];
  status: ProjectStatus;
  githubUrl?: string;
  liveUrl?: string;
  documentationUrl?: string;
  screenshots: StoredFile[];
  score?: number;
  maxScore: number;
  feedback?: string;
  dueDate?: ISODate;
  featured: boolean;
  submittedAt?: ISODate;
  reviewedAt?: ISODate;
  completedAt?: ISODate;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface Session {
  id: string;
  programId: string;
  batchId: string;
  batchName?: string;
  title: string;
  description?: string;
  type: SessionType;
  startAt: ISODate;
  durationMinutes: number;
  meetingUrl?: string;
  mentorId: string;
  mentorName?: string;
  status: SessionStatus;
  reminderSentAt?: ISODate;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  sessionTitle: string;
  batchId: string;
  programId: string;
  uid: string;
  studentName: string;
  date: ISODate;
  status: AttendanceStatus;
  markedBy: string;
  markedAt?: ISODate;
}

export interface Evaluation {
  id: string;
  uid: string;
  enrollmentId: string;
  type: EvaluationType;
  refId: string;
  title: string;
  score: number;
  maxScore: number;
  feedback?: string;
  evaluatorId: string;
  evaluatorName: string;
  createdAt?: ISODate;
}

export interface Certificate {
  id: string;
  certificateId: string;
  studentId: string;
  studentName: string;
  programId: string;
  programName: string;
  batchName?: string;
  enrollmentId: string;
  startDate: ISODate;
  endDate: ISODate;
  issuedAt: ISODate;
  verificationToken: string;
  status: CertificateStatus;
  issuedBy: string;
  revokedReason?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  programId?: string | null;
  batchId?: string | null;
  pinned: boolean;
  authorId: string;
  authorName: string;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface AppNotification {
  id: string;
  uid: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt?: ISODate;
}

export interface Resource {
  id: string;
  programId: string;
  batchId?: string | null;
  title: string;
  description?: string;
  type: ResourceType;
  url: string;
  storagePath?: string;
  createdBy: string;
  createdAt?: ISODate;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
  photoUrl?: string;
  linkedin?: string;
  github?: string;
  order: number;
  visible: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  kind: "CONTACT" | "SUPPORT";
  uid?: string;
  handled: boolean;
  createdAt?: ISODate;
}

export interface CertificateCriteria {
  minLessonPercent: number;
  minAssignmentPercent: number;
  minAttendancePercent: number;
  requireProjectCompleted: boolean;
}

/** A payment QR code shown to students on one pricing tier. `amount` is the ₹ it charges, for the caption. */
export interface PaymentQrCode extends StoredFile {
  amount?: number | null;
}

export interface PlatformSettings {
  applicationsOpen: boolean;
  earlyBird: {
    enabled: boolean;
    limit: number;
    claimed: number;
    showRemaining: boolean;
  };
  payment: {
    instructions: string;
    payeeName?: string;
    upiId?: string;
    bankDetails?: string;
    supportContact?: string;
    /** Keyed by pricing tier; `null` means the admin removed that tier's QR code. */
    qrCodes?: Partial<Record<PricingTier, PaymentQrCode | null>>;
  };
  contact: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    hours?: string;
    linkedin?: string;
    instagram?: string;
  };
  certificate: CertificateCriteria & {
    signatoryName?: string;
    signatoryTitle?: string;
  };
  ai: {
    enabled: boolean;
    dailyLimit: number;
  };
  updatedAt?: ISODate;
}

/** Normalised result returned by every server action. */
export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
