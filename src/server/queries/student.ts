import "server-only";

import { cache } from "react";

import type { Application, Batch, Enrollment, Program, UserProfile } from "@/lib/domain/types";
import { getProgram } from "./programs";
import {
  getApplicationsForUser,
  getBatch,
  getEnrollmentsForUser,
  getUser,
  pickCurrentEnrollment,
} from "./platform";

export interface StudentContext {
  user: UserProfile;
  applications: Application[];
  enrollments: Enrollment[];
  /** The enrollment the dashboard focuses on (active > awaiting payment > completed…). */
  enrollment: Enrollment | null;
  program: Program | null;
  batch: Batch | null;
  /** Full access to learning content. */
  active: boolean;
  /** Most relevant application (for the tracker when not yet enrolled). */
  application: Application | null;
}

export const getStudentContext = cache(async (uid: string): Promise<StudentContext | null> => {
  const [user, applications, enrollments] = await Promise.all([
    getUser(uid),
    getApplicationsForUser(uid),
    getEnrollmentsForUser(uid),
  ]);
  if (!user) return null;
  const enrollment = pickCurrentEnrollment(enrollments.filter((e) => e.status !== "CANCELLED"));
  const [program, batch] = await Promise.all([
    enrollment ? getProgram(enrollment.programId) : Promise.resolve(null),
    enrollment?.batchId ? getBatch(enrollment.batchId) : Promise.resolve(null),
  ]);
  const application =
    (enrollment && applications.find((a) => a.id === enrollment.applicationId)) ??
    applications.find((a) => a.status !== "REJECTED") ??
    applications[0] ??
    null;
  return {
    user,
    applications,
    enrollments,
    enrollment,
    program,
    batch,
    active: enrollment?.status === "ACTIVE" || enrollment?.status === "COMPLETED",
    application,
  };
});
