"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ADMIN_ROLES } from "@/lib/domain/enums";
import { lessonPercent } from "@/lib/domain/progress";
import { courseSchema, docId, lessonSchema } from "@/lib/domain/schemas";
import type { ActionResult, Course, Enrollment, Lesson, Program } from "@/lib/domain/types";
import { COL, col, countOf, fromSnap, queryDocs, serverNow } from "../db";
import { adminDb } from "../firebase-admin";
import { notifyProgramStudents } from "../notify";
import { getLessonAnswerKey } from "../queries/platform";
import { ActionError, actor, parse, run } from "./_utils";

function revalidateLearning() {
  revalidatePath("/admin/courses");
  revalidatePath("/admin/lessons");
  revalidatePath("/dashboard/learning", "layout");
  revalidatePath("/dashboard");
}

/* ------------------------------ Courses ------------------------------ */

export async function saveCourse(courseId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const data = parse(courseSchema, input);
    const program = fromSnap<Program>(await col(COL.programs).doc(data.programId).get());
    if (!program) throw new ActionError("Program not found.");
    const modules = data.modules.map((m, i) => ({
      id: m.id || randomUUID().slice(0, 8),
      title: m.title,
      order: i,
    }));
    const payload = { ...data, modules, updatedAt: serverNow() };
    let id = courseId ? parse(docId, courseId) : null;
    if (id) {
      const ref = col(COL.courses).doc(id);
      const existing = fromSnap<Course>(await ref.get());
      if (!existing) throw new ActionError("Course not found.");
      const keptModuleIds = new Set(modules.map((m) => m.id));
      const orphaned = await queryDocs<Lesson>(col(COL.lessons).where("courseId", "==", id));
      if (orphaned.some((l) => !keptModuleIds.has(l.moduleId))) {
        throw new ActionError("Move or delete the lessons in a module before removing it.");
      }
      if (existing.programId !== data.programId && orphaned.length > 0) {
        throw new ActionError("This course has lessons; its program can't change.");
      }
      await ref.update(payload);
    } else {
      id = (await col(COL.courses).add({ ...payload, createdAt: serverNow() })).id;
    }
    revalidateLearning();
    return { id: id! };
  }, "Course saved");
}

export async function deleteCourse(courseId: string): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const id = parse(docId, courseId);
    if ((await countOf(col(COL.lessons).where("courseId", "==", id))) > 0) {
      throw new ActionError("Delete this course's lessons first.");
    }
    await col(COL.courses).doc(id).delete();
    revalidateLearning();
  }, "Course deleted");
}

/* ------------------------------ Lessons ------------------------------ */

export async function saveLesson(lessonId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const data = parse(lessonSchema, input);
    const course = fromSnap<Course>(await col(COL.courses).doc(data.courseId).get());
    if (!course) throw new ActionError("Course not found.");
    if (!course.modules.some((m) => m.id === data.moduleId)) {
      throw new ActionError("Choose a module from the selected course.");
    }

    const quiz = data.type === "QUIZ" ? (data.quiz ?? []) : [];
    const questions = quiz.map((q) => ({
      id: q.id || randomUUID().slice(0, 8),
      question: q.question,
      options: q.options,
    }));
    const answers = quiz.map((q) => q.answerIndex);

    const payload = {
      courseId: course.id,
      programId: course.programId,
      moduleId: data.moduleId,
      title: data.title,
      summary: data.summary,
      type: data.type,
      content: data.content,
      videoUrl: data.videoUrl || null,
      pdfUrl: data.pdfUrl || null,
      repoUrl: data.repoUrl || null,
      resources: data.resources,
      quiz: questions,
      quizPassPercent: data.type === "QUIZ" ? (data.quizPassPercent ?? 60) : null,
      durationMinutes: data.durationMinutes,
      order: data.order,
      status: data.status,
      updatedAt: serverNow(),
    };

    const db = adminDb();
    const id = lessonId ? parse(docId, lessonId) : col(COL.lessons).doc().id;
    const ref = col(COL.lessons).doc(id);
    const before = lessonId ? fromSnap<Lesson>(await ref.get()) : null;
    if (lessonId && !before) throw new ActionError("Lesson not found.");

    const batch = db.batch();
    batch.set(ref, before ? payload : { ...payload, createdAt: serverNow() }, { merge: true });
    batch.set(ref.collection("answerKey").doc("key"), { answers, updatedAt: serverNow() });
    await batch.commit();

    const newlyPublished = data.status === "PUBLISHED" && before?.status !== "PUBLISHED";
    if (newlyPublished) {
      await notifyProgramStudents(course.programId, null, {
        type: "NEW_LESSON",
        title: "New lesson available",
        body: data.title,
        link: `/dashboard/learning/${id}`,
      });
    }
    revalidateLearning();
    return { id };
  }, "Lesson saved");
}

