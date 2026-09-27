import "server-only";

import {
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import { adminDb } from "../firebase-admin";

export const COL = {
  users: "users",
  applications: "applications",
  programs: "programs",
  batches: "batches",
  enrollments: "enrollments",
  courses: "courses",
  lessons: "lessons",
  assignments: "assignments",
  submissions: "submissions",
  projects: "projects",
  attendance: "attendance",
  sessions: "sessions",
  evaluations: "evaluations",
  certificates: "certificates",
  announcements: "announcements",
  notifications: "notifications",
  resources: "resources",
  settings: "settings",
  team: "team",
  contactMessages: "contactMessages",
} as const;

export type CollectionName = (typeof COL)[keyof typeof COL];

export const SETTINGS_DOC = "platform";

export function col(name: CollectionName) {
  return adminDb().collection(name);
}

export const serverNow = () => FieldValue.serverTimestamp();

export function toTimestamp(iso: string | null | undefined): Timestamp | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso);
  return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

/** Recursively converts Firestore Timestamps into ISO strings so data is RSC-serializable. */
export function serialize<T>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map((v) => serialize(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out as T;
  }
  return value as T;
}

export function fromSnap<T>(snap: DocumentSnapshot | QueryDocumentSnapshot): T | null {
  if (!snap.exists) return null;
  return serialize<T>({ ...snap.data(), id: snap.id });
}

export async function getDocById<T>(name: CollectionName, id: string): Promise<T | null> {
  if (!id) return null;
  const snap = await col(name).doc(id).get();
  return fromSnap<T>(snap);
}

export async function queryDocs<T>(query: Query): Promise<T[]> {
  const snap = await query.get();
  return snap.docs.map((d) => fromSnap<T>(d)!).filter(Boolean);
}

/** Firestore `in` supports at most 30 values: chunk and merge. */
export async function whereIn<T>(
  name: CollectionName,
  field: string,
  values: string[],
): Promise<T[]> {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30));
  const results = await Promise.all(
    chunks.map((chunk) =>
      field === "__name__"
        ? Promise.all(chunk.map((id) => getDocById<T>(name, id))).then((r) => r.filter(Boolean) as T[])
        : queryDocs<T>(col(name).where(field, "in", chunk)),
    ),
  );
  return results.flat();
}

export async function countOf(query: Query): Promise<number> {
  const snap = await query.count().get();
  return snap.data().count;
}

export function byDateDesc<T>(key: keyof T) {
  return (a: T, b: T) => String(b[key] ?? "").localeCompare(String(a[key] ?? ""));
}

export function byDateAsc<T>(key: keyof T) {
  return (a: T, b: T) => String(a[key] ?? "").localeCompare(String(b[key] ?? ""));
}

export { FieldValue, Timestamp };
