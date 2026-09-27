import "server-only";

import { evaluateEligibility, type EligibilityResult } from "@/lib/domain/certificates";
import {
  assignmentPercent,
  attendancePercent,
  averageScore,
  lessonPercent,
  overallProgress,
  projectPercent,
  type ProgressMetrics,
} from "@/lib/domain/progress";
import type {
  Assignment,
  AttendanceRecord,
  CertificateCriteria,
  Enrollment,
  Evaluation,
  Lesson,
  Project,
  Submission,
} from "@/lib/domain/types";
import { COL, col, queryDocs, whereIn } from "./db";

export interface EnrollmentMetrics extends ProgressMetrics {
  overall: number;
  averageScore: number | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  assignmentsApproved: number;
  assignmentsSubmitted: number;
  assignmentsTotal: number;
  assignmentsOverdue: number;
  sessionsAttended: number;
  sessionsRecorded: number;
  projectsTotal: number;
  projectCompleted: boolean;
}

function group<T>(items: T[], key: (t: T) => string | undefined | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    (map.get(k) ?? map.set(k, []).get(k)!).push(item);
  }
  return map;
}

/**
 * Computes progress for many enrollments with a bounded number of queries
 * (content per program, activity per student or per program).
 */
export async function metricsForEnrollments(
  enrollments: Enrollment[],
): Promise<Map<string, EnrollmentMetrics>> {
  const result = new Map<string, EnrollmentMetrics>();
  if (enrollments.length === 0) return result;

  const programIds = [...new Set(enrollments.map((e) => e.programId))];
  const single = enrollments.length === 1 ? enrollments[0] : null;

  const [lessons, assignments, submissions, attendance, projects, evaluations] = await Promise.all([
    whereIn<Lesson>(COL.lessons, "programId", programIds),
    whereIn<Assignment>(COL.assignments, "programId", programIds),
    single
      ? queryDocs<Submission>(col(COL.submissions).where("uid", "==", single.uid))
      : whereIn<Submission>(COL.submissions, "programId", programIds),
    single
      ? queryDocs<AttendanceRecord>(col(COL.attendance).where("uid", "==", single.uid))
      : whereIn<AttendanceRecord>(COL.attendance, "programId", programIds),
    single
      ? queryDocs<Project>(col(COL.projects).where("uid", "==", single.uid))
      : whereIn<Project>(COL.projects, "programId", programIds),
    single
      ? queryDocs<Evaluation>(col(COL.evaluations).where("uid", "==", single.uid))
      : whereIn<Evaluation>(COL.evaluations, "enrollmentId", enrollments.map((e) => e.id)),
  ]);

  const lessonsByProgram = group(
    lessons.filter((l) => l.status === "PUBLISHED"),
    (l) => l.programId,
  );
  const assignmentsByProgram = group(
    assignments.filter((a) => a.status === "PUBLISHED"),
    (a) => a.programId,
  );
  const submissionsByUid = group(submissions, (s) => s.uid);
  const attendanceByUid = group(attendance, (a) => a.uid);
  const projectsByEnrollment = group(projects, (p) => p.enrollmentId);
  const evaluationsByEnrollment = group(evaluations, (e) => e.enrollmentId);
  const now = Date.now();

  for (const e of enrollments) {
    const publishedLessonIds = (lessonsByProgram.get(e.programId) ?? []).map((l) => l.id);
    const visibleAssignments = (assignmentsByProgram.get(e.programId) ?? []).filter(
      (a) => !a.batchId || a.batchId === e.batchId,
    );
    const subs = (submissionsByUid.get(e.uid) ?? []).filter((s) => s.programId === e.programId);
    const subByAssignment = new Map(subs.map((s) => [s.assignmentId, s]));
    const att = (attendanceByUid.get(e.uid) ?? []).filter((a) => a.programId === e.programId);
    const proj = projectsByEnrollment.get(e.id) ?? [];
    const evals = evaluationsByEnrollment.get(e.id) ?? [];

    const completed = e.completedLessonIds ?? [];
    const publishedSet = new Set(publishedLessonIds);
    const lessonsCompleted = completed.filter((id) => publishedSet.has(id)).length;

    const base: ProgressMetrics = {
      lessonPercent: lessonPercent(completed, publishedLessonIds),
      assignmentPercent: assignmentPercent(
        visibleAssignments.map((a) => a.id),
        subs,
      ),
      attendancePercent: attendancePercent(att.map((a) => a.status)),
      projectPercent: projectPercent(proj),
      has: {
        lessons: publishedLessonIds.length > 0,
        assignments: visibleAssignments.length > 0,
        attendance: att.length > 0,
        projects: proj.length > 0,
      },
    };

    result.set(e.id, {
      ...base,
      overall: overallProgress(base),
      averageScore: averageScore(evals),
      lessonsCompleted,
      lessonsTotal: publishedLessonIds.length,
      assignmentsApproved: visibleAssignments.filter(
        (a) => subByAssignment.get(a.id)?.status === "APPROVED",
      ).length,
      assignmentsSubmitted: visibleAssignments.filter((a) => {
        const s = subByAssignment.get(a.id)?.status;
        return s && s !== "IN_PROGRESS" && s !== "NOT_STARTED";
      }).length,
      assignmentsTotal: visibleAssignments.length,
      assignmentsOverdue: visibleAssignments.filter((a) => {
        const s = subByAssignment.get(a.id)?.status;
        const open = !s || s === "IN_PROGRESS" || s === "NOT_STARTED" || s === "REVISION_REQUIRED";
        return open && new Date(a.dueDate).getTime() < now;
      }).length,
      sessionsAttended: att.filter((a) => a.status === "PRESENT" || a.status === "LATE").length,
      sessionsRecorded: att.filter((a) => a.status !== "EXCUSED").length,
      projectsTotal: proj.length,
      projectCompleted: proj.some((p) => p.status === "COMPLETED"),
    });
  }
  return result;
}

export async function metricsForEnrollment(e: Enrollment): Promise<EnrollmentMetrics> {
  return (await metricsForEnrollments([e])).get(e.id)!;
}

export function eligibilityFor(
  e: Enrollment,
  m: EnrollmentMetrics,
  criteria: CertificateCriteria,
): EligibilityResult {
  return evaluateEligibility(
    {
      enrollmentStatus: e.status,
      paymentConfirmed: e.payment.status === "PAYMENT_CONFIRMED",
      lessonPercent: m.lessonPercent,
      assignmentPercent: m.assignmentPercent,
      attendancePercent: m.attendancePercent,
      hasAssignments: m.has.assignments,
      hasSessions: m.has.attendance,
      projectCompleted: m.projectCompleted,
      hasCertificate: Boolean(e.certificateId),
    },
    criteria,
  );
}
