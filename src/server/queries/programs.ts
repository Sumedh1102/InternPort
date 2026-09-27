import "server-only";

import { unstable_cache } from "next/cache";

import type { Program } from "@/lib/domain/types";
import { COL, col, getDocById, queryDocs } from "../db";
import { isAdminConfigured } from "../firebase-admin";

export interface Loaded<T> {
  data: T;
  error: string | null;
}

const byOrder = (a: Program, b: Program) => a.order - b.order || a.name.localeCompare(b.name);

/** Public catalogue: PUBLISHED and PAUSED programs (paused ones render as "applications paused"). */
export const getPublicPrograms = unstable_cache(
  async (): Promise<Loaded<Program[]>> => {
    if (!isAdminConfigured()) return { data: [], error: "not-configured" };
    try {
      const programs = await queryDocs<Program>(
        col(COL.programs).where("status", "in", ["PUBLISHED", "PAUSED"]),
      );
      return { data: programs.sort(byOrder), error: null };
    } catch (error) {
      console.error("[programs] failed to load", error);
      return { data: [], error: "unavailable" };
    }
  },
  ["public-programs"],
  { tags: ["programs"], revalidate: 300 },
);

export const getPublicProgramBySlug = unstable_cache(
  async (slug: string): Promise<Program | null> => {
    if (!isAdminConfigured()) return null;
    try {
      const [program] = await queryDocs<Program>(
        col(COL.programs).where("slug", "==", slug).limit(1),
      );
      if (!program || (program.status !== "PUBLISHED" && program.status !== "PAUSED")) return null;
      return program;
    } catch (error) {
      console.error("[programs] failed to load slug", slug, error);
      return null;
    }
  },
  ["public-program-by-slug"],
  { tags: ["programs"], revalidate: 300 },
);

export async function getAllPrograms(): Promise<Program[]> {
  const programs = await queryDocs<Program>(col(COL.programs));
  return programs.sort(byOrder);
}

export async function getProgram(id: string): Promise<Program | null> {
  return getDocById<Program>(COL.programs, id);
}

export async function getProgramsMap(): Promise<Map<string, Program>> {
  const programs = await getAllPrograms();
  return new Map(programs.map((p) => [p.id, p]));
}
