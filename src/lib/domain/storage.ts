import { ADMIN_ROLES, STAFF_ROLES, type Role } from "./enums";

/**
 * Supabase Storage layout and access rules. Framework-free so the server, the
 * migration script and unit tests share one definition.
 *
 * Users sign in with Firebase Auth, so Supabase RLS can't identify them. Every
 * bucket is private; the server checks these rules against the Firebase session,
 * then hands out a one-time signed upload URL or a short-lived signed read URL.
 *
 * A storage path is `<bucket>/<folder…>/<file>`, e.g. `resumes/{uid}/171…-cv.pdf`.
 */

export const BUCKETS = ["profile-images", "resumes", "internship-documents"] as const;
export type Bucket = (typeof BUCKETS)[number];

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const UPLOAD_POLICIES = {
  profileImage: { maxBytes: 2 * 1024 * 1024, types: IMAGE_TYPES },
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
      ...IMAGE_TYPES,
      "text/plain",
      "text/markdown",
    ],
  },
  screenshot: { maxBytes: 5 * 1024 * 1024, types: IMAGE_TYPES },
  staffFile: {
    maxBytes: 20 * 1024 * 1024,
    types: [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      ...IMAGE_TYPES,
      "text/plain",
      "text/markdown",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
} satisfies Record<string, UploadPolicy>;

export interface UploadPolicy {
  maxBytes: number;
  types: readonly string[];
}

export type UploadKind = keyof typeof UPLOAD_POLICIES;

const DOCUMENT_POLICIES = [UPLOAD_POLICIES.submission, UPLOAD_POLICIES.screenshot, UPLOAD_POLICIES.staffFile];

/** Limits Supabase enforces per bucket, as a backstop to the per-folder policies. */
export const BUCKET_LIMITS: Record<Bucket, UploadPolicy> = {
  "profile-images": UPLOAD_POLICIES.profileImage,
  resumes: UPLOAD_POLICIES.resume,
  "internship-documents": {
    maxBytes: Math.max(...DOCUMENT_POLICIES.map((p) => p.maxBytes)),
    types: [...new Set(DOCUMENT_POLICIES.flatMap((p) => p.types))],
  },
};

/** The folder a file lives in, with the ids that decide who may touch it. */
export type StorageFolder =
  | { area: "profile"; uid: string }
  | { area: "resume"; uid: string }
  | { area: "project"; uid: string; projectId: string }
  | { area: "submission"; submissionId: string }
  | { area: "assignment"; assignmentId: string }
  | { area: "resource"; programId: string };

export const FOLDER_KIND: Record<StorageFolder["area"], UploadKind> = {
  profile: "profileImage",
  resume: "resume",
  project: "screenshot",
  submission: "submission",
  assignment: "staffFile",
  resource: "staffFile",
};

const ID = "([A-Za-z0-9_-]{1,128})";
const FOLDERS: { pattern: RegExp; build: (m: string[]) => StorageFolder }[] = [
  { pattern: new RegExp(`^profile-images/${ID}/$`), build: (m) => ({ area: "profile", uid: m[1] }) },
  { pattern: new RegExp(`^resumes/${ID}/$`), build: (m) => ({ area: "resume", uid: m[1] }) },
  {
    pattern: new RegExp(`^internship-documents/users/${ID}/projects/${ID}/$`),
    build: (m) => ({ area: "project", uid: m[1], projectId: m[2] }),
  },
  {
    pattern: new RegExp(`^internship-documents/submissions/${ID}/$`),
    build: (m) => ({ area: "submission", submissionId: m[1] }),
  },
  {
    pattern: new RegExp(`^internship-documents/assignments/${ID}/$`),
    build: (m) => ({ area: "assignment", assignmentId: m[1] }),
  },
  {
    pattern: new RegExp(`^internship-documents/programs/${ID}/resources/$`),
    build: (m) => ({ area: "resource", programId: m[1] }),
  },
];

const FILE_NAME = /^[A-Za-z0-9._-]{1,120}$/;

/** Parses a folder such as `resumes/{uid}/` (trailing slash required). */
export function parseStorageFolder(folder: string): StorageFolder | null {
  for (const { pattern, build } of FOLDERS) {
    const m = pattern.exec(folder);
    if (m) return build(m);
  }
  return null;
}

/** Parses a full file path. Rejects traversal, empty segments and unsafe names. */
export function parseStoragePath(path: string): { folder: StorageFolder; fileName: string } | null {
  const slash = path.lastIndexOf("/");
  if (slash < 0) return null;
  const fileName = path.slice(slash + 1);
  if (!FILE_NAME.test(fileName) || /^\.+$/.test(fileName)) return null;
  const folder = parseStorageFolder(path.slice(0, slash + 1));
  return folder ? { folder, fileName } : null;
}

/** Splits `bucket/key…` for the Supabase client. */
export function splitStoragePath(path: string): { bucket: Bucket; key: string } | null {
  const slash = path.indexOf("/");
  const bucket = path.slice(0, slash) as Bucket;
  if (slash < 0 || !BUCKETS.includes(bucket)) return null;
  return { bucket, key: path.slice(slash + 1) };
}

/** Turns a user-supplied file name into a safe final path segment. */
export function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^\./, "");
  return cleaned.slice(-80) || "file";
}

