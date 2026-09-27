import "server-only";

import { applicationDefault, cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Firebase Admin SDK — server only. Credentials come from server environment
 * variables (never NEXT_PUBLIC_*), Application Default Credentials, or the local emulators.
 */

export function usingEmulators(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

function projectId(): string | undefined {
  return process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

export function storageBucketName(): string | undefined {
  return (
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    (projectId() ? `${projectId()}.appspot.com` : undefined)
  );
}

export function isAdminConfigured(): boolean {
  return Boolean(
    (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) ||
      usingEmulators() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_CONFIG ||
      process.env.FIREBASE_ADMIN_USE_ADC === "true",
  );
}

// Survives dev-server hot reloads: Firestore.settings() may only be called once per instance.
const globalForAdmin = globalThis as unknown as { __sainamFirestore?: Firestore };

function adminApp(): App {
  if (getApps().length) return getApp();
  const options = { projectId: projectId(), storageBucket: storageBucketName() };
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (clientEmail && privateKey) {
    return initializeApp({
      ...options,
      credential: cert({ projectId: options.projectId, clientEmail, privateKey }),
    });
  }
  if (usingEmulators()) return initializeApp(options);
  return initializeApp({ ...options, credential: applicationDefault() });
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  if (globalForAdmin.__sainamFirestore) return globalForAdmin.__sainamFirestore;
  const db = getFirestore(adminApp());
  db.settings({ ignoreUndefinedProperties: true });
  globalForAdmin.__sainamFirestore = db;
  return db;
}

export function adminBucket() {
  return getStorage(adminApp()).bucket(storageBucketName());
}
