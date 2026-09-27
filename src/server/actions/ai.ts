"use server";

import { revalidatePath } from "next/cache";

import { ruleInsights } from "@/lib/domain/insights";
import type { ActionResult, AIInsights } from "@/lib/domain/types";
import { getAIProvider } from "../ai";
import { COL, col } from "../db";
import { metricsForEnrollment } from "../metrics";
import { getStudentContext } from "../queries/student";
import { getSettings } from "../queries/settings";
import { ActionError, actor, run } from "./_utils";

const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;

const INSIGHT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "recommendations"],
  additionalProperties: false,
};

/**
 * AI progress insights computed from the student's actual records (lessons, assignments,
 * attendance, projects, evaluation scores). Falls back to deterministic rules when no
 * provider is configured or the call fails. Cached on the enrollment for 6 hours.
 */
export async function generateProgressInsights(force = false): Promise<ActionResult<AIInsights>> {
  return run(async () => {
    const session = await actor(["STUDENT"]);
    const ctx = await getStudentContext(session.uid);
    if (!ctx?.active || !ctx.enrollment) throw new ActionError("Insights unlock once your enrollment is active.");
    const e = ctx.enrollment;
    if (
      !force &&
      e.insights &&
      Date.now() - new Date(e.insights.generatedAt).getTime() < REFRESH_AFTER_MS
    ) {
      return e.insights;
    }
    if (force && e.insights && Date.now() - new Date(e.insights.generatedAt).getTime() < 10 * 60 * 1000) {
      throw new ActionError("Insights were just refreshed. Try again in a few minutes.");
    }

    const metrics = await metricsForEnrollment(e);
    const rules = ruleInsights(metrics);
    let insights: AIInsights = { ...rules, generatedAt: new Date().toISOString(), source: "rules" };

    const settings = await getSettings();
    const provider = settings.ai.enabled ? getAIProvider() : null;
    if (provider) {
      try {
        const result = await provider.json<{ summary: string; recommendations: string[] }>({
          system:
            "You are a supportive internship learning coach. Using ONLY the metrics provided, write a one-sentence progress summary " +
            "and 3-4 specific, actionable recommendations (each under 30 words). Be encouraging and honest. " +
            "Never mention jobs, placements, hiring or guarantees. Metrics with has=false have no data yet — don't criticise them.",
          messages: [
            {
              role: "user",
              content: JSON.stringify({
                program: e.programName,
                lessonPercent: metrics.lessonPercent,
                lessonsCompleted: metrics.lessonsCompleted,
                lessonsTotal: metrics.lessonsTotal,
                assignmentPercentApproved: metrics.assignmentPercent,
                assignmentsSubmitted: metrics.assignmentsSubmitted,
                assignmentsTotal: metrics.assignmentsTotal,
                assignmentsOverdue: metrics.assignmentsOverdue,
                attendancePercent: metrics.attendancePercent,
                projectPercent: metrics.projectPercent,
                projectCompleted: metrics.projectCompleted,
                averageEvaluationScore: metrics.averageScore,
                overall: metrics.overall,
                has: metrics.has,
              }),
            },
          ],
          schema: INSIGHT_SCHEMA,
        });
        const recommendations = (result.recommendations ?? []).filter((r) => typeof r === "string").slice(0, 4);
        if (result.summary && recommendations.length) {
          insights = {
            summary: String(result.summary).slice(0, 400),
            recommendations: recommendations.map((r) => r.slice(0, 240)),
            generatedAt: new Date().toISOString(),
            source: "ai",
          };
        }
      } catch (error) {
        console.error("[ai] insights failed, using rules", error);
      }
    }

    await col(COL.enrollments).doc(e.id).update({ insights });
    revalidatePath("/dashboard");
    return insights;
  });
}
