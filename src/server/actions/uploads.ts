"use server";

import { uploadRequestSchema } from "@/lib/domain/schemas";
import {
  canWriteStorage,
  FOLDER_KIND,
  parseStorageFolder,
  parseStoragePath,
  safeFileName,
  UPLOAD_POLICIES,
} from "@/lib/domain/storage";
import type { ActionResult } from "@/lib/domain/types";
import { rateLimit } from "../security";
import { createSignedUpload, removeStoredFile } from "../storage";
import { ActionError, actor, parse, run } from "./_utils";

/**
 * Issues a one-time signed URL the browser uploads one file to. This replaces the
 * former storage.rules: ownership, type and size are checked here against the
 * Firebase session, and the server picks the object name.
 */
export async function createUpload(input: unknown): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  return run(async () => {
    const session = await actor();
    const data = parse(uploadRequestSchema, input);
    const folder = parseStorageFolder(data.folder);
    if (!folder || !canWriteStorage(session, folder)) throw new ActionError("You can't upload files here.");
    const policy = UPLOAD_POLICIES[FOLDER_KIND[folder.area]];
    if (!(policy.types as readonly string[]).includes(data.contentType)) {
      throw new ActionError("File type is not allowed.");
    }
    if (data.size > policy.maxBytes) throw new ActionError("File is too large.");
    if (!rateLimit(`upload:${session.uid}`, 100, 60 * 60 * 1000)) {
      throw new ActionError("Too many uploads. Please try again later.");
    }
    return createSignedUpload(`${data.folder}${Date.now()}-${safeFileName(data.fileName)}`);
  });
}

/** Deletes a file the user just uploaded and then removed before saving. */
export async function discardUpload(path: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor();
    const parsed = typeof path === "string" ? parseStoragePath(path) : null;
    if (!parsed || !canWriteStorage(session, parsed.folder)) throw new ActionError("You can't remove that file.");
    await removeStoredFile(path as string);
  });
}
