import type { ProgressMetrics } from "./progress";

export interface InsightInput extends ProgressMetrics {
  overall: number;
  averageScore: number | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  assignmentsOverdue: number;
  assignmentsTotal: number;
  assignmentsSubmitted: number;
  projectsTotal: number;
  projectCompleted: boolean;
}

/**
 * Deterministic recommendations from real progress data. Used on its own when no AI
 * provider is configured and as grounding/fallback for AI-written insights.
 * Never mentions jobs, placements or hiring outcomes.
 */
export function ruleInsights(m: InsightInput): { summary: string; recommendations: string[] } {
  const recs: string[] = [];

  if (m.assignmentsOverdue > 0) {
    recs.push(
      `You have ${m.assignmentsOverdue} overdue assignment${m.assignmentsOverdue > 1 ? "s" : ""}. Submit a first version now — you can improve it after feedback.`,
    );
  }
  if (m.has.lessons && m.lessonPercent < 50) {
    recs.push(`Aim to finish your next ${Math.min(3, m.lessonsTotal - m.lessonsCompleted)} lessons this week to build momentum.`);
  } else if (m.has.lessons && m.lessonPercent < 100) {
    recs.push("You're past the halfway mark on lessons — keep a steady daily slot to finish the remaining ones.");
  }
  if (m.has.attendance && m.attendancePercent < 75) {
    recs.push(`Your attendance is ${m.attendancePercent}%. Joining live sessions is the fastest way to get unstuck.`);
  }
  if (m.averageScore !== null && m.averageScore < 60) {
    recs.push("Your evaluated scores suggest reviewing mentor feedback carefully and asking follow-up questions.");
  }
  if (m.has.projects && !m.projectCompleted && m.projectPercent < 50) {
    recs.push("Break your project into small milestones and push progress to GitHub regularly.");
  }
  if (!m.has.projects) {
    recs.push("Your project hasn't been assigned yet — start sketching ideas using what you've learned so far.");
  }
  if (recs.length === 0) {
    recs.push("Great consistency! Try teaching a concept you learned to a peer or writing a short blog post about it.");
    recs.push("Challenge yourself with an extra feature in your project.");
  }

  const summary =
    m.overall >= 80
      ? `Excellent progress — you're at ${m.overall}% overall.`
      : m.overall >= 50
        ? `Solid progress at ${m.overall}% overall. A few focused steps will move you forward.`
        : `You're at ${m.overall}% overall. Small, regular sessions will help you catch up.`;

  return { summary, recommendations: recs.slice(0, 4) };
}
