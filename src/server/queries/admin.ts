import "server-only";

import { cache } from "react";

import { getAllPrograms } from "./programs";
import { getUsersByRole, listBatches } from "./platform";

export interface Opt {
  id: string;
  name: string;
  programId?: string;
}

/** Select options shared by admin forms (programs, batches, mentors). */
export const getAdminOptions = cache(async () => {
  const [programs, batches, mentors] = await Promise.all([getAllPrograms(), listBatches(), getUsersByRole(["MENTOR"])]);
  return {
    programs,
    batches,
    mentors,
    programOptions: programs.map<Opt>((p) => ({ id: p.id, name: p.name })),
    batchOptions: batches.map<Opt>((b) => ({ id: b.id, name: `${b.name} · ${b.programName}`, programId: b.programId })),
    mentorOptions: mentors.filter((m) => !m.disabled).map<Opt>((m) => ({ id: m.id, name: m.name })),
  };
});