export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const ref = col(COL.lessons).doc(parse(docId, lessonId));
    await ref.collection("answerKey").doc("key").delete();
    await ref.delete();
    revalidateLearning();
  }, "Lesson deleted");
}

/* ------------------------ Student: completion ------------------------ */

const completeSchema = z.object({
  lessonId: docId,
  answers: z.array(z.number().int().min(0).max(5)).max(30).optional(),
});

/**
 * Completion is recorded server-side only after checking the student has an ACTIVE
 * enrollment in the lesson's program and — for quizzes — grading against the hidden key.
 */
export async function completeLesson(
  input: unknown,
): Promise<ActionResult<{ passed: boolean; score?: number; correct?: boolean[] }>> {
  return run(async () => {
    const session = await actor(["STUDENT"]);
    const data = parse(completeSchema, input);
    const lesson = fromSnap<Lesson>(await col(COL.lessons).doc(data.lessonId).get());
    if (!lesson || lesson.status !== "PUBLISHED") throw new ActionError("Lesson not found.");

    const enrollments = await queryDocs<Enrollment>(
      col(COL.enrollments).where("uid", "==", session.uid),
    );
    const enrollment = enrollments.find(
      (e) => e.programId === lesson.programId && e.status === "ACTIVE",
    );
    if (!enrollment) throw new ActionError("An active enrollment is required to track progress.");

    let score: number | undefined;
    let correct: boolean[] | undefined;
    if (lesson.type === "QUIZ" && lesson.quiz?.length) {
      const key = await getLessonAnswerKey(lesson.id);
      const answers = data.answers ?? [];
      if (answers.length !== lesson.quiz.length) throw new ActionError("Answer every question first.");
      correct = key.map((k, i) => answers[i] === k);
      score = Math.round((correct.filter(Boolean).length / key.length) * 100);
      if (score < (lesson.quizPassPercent ?? 60)) {
        return { passed: false, score, correct };
      }
    }

    const published = await queryDocs<Lesson>(
      col(COL.lessons).where("programId", "==", lesson.programId),
    );
    const publishedIds = published.filter((l) => l.status === "PUBLISHED").map((l) => l.id);

    const ref = col(COL.enrollments).doc(enrollment.id);
    await adminDb().runTransaction(async (tx) => {
      const fresh = fromSnap<Enrollment>(await tx.get(ref));
      if (!fresh) throw new ActionError("Enrollment not found.");
      const completed = [...new Set([...(fresh.completedLessonIds ?? []), lesson.id])];
      const done = completed.filter((id) => publishedIds.includes(id)).length;
      tx.update(ref, {
        completedLessonIds: completed,
        progress: {
          lessonsCompleted: done,
          lessonsTotal: publishedIds.length,
          lessonPercent: lessonPercent(completed, publishedIds),
          updatedAt: serverNow(),
        },
        ...(lesson.type === "QUIZ" ? { [`quizScores.${lesson.id}`]: score } : {}),
        updatedAt: serverNow(),
      });
    });
    revalidatePath("/dashboard", "layout");
    return { passed: true, score, correct };
  });
}
