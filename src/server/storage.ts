import "server-only";

import {
  parseStoragePath,
  splitStoragePath,
  storageFileUrl,
  UPLOAD_POLICIES,
  type UploadPolicy,
} from "@/lib/domain/storage";
import type { StoredFile } from "@/lib/domain/types";
import { ActionError } from "./actions/_utils";
import { isStorageConfigured, supabaseAdmin } from "./supabase";

export { UPLOAD_POLICIES, type UploadPolicy };

/**
 * Files are uploaded by the browser straight to Supabase Storage with a one-time
 * signed upload URL that `createUpload` issues after checking the Firebase session.
 * Before a path is persisted in Firestore, the server re-checks it here:
 * the path must sit under an allowed prefix, the object must exist, and its real
 * size/content-type (from Storage metadata, not the client) must match the policy.
 * The stored URL is the app's `/api/files/…` route, which checks access and
 * redirects to a short-lived signed URL; it is never taken from the client.
 */

function locate(path: string) {
  const location = parseStoragePath(path) ? splitStoragePath(path) : null;
  if (!location) throw new ActionError("That file path is not valid.");
  return location;
}

function assertConfigured() {
  if (!isStorageConfigured()) throw new ActionError("File uploads aren't set up yet. Please try again later.");
}

/** Signed URL the browser PUTs the file to. It can't overwrite an existing object. */
export async function createSignedUpload(path: string): Promise<{ path: string; signedUrl: string }> {
  assertConfigured();
  const { bucket, key } = locate(path);
  const { data, error } = await supabaseAdmin().storage.from(bucket).createSignedUploadUrl(key);
  if (error) {
    console.error("[storage] createSignedUploadUrl failed", error.message);
    throw new ActionError("Couldn't start the upload. Please try again.");
  }
  return { path, signedUrl: data.signedUrl };
}

export async function removeStoredFile(path: string): Promise<void> {
  assertConfigured();
  const { bucket, key } = locate(path);
  const { error } = await supabaseAdmin().storage.from(bucket).remove([key]);
  if (error) console.error("[storage] remove failed", error.message);
}

/** Short-lived read URL, or null if the object doesn't exist. */
export async function signedReadUrl(path: string, expiresInSeconds: number): Promise<string | null> {
  const { bucket, key } = locate(path);
  const { data, error } = await supabaseAdmin().storage.from(bucket).createSignedUrl(key, expiresInSeconds);
  if (error) {
    if (!/not.?found/i.test(error.message)) console.error("[storage] createSignedUrl failed", error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * `existing` holds the files already saved on the record. A path found there is
 * kept as is: it was verified when first saved, and files saved before the move
 * to Supabase keep their Firebase path and URL.
 */
export async function verifyUploadedFile(
  path: string,
  expectedPrefix: string,
  policy: UploadPolicy,
  existing: readonly StoredFile[] = [],
): Promise<StoredFile> {
  const saved = existing.find((f) => f.path === path);
  if (saved) return saved;
  if (!path.startsWith(expectedPrefix) || path.includes("..") || path.includes("//")) {
    throw new ActionError("That file does not belong to you.");
  }
  assertConfigured();
  const { bucket, key } = locate(path);
  const { data: info, error } = await supabaseAdmin().storage.from(bucket).info(key);
  if (error || !info) throw new ActionError("Uploaded file not found. Please upload it again.");
  const meta = (info.metadata ?? {}) as { size?: number; mimetype?: string };
  const size = Number(info.size ?? meta.size ?? 0);
  const contentType = String(info.contentType ?? meta.mimetype ?? "");
  if (size > policy.maxBytes) throw new ActionError("File is too large.");
  if (!policy.types.includes(contentType)) throw new ActionError("File type is not allowed.");
  return { name: path.split("/").pop() ?? "file", path, url: storageFileUrl(path), size, contentType };
}

export async function verifyUploadedFiles(
  paths: readonly string[] | undefined,
  expectedPrefix: string,
  policy: UploadPolicy,
  existing: readonly StoredFile[] = [],
): Promise<StoredFile[]> {
  return Promise.all((paths ?? []).map((p) => verifyUploadedFile(p, expectedPrefix, policy, existing)));
}
