import "server-only";

import type { Role } from "@/lib/domain/enums";
import type {
  Announcement,
  AppNotification,
  Application,
  Assignment,
  AttendanceRecord,
  Batch,
  Certificate,
  ContactMessage,
  Course,
  Enrollment,
  Evaluation,
  Lesson,
  Project,
  Resource,
  Session,
  Submission,
  TeamMember,
  UserProfile,
} from "@/lib/domain/types";
import { COL, byDateAsc, byDateDesc, col, getDocById, queryDocs, whereIn } from "../db";

/* ------------------------------ Users ------------------------------ */

export const getUser = (uid: string) => getDocById<UserProfile>(COL.users, uid);

export async function getUsersByRole(roles: Role[]): Promise<UserProfile[]> {
  const users = await queryDocs<UserProfile>(col(COL.users).where("role", "in", roles));
  return users.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const [user] = await queryDocs<UserProfile>(
    col(COL.users).where("email", "==", email.toLowerCase()).limit(1),
  );
  return user ?? null;
}

export async function getUsersMap(uids: string[]): Promise<Map<string, UserProfile>> {
  const users = await whereIn<UserProfile>(COL.users, "__name__", uids);
  return new Map(users.map((u) => [u.id, u]));
}

/* --------------------------- Applications -------------------------- */

export const getApplication = (id: string) => getDocById<Application>(COL.applications, id);

export async function getApplicationsForUser(uid: string): Promise<Application[]> {
  const apps = await queryDocs<Application>(col(COL.applications).where("uid", "==", uid));
  return apps.sort(byDateDesc("createdAt"));
}

export async function listApplications(limit = 1000): Promise<Application[]> {
  return queryDocs<Application>(col(COL.applications).orderBy("createdAt", "desc").limit(limit));
}

/* ---------------------------- Enrollments -------------------------- */

export const getEnrollment = (id: string) => getDocById<Enrollment>(COL.enrollments, id);

export async function getEnrollmentsForUser(uid: string): Promise<Enrollment[]> {
  const list = await queryDocs<Enrollment>(col(COL.enrollments).where("uid", "==", uid));
  return list.sort(byDateDesc("createdAt"));
}

const ENROLLMENT_PRIORITY: Record<string, number> = {
  ACTIVE: 0,
  AWAITING_PAYMENT: 1,
  COMPLETED: 2,
  SUSPENDED: 3,
  CANCELLED: 4,
};

/** The enrollment the student dashboard focuses on. */
export function pickCurrentEnrollment(list: Enrollment[]): Enrollment | null {
  return (
    [...list].sort(
      (a, b) =>
        (ENROLLMENT_PRIORITY[a.status] ?? 9) - (ENROLLMENT_PRIORITY[b.status] ?? 9) ||
        b.createdAt.localeCompare(a.createdAt),
    )[0] ?? null
  );
}

export async function listEnrollments(): Promise<Enrollment[]> {
  const list = await queryDocs<Enrollment>(col(COL.enrollments));
  return list.sort(byDateDesc("createdAt"));
}

