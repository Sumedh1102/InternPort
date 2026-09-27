import "server-only";

import { cache } from "react";

import type { Batch, Enrollment, Program } from "@/lib/domain/types";
import { getProgramsMap } from "./programs";
import { getBatchesForMentor, getEnrollmentsForBatches } from "./platform";

export interface MentorContext {
  batches: Batch[];
  batchIds: string[];
  enrollments: Enrollment[];
  /** Students whose enrollment is active or completed. */
  students: Enrollment[];
  programs: Map<string, Program>;
}

/** Everything a mentor may see is derived from the batches they are assigned to. */
export const getMentorContext = cache(async (uid: string): Promise<MentorContext> => {
  const [batches, programs] = await Promise.all([getBatchesForMentor(uid), getProgramsMap()]);
  const batchIds = batches.map((b) => b.id);
  const enrollments = await getEnrollmentsForBatches(batchIds);
  return {
    batches,
    batchIds,
    enrollments,
    students: enrollments.filter((e) => e.status === "ACTIVE" || e.status === "COMPLETED"),
    programs,
  };
});
