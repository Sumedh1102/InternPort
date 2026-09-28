import { NextResponse } from "next/server";

import { canReadStorage, parseStoragePath, type StorageFolder } from "@/lib/domain/storage";
import type { Project } from "@/lib/domain/types";
import { getSession } from "@/server/auth/session";
import { COL, col, fromSnap } from "@/server/db";
import { isStorageConfigured } from "@/server/supabase";
import { signedReadUrl } from "@/server/storage";

/** Signed URLs outlive the cached redirect, so a cached redirect never points at an expired URL. */
const SIGNED_URL_SECONDS = 10 * 60;
const REDIRECT_CACHE_SECONDS = 5 * 60;

function text(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}

/** Screenshots of featured projects appear on the public /projects page. */
async function isPublicScreenshot(folder: StorageFolder): Promise<boolean> {
  if (folder.area !== "project") return false;
  const project = fromSnap<Project>(await col(COL.projects).doc(folder.projectId).get());
  return Boolean(
    project?.featured &&
      project.uid === folder.uid &&
      (project.status === "COMPLETED" || project.status === "EVALUATED"),
  );
}

/**
 * Serves a Supabase Storage file: checks the Firebase session against the path's
 * read rule, then redirects to a short-lived signed URL. Firestore stores this
 * route's URL, so links never expire and access is re-checked on every open.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[...path]">) {
  const { path: segments } = await ctx.params;
  const path = segments.join("/");
  const parsed = parseStoragePath(path);
  if (!parsed || !isStorageConfigured()) return text("File not found.", 404);

  const session = await getSession();
  const allowed = canReadStorage(session, parsed.folder) || (await isPublicScreenshot(parsed.folder));
  if (!allowed) {
    return session
      ? text("You don't have access to this file.", 403)
      : text("Please log in to view this file.", 401);
  }

  const url = await signedReadUrl(path, SIGNED_URL_SECONDS);
  if (!url) return text("This file no longer exists. It may have been replaced or deleted.", 404);
  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", `private, max-age=${REDIRECT_CACHE_SECONDS}`);
  return response;
}