/** App URL that serves a stored file after an access check (see `/api/files`). */
export function storageFileUrl(path: string): string {
  return `/api/files/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export interface StorageActor {
  uid: string;
  role: Role;
}

function ownsSubmission(actor: StorageActor, submissionId: string) {
  // Submission ids are `${assignmentId}_${uid}`, and assignment ids are alphanumeric.
  return new RegExp(`^[A-Za-z0-9]+_${escapeRegExp(actor.uid)}$`).test(submissionId);
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Who may upload to (and delete from) a folder. Mirrors the former storage.rules. */
export function canWriteStorage(actor: StorageActor, folder: StorageFolder): boolean {
  switch (folder.area) {
    case "profile":
    case "resume":
    case "project":
      return folder.uid === actor.uid;
    case "submission":
      return ownsSubmission(actor, folder.submissionId);
    case "assignment":
      return STAFF_ROLES.includes(actor.role);
    case "resource":
      return ADMIN_ROLES.includes(actor.role);
  }
}

/**
 * Who may read a file. Featured project screenshots are also public; that needs a
 * Firestore lookup, so the caller checks it when this returns false for a project.
 */
export function canReadStorage(actor: StorageActor | null, folder: StorageFolder): boolean {
  if (!actor) return false;
  const staff = STAFF_ROLES.includes(actor.role);
  switch (folder.area) {
    case "profile":
    case "resume":
    case "project":
      return staff || folder.uid === actor.uid;
    case "submission":
      return staff || ownsSubmission(actor, folder.submissionId);
    case "assignment":
    case "resource":
      return true;
  }
}

/**
 * Maps a Firebase Storage path to its Supabase path, or null if it isn't one.
 * `users/{uid}/profile/f` → `profile-images/{uid}/f`, `users/{uid}/resume/f` →
 * `resumes/{uid}/f`; project, submission, assignment and resource files keep their
 * path under `internship-documents/`.
 */
export function supabasePathForLegacy(path: string): string | null {
  const user = /^users\/([^/]+)\/(profile|resume)\/([^/]+)$/.exec(path);
  const mapped = user
    ? `${user[2] === "profile" ? "profile-images" : "resumes"}/${user[1]}/${user[3]}`
    : /^(users\/[^/]+\/projects\/|submissions\/|assignments\/|programs\/[^/]+\/resources\/)/.test(path)
      ? `internship-documents/${path}`
      : null;
  return mapped && parseStoragePath(mapped) ? mapped : null;
}
