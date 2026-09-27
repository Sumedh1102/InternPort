"use server";

import { revalidatePath } from "next/cache";

import { ADMIN_ROLES, STAFF_ROLES } from "@/lib/domain/enums";
import { docId, projectAssignSchema, projectReviewSchema, projectSubmitSchema } from "@/lib/domain/schemas";
import type { ActionResult, Project } from "@/lib/domain/types";
import {
  REVIEWER_PROJECT_FLOW,
  STUDENT_PROJECT_FLOW,
  assertTransition,
  isAdmin,
} from "@/lib/domain/workflows";
import { assertEnrollmentAccess } from "../access";
import { COL, col, fromSnap, serverNow, toTimestamp } from "../db";
import { adminDb } from "../firebase-admin";
import { notify } from "../notify";
import { UPLOAD_POLICIES, verifyUploadedFiles } from "../storage";
import { ActionError, actor, parse, run } from "./_utils";

function revalidateProjects() {
  revalidatePath("/admin/projects");
  revalidatePath("/mentor", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/projects");
}

export async function assignProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const session = await actor(STAFF_ROLES);
    const data = parse(projectAssignSchema, input);
    const enrollment = await assertEnrollmentAccess(session, data.enrollmentId);
    if (enrollment.status !== "ACTIVE") throw new ActionError("Projects can only be assigned to active students.");
    const ref = await col(COL.projects).add({
      uid: enrollment.uid,
      studentName: enrollment.studentName,
      enrollmentId: enrollment.id,
      programId: enrollment.programId,
      programName: enrollment.programName,
      batchId: enrollment.batchId ?? null,
      mentorId: enrollment.mentorId ?? (session.role === "MENTOR" ? session.uid : null),
      title: data.title,
      description: data.description,
      techStack: data.techStack,
      status: "ASSIGNED",
      screenshots: [],
      maxScore: data.maxScore,
      dueDate: data.dueDate ? toTimestamp(data.dueDate) : null,
      featured: false,
      createdAt: serverNow(),
      updatedAt: serverNow(),
    });
    await notify([enrollment.uid], {
      type: "PROJECT_ASSIGNED",
      title: "New project assigned",
      body: data.title,
      link: "/dashboard/projects",
    });
    revalidateProjects();
    return { id: ref.id };
  }, "Project assigned");
}

export async function submitProject(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(["STUDENT"]);
    const data = parse(projectSubmitSchema, input);
    const ref = col(COL.projects).doc(data.projectId);
    const project = fromSnap<Project>(await ref.get());
    if (!project || project.uid !== session.uid) throw new ActionError("Project not found.");
    const target = data.submit ? "SUBMITTED" : "IN_PROGRESS";
    assertTransition("project", STUDENT_PROJECT_FLOW, project.status, target);
    if (data.submit && !data.githubUrl && !data.liveUrl) {
      throw new ActionError("Add a GitHub or live URL before submitting.");
    }
    const screenshots = await verifyUploadedFiles(
      data.screenshotPaths,
      `users/${session.uid}/projects/${project.id}/`,
      UPLOAD_POLICIES.screenshot,
    );
    await ref.update({
      status: target,
      githubUrl: data.githubUrl || null,
      liveUrl: data.liveUrl || null,
      documentationUrl: data.documentationUrl || null,
      screenshots,
      ...(data.submit ? { submittedAt: serverNow() } : {}),
      updatedAt: serverNow(),
    });
    if (data.submit && project.mentorId) {
      await notify([project.mentorId], {
        type: "GENERAL",
        title: "Project submitted",
        body: `${project.studentName} submitted “${project.title}”.`,
        link: "/mentor/students",
      });
    }
    revalidateProjects();
  }, (input as { submit?: unknown } | null)?.submit === true ? "Project submitted!" : "Project saved");
}

export async function reviewProject(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(STAFF_ROLES);
    const data = parse(projectReviewSchema, input);
    const ref = col(COL.projects).doc(data.projectId);
    const project = fromSnap<Project>(await ref.get());
    if (!project) throw new ActionError("Project not found.");
    await assertEnrollmentAccess(session, project.enrollmentId);
    if (typeof data.featured === "boolean" && !isAdmin(session.role)) {
      throw new ActionError("Only admins can feature projects publicly.");
    }
    assertTransition("project", REVIEWER_PROJECT_FLOW, project.status, data.status);
    if ((data.status === "EVALUATED" || data.status === "COMPLETED") && typeof (data.score ?? project.score) !== "number") {
      throw new ActionError("Add a score to evaluate this project.");
    }
    if (typeof data.score === "number" && data.score > project.maxScore) {
      throw new ActionError(`Score can't exceed ${project.maxScore}.`);
    }

    const batch = adminDb().batch();
    batch.update(ref, {
      status: data.status,
      ...(typeof data.score === "number" ? { score: data.score } : {}),
      ...(data.feedback ? { feedback: data.feedback } : {}),
      ...(typeof data.featured === "boolean" ? { featured: data.featured } : {}),
      ...(data.status === "REVIEWED" ? { reviewedAt: serverNow() } : {}),
      ...(data.status === "COMPLETED" ? { completedAt: serverNow() } : {}),
      updatedAt: serverNow(),
    });
    const score = data.score ?? project.score;
    if (typeof score === "number" && (data.status === "EVALUATED" || data.status === "COMPLETED")) {
      batch.set(col(COL.evaluations).doc(`proj_${project.id}`), {
        uid: project.uid,
        enrollmentId: project.enrollmentId,
        type: "PROJECT",
        refId: project.id,
        title: project.title,
        score,
        maxScore: project.maxScore,
        feedback: data.feedback || project.feedback || null,
        evaluatorId: session.uid,
        evaluatorName: session.name,
        createdAt: serverNow(),
      });
    }
    await batch.commit();
    if (data.status !== project.status || data.feedback) {
      await notify([project.uid], {
        type: "PROJECT_FEEDBACK",
        title: `Project ${data.status.toLowerCase().replace(/_/g, " ")}`,
        body: data.feedback ? `${project.title}: ${data.feedback.slice(0, 200)}` : project.title,
        link: "/dashboard/projects",
      });
    }
    revalidateProjects();
  }, "Project updated");
}

export async function setProjectFeatured(projectId: string, featured: boolean): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const ref = col(COL.projects).doc(parse(docId, projectId));
    const project = fromSnap<Project>(await ref.get());
    if (!project) throw new ActionError("Project not found.");
    if (featured && project.status !== "COMPLETED" && project.status !== "EVALUATED") {
      throw new ActionError("Only evaluated or completed projects can be featured.");
    }
    await ref.update({ featured: Boolean(featured), updatedAt: serverNow() });
    revalidateProjects();
  }, featured ? "Project featured on the public site" : "Project removed from showcase");
}
