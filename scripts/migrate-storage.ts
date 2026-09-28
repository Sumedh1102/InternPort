/**
 * Copies files saved while uploads went to Firebase Storage into Supabase Storage,
 * then points their Firestore records at the copies.
 *
 *   npm run storage:migrate            # dry run: reports what would be copied
 *   npm run storage:migrate -- --apply # copy, verify, then update Firestore
 *
 * Firebase Storage files are never deleted or changed. A record is updated only
 * after every file it references has been copied and its size checked, and only if
 * the record hasn't changed meanwhile. Re-running skips records already migrated.
 * Needs the Firebase Admin variables, the Firebase bucket name
 * (FIREBASE_ADMIN_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) and the
 * Supabase variables. Run `npm run storage:setup` first.
 */
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { splitStoragePath, storageFileUrl, supabasePathForLegacy } from "../src/lib/domain/storage";
import type { StoredFile } from "../src/lib/domain/types";
import { db, initAdmin } from "./_admin";
import { supabase } from "./_supabase";

const apply = process.argv.includes("--apply");
const stats = { records: 0, copied: 0, alreadyCopied: 0, failed: 0 };

function firebaseBucket() {
  const name = process.env.FIREBASE_ADMIN_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!name) throw new Error("Set FIREBASE_ADMIN_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.");
  return getStorage().bucket(name);
}

const copies = new Map<string, Promise<string | null>>();

/** Copies one legacy file (once per run) and returns its Supabase path, or null on failure. */
function copy(legacyPath: string): Promise<string | null> {
  let pending = copies.get(legacyPath);
  if (!pending) {
    pending = copyOnce(legacyPath).catch((error: unknown) => {
      stats.failed++;
      console.error(`  ✗ ${legacyPath}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    copies.set(legacyPath, pending);
  }
  return pending;
}

async function copyOnce(legacyPath: string): Promise<string> {
  const target = supabasePathForLegacy(legacyPath);
  const location = target ? splitStoragePath(target) : null;
  if (!target || !location) throw new Error("no Supabase location for this path");
  const source = firebaseBucket().file(legacyPath);
  const [exists] = await source.exists();
  if (!exists) throw new Error("missing in Firebase Storage");
  const [meta] = await source.getMetadata();
  const size = Number(meta.size ?? 0);
  const bucket = supabase().storage.from(location.bucket);

  const { data: present } = await bucket.info(location.key);
  if (present) {
    if (Number(present.size ?? 0) !== size) throw new Error(`${target} already exists with a different size`);
    stats.alreadyCopied++;
    return target;
  }
  if (!apply) {
    console.log(`  would copy ${legacyPath} → ${target} (${size} bytes)`);
    return target;
  }
  const [bytes] = await source.download();
  const { error } = await bucket.upload(location.key, bytes, {
    contentType: String(meta.contentType ?? "application/octet-stream"),
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data: copied } = await bucket.info(location.key);
  if (Number(copied?.size ?? -1) !== bytes.length) throw new Error("size check failed after upload");
  stats.copied++;
  console.log(`  ✓ ${legacyPath} → ${target}`);
  return target;
}

const isLegacy = (path: unknown): path is string => typeof path === "string" && supabasePathForLegacy(path) !== null;

/** A path field with its URL field, e.g. resumePath + resumeUrl. */
async function migratePathField(patch: Record<string, unknown>, data: Record<string, unknown>, pathKey: string, urlKey: string) {
  const path = data[pathKey];
  if (!isLegacy(path)) return true;
  const target = await copy(path);
  if (!target) return false;
  patch[pathKey] = target;
  patch[urlKey] = storageFileUrl(target);
  return true;
}

async function migrateFileList(patch: Record<string, unknown>, data: Record<string, unknown>, key: string) {
  const files = (data[key] ?? []) as StoredFile[];
  if (!files.some((f) => isLegacy(f.path))) return true;
  const next: StoredFile[] = [];
  for (const file of files) {
    if (!isLegacy(file.path)) {
      next.push(file);
      continue;
    }
    const target = await copy(file.path);
    if (!target) return false;
    next.push({ ...file, path: target, url: storageFileUrl(target) });
  }
  patch[key] = next;
  return true;
}

type Migrator = (patch: Record<string, unknown>, data: Record<string, unknown>) => Promise<boolean>;

const COLLECTIONS: Record<string, Migrator[]> = {
  users: [
    (p, d) => migratePathField(p, d, "profileImagePath", "profileImage"),
    (p, d) => migratePathField(p, d, "resumePath", "resumeUrl"),
  ],
  applications: [(p, d) => migratePathField(p, d, "resumePath", "resumeUrl")],
  resources: [(p, d) => migratePathField(p, d, "storagePath", "url")],
  assignments: [(p, d) => migrateFileList(p, d, "attachments")],
  submissions: [(p, d) => migrateFileList(p, d, "files")],
  projects: [(p, d) => migrateFileList(p, d, "screenshots")],
};

async function migrateDoc(snap: DocumentSnapshot, migrators: Migrator[]) {
  const data = snap.data() ?? {};
  const patch: Record<string, unknown> = {};
  let ok = true;
  for (const migrate of migrators) ok = (await migrate(patch, data)) && ok;
  if (ok && !Object.keys(patch).length) return;
  stats.records++;
  if (!ok) {
    console.log(`  – ${snap.ref.path}: left unchanged because a file failed`);
    return;
  }
  if (!apply) {
    console.log(`  would update ${snap.ref.path}: ${Object.keys(patch).join(", ")}`);
    return;
  }
  try {
    await snap.ref.update(patch, { lastUpdateTime: snap.updateTime! });
    console.log(`  ✓ updated ${snap.ref.path}`);
  } catch {
    stats.failed++;
    console.error(`  ✗ ${snap.ref.path} changed during migration; re-run to pick it up`);
  }
}

async function main() {
  initAdmin();
  firebaseBucket();
  supabase();
  console.log(apply ? "Migrating files (Firebase files are kept)…" : "Dry run — add --apply to copy files.");
  for (const [name, migrators] of Object.entries(COLLECTIONS)) {
    console.log(`\n${name}`);
    const snaps = await db().collection(name).get();
    for (const snap of snaps.docs) await migrateDoc(snap, migrators);
  }
  console.log(
    `\nRecords to update: ${stats.records}. Files copied: ${stats.copied}. Already in Supabase: ${stats.alreadyCopied}. Failures: ${stats.failed}.`,
  );
  if (stats.failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