export async function getEnrollmentsForBatches(batchIds: string[]): Promise<Enrollment[]> {
  const list = await whereIn<Enrollment>(COL.enrollments, "batchId", batchIds);
  return list.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/* ------------------------------ Batches ---------------------------- */

export const getBatch = (id: string) => getDocById<Batch>(COL.batches, id);

export async function listBatches(): Promise<Batch[]> {
  const list = await queryDocs<Batch>(col(COL.batches));
  return list.sort(byDateDesc("startDate"));
}

export async function getBatchesForMentor(uid: string): Promise<Batch[]> {
  const list = await queryDocs<Batch>(col(COL.batches).where("mentorIds", "array-contains", uid));
  return list.sort(byDateDesc("startDate"));
}

/* -------------------------- Courses & lessons ---------------------- */

export async function getCourses(programId?: string, publishedOnly = false): Promise<Course[]> {
  const base = programId ? col(COL.courses).where("programId", "==", programId) : col(COL.courses);
  const list = await queryDocs<Course>(base);
  return list
    .filter((c) => !publishedOnly || c.status === "PUBLISHED")
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export const getCourse = (id: string) => getDocById<Course>(COL.courses, id);

export async function getLessons(programId?: string, publishedOnly = false): Promise<Lesson[]> {
  const base = programId ? col(COL.lessons).where("programId", "==", programId) : col(COL.lessons);
  const list = await queryDocs<Lesson>(base);
  return list
    .filter((l) => !publishedOnly || l.status === "PUBLISHED")
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export const getLesson = (id: string) => getDocById<Lesson>(COL.lessons, id);

/** Answer keys are stored apart from lessons so they are never serialized to students. */
export async function getLessonAnswerKey(lessonId: string): Promise<number[]> {
  const snap = await col(COL.lessons).doc(lessonId).collection("answerKey").doc("key").get();
  return (snap.get("answers") as number[] | undefined) ?? [];
}

/**
 * Orders lessons the way a student walks through them: course order → module order → lesson order.
 */
export function orderLessons(courses: Course[], lessons: Lesson[]): Lesson[] {
  const courseRank = new Map(courses.map((c, i) => [c.id, i]));
  const moduleRank = new Map(
    courses.flatMap((c) => c.modules.map((m) => [`${c.id}:${m.id}`, m.order] as const)),
  );
  return lessons
    .filter((l) => courseRank.has(l.courseId))
    .sort(
      (a, b) =>
        (courseRank.get(a.courseId) ?? 0) - (courseRank.get(b.courseId) ?? 0) ||
        (moduleRank.get(`${a.courseId}:${a.moduleId}`) ?? 0) -
          (moduleRank.get(`${b.courseId}:${b.moduleId}`) ?? 0) ||
        a.order - b.order,
    );
}

/* ---------------------- Assignments & submissions ------------------ */

export const getAssignment = (id: string) => getDocById<Assignment>(COL.assignments, id);

export async function listAssignments(programIds?: string[]): Promise<Assignment[]> {
  const list = programIds
    ? await whereIn<Assignment>(COL.assignments, "programId", programIds)
    : await queryDocs<Assignment>(col(COL.assignments));
  return list.sort(byDateAsc("dueDate"));
}

/** Published assignments visible to an enrollment (program-wide or targeted at its batch). */
export async function getAssignmentsForEnrollment(e: Pick<Enrollment, "programId" | "batchId">) {
  const list = await queryDocs<Assignment>(
    col(COL.assignments).where("programId", "==", e.programId),
  );
  return list
    .filter((a) => a.status === "PUBLISHED" && (!a.batchId || a.batchId === e.batchId))
    .sort(byDateAsc("dueDate"));
}

export const submissionId = (assignmentId: string, uid: string) => `${assignmentId}_${uid}`;

export const getSubmission = (id: string) => getDocById<Submission>(COL.submissions, id);

export async function getSubmissionsForUser(uid: string): Promise<Submission[]> {
  return queryDocs<Submission>(col(COL.submissions).where("uid", "==", uid));
}

export async function listSubmissions(opts: { batchIds?: string[]; programIds?: string[] } = {}) {
  let list: Submission[];
  if (opts.batchIds) list = await whereIn<Submission>(COL.submissions, "batchId", opts.batchIds);
  else if (opts.programIds)
    list = await whereIn<Submission>(COL.submissions, "programId", opts.programIds);
  else list = await queryDocs<Submission>(col(COL.submissions));
  return list
    .filter((s) => s.status !== "NOT_STARTED" && s.status !== "IN_PROGRESS")
    .sort(byDateDesc("submittedAt"));
}

/* ------------------------------ Projects --------------------------- */

export const getProject = (id: string) => getDocById<Project>(COL.projects, id);

export async function getProjectsForUser(uid: string): Promise<Project[]> {
  const list = await queryDocs<Project>(col(COL.projects).where("uid", "==", uid));
  return list.sort(byDateDesc("createdAt"));
}

export async function listProjects(opts: { batchIds?: string[] } = {}): Promise<Project[]> {
  const list = opts.batchIds
    ? await whereIn<Project>(COL.projects, "batchId", opts.batchIds)
    : await queryDocs<Project>(col(COL.projects));
  return list.sort(byDateDesc("updatedAt"));
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const list = await queryDocs<Project>(col(COL.projects).where("featured", "==", true));
  return list.filter((p) => p.status === "COMPLETED" || p.status === "EVALUATED");
}

/* ------------------------ Sessions & attendance -------------------- */

export const getSession = (id: string) => getDocById<Session>(COL.sessions, id);

export async function getSessionsForBatches(batchIds: string[]): Promise<Session[]> {
  const list = await whereIn<Session>(COL.sessions, "batchId", batchIds);
  return list.sort(byDateAsc("startAt"));
}

export async function listSessions(): Promise<Session[]> {
  const list = await queryDocs<Session>(col(COL.sessions));
  return list.sort(byDateDesc("startAt"));
}

export async function getAttendanceForUser(uid: string): Promise<AttendanceRecord[]> {
  const list = await queryDocs<AttendanceRecord>(col(COL.attendance).where("uid", "==", uid));
  return list.sort(byDateDesc("date"));
}

export async function getAttendanceForSession(sessionId: string): Promise<AttendanceRecord[]> {
  return queryDocs<AttendanceRecord>(col(COL.attendance).where("sessionId", "==", sessionId));
}

export async function getAttendanceForBatches(batchIds: string[]): Promise<AttendanceRecord[]> {
  return whereIn<AttendanceRecord>(COL.attendance, "batchId", batchIds);
}

/* ---------------------------- Evaluations -------------------------- */

export async function getEvaluationsForUser(uid: string): Promise<Evaluation[]> {
  const list = await queryDocs<Evaluation>(col(COL.evaluations).where("uid", "==", uid));
  return list.sort(byDateDesc("createdAt"));
}

/* ---------------------------- Certificates ------------------------- */

export const getCertificate = (id: string) => getDocById<Certificate>(COL.certificates, id);

export async function getCertificatesForUser(uid: string): Promise<Certificate[]> {
  const list = await queryDocs<Certificate>(col(COL.certificates).where("studentId", "==", uid));
  return list.sort(byDateDesc("issuedAt"));
}

export async function listCertificates(): Promise<Certificate[]> {
  const list = await queryDocs<Certificate>(col(COL.certificates));
  return list.sort(byDateDesc("issuedAt"));
}

/* ---------------------------- Announcements ------------------------ */

export async function listAnnouncements(): Promise<Announcement[]> {
  const list = await queryDocs<Announcement>(
    col(COL.announcements).orderBy("createdAt", "desc").limit(200),
  );
  return list;
}

export function announcementsFor(
  list: Announcement[],
  viewer: { role: Role; programIds: string[]; batchIds: string[] },
): Announcement[] {
  const staff = viewer.role !== "STUDENT";
  return list
    .filter((a) => {
      if (a.audience === "ALL") return true;
      if (a.audience === "MENTORS") return staff;
      if (a.audience === "PROGRAM") return staff || viewer.programIds.includes(a.programId ?? "");
      if (a.audience === "BATCH") return staff || viewer.batchIds.includes(a.batchId ?? "");
      return false;
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/* ---------------------------- Notifications ------------------------ */

export async function getNotifications(uid: string, limit = 50): Promise<AppNotification[]> {
  const list = await queryDocs<AppNotification>(col(COL.notifications).where("uid", "==", uid));
  return list.sort(byDateDesc("createdAt")).slice(0, limit);
}

/* ------------------------------ Resources -------------------------- */

export async function getResourcesForEnrollment(e: Pick<Enrollment, "programId" | "batchId">) {
  const list = await queryDocs<Resource>(col(COL.resources).where("programId", "==", e.programId));
  return list.filter((r) => !r.batchId || r.batchId === e.batchId).sort(byDateDesc("createdAt"));
}

export async function listResources(): Promise<Resource[]> {
  const list = await queryDocs<Resource>(col(COL.resources));
  return list.sort(byDateDesc("createdAt"));
}

/* -------------------------- Team & messages ------------------------ */

export async function listTeam(visibleOnly = false): Promise<TeamMember[]> {
  const list = await queryDocs<TeamMember>(col(COL.team));
  return list.filter((m) => !visibleOnly || m.visible).sort((a, b) => a.order - b.order);
}

export async function listContactMessages(limit = 100): Promise<ContactMessage[]> {
  return queryDocs<ContactMessage>(
    col(COL.contactMessages).orderBy("createdAt", "desc").limit(limit),
  );
}
