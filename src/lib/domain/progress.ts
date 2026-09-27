import type { AttendanceStatus, ProjectStatus, SubmissionStatus } from "./enums";

/** All progress numbers are derived from stored records on the server — never from the client. */

export function percent(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

export function lessonPercent(completedIds: readonly string[], publishedLessonIds: readonly string[]): number {
  const published = new Set(publishedLessonIds);
  const done = new Set(completedIds.filter((id) => published.has(id)));
  return percent(done.size, published.size);
}

/**
 * Attendance: PRESENT and LATE count as attended; EXCUSED is removed from the denominator.
 */
export function attendancePercent(statuses: readonly AttendanceStatus[]): number {
  const counted = statuses.filter((s) => s !== "EXCUSED");
  const attended = counted.filter((s) => s === "PRESENT" || s === "LATE").length;
  return percent(attended, counted.length);
}

/** Share of published assignments whose submission has been approved. */
export function assignmentPercent(
  publishedAssignmentIds: readonly string[],
  submissions: readonly { assignmentId: string; status: SubmissionStatus }[],
): number {
  const approved = new Set(
    submissions.filter((s) => s.status === "APPROVED").map((s) => s.assignmentId),
  );
  const count = publishedAssignmentIds.filter((id) => approved.has(id)).length;
  return percent(count, publishedAssignmentIds.length);
}

export const PROJECT_STAGE_WEIGHT: Record<ProjectStatus, number> = {
  ASSIGNED: 0,
  IN_PROGRESS: 25,
  SUBMITTED: 50,
  REVIEWED: 65,
  EVALUATED: 85,
  COMPLETED: 100,
};

export function projectPercent(projects: readonly { status: ProjectStatus }[]): number {
  if (projects.length === 0) return 0;
  const total = projects.reduce((sum, p) => sum + PROJECT_STAGE_WEIGHT[p.status], 0);
  return Math.round(total / projects.length);
}

export interface ProgressMetrics {
  lessonPercent: number;
  assignmentPercent: number;
  attendancePercent: number;
  projectPercent: number;
  /** Whether each metric has data to measure against. */
  has: { lessons: boolean; assignments: boolean; attendance: boolean; projects: boolean };
}

const WEIGHTS = { lessons: 40, assignments: 30, projects: 20, attendance: 10 } as const;

/**
 * Weighted overall progress. Metrics with nothing to measure yet (no sessions held,
 * no assignments published...) are excluded so students aren't penalised early on.
 */
export function overallProgress(m: ProgressMetrics): number {
  const parts: [number, number][] = [];
  if (m.has.lessons) parts.push([m.lessonPercent, WEIGHTS.lessons]);
  if (m.has.assignments) parts.push([m.assignmentPercent, WEIGHTS.assignments]);
  if (m.has.projects) parts.push([m.projectPercent, WEIGHTS.projects]);
  if (m.has.attendance) parts.push([m.attendancePercent, WEIGHTS.attendance]);
  const weight = parts.reduce((s, [, w]) => s + w, 0);
  if (weight === 0) return 0;
  return Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / weight);
}

export function averageScore(evals: readonly { score: number; maxScore: number }[]): number | null {
  const valid = evals.filter((e) => e.maxScore > 0);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((s, e) => s + (e.score / e.maxScore) * 100, 0) / valid.length);
}
