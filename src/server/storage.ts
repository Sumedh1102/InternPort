import "server-only";

import { getDownloadURL } from "firebase-admin/storage";

import type { StoredFile } from "@/lib/domain/types";
import { adminBucket } from "./firebase-admin";
import { ActionError } from "./actions/_utils";

/**
 * Files are uploaded by the browser straight to Firebase Storage (guarded by storage.rules).
 * Before a path is persisted in Firestore, the server re-checks it here:
 * the path must sit under an allowed prefix, the object must exist, and its real
 * size/content-type (from Storage metadata, not the client) must match the policy.
 * The download URL is derived server-side, never taken from the client.
 */

export interface UploadPolicy {
  maxBytes: number;
  types: readonly string[];
}

export const UPLOAD_POLICIES = {
  profileImage: { maxBytes: 2 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp"] },
  resume: {
    maxBytes: 5 * 1024 * 1024,
    types: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  submission: {
    maxBytes: 10 * 1024 * 1024,
    types: [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/plain",
      "text/markdown",
    ],
  },
  screenshot: { maxBytes: 5 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp"] },
  staffFile: {
    maxBytes: 20 * 1024 * 1024,
    types: [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/plain",
      "text/markdown",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
} satisfies Record<string, UploadPolicy>;

export async function verifyUploadedFile(
  path: string,
  expectedPrefix: string,
  policy: UploadPolicy,
): Promise<StoredFile> {
  if (!path.startsWith(expectedPrefix) || path.includes("..") || path.includes("//")) {
    throw new ActionError("That file does not belong to you.");
  }
  const file = adminBucket().file(path);
  const [exists] = await file.exists();
  if (!exists) throw new ActionError("Uploaded file not found. Please upload it again.");
  const [meta] = await file.getMetadata();
  const size = Number(meta.size ?? 0);
  const contentType = String(meta.contentType ?? "");
  if (size > policy.maxBytes) throw new ActionError("File is too large.");
  if (!policy.types.includes(contentType)) throw new ActionError("File type is not allowed.");
  const url = await getDownloadURL(file);
  return { name: path.split("/").pop() ?? "file", path, url, size, contentType };
}

export async function verifyUploadedFiles(
  paths: readonly string[] | undefined,
  expectedPrefix: string,
  policy: UploadPolicy,
): Promise<StoredFile[]> {
  return Promise.all((paths ?? []).map((p) => verifyUploadedFile(p, expectedPrefix, policy)));
}
