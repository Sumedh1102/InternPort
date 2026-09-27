/**
 * Admin SDK bootstrap for CLI scripts (outside Next.js, so no `server-only` imports).
 * Uses the same env vars as the app: service-account vars, ADC, or the emulators.
 */
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const usingEmulators = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST,
);

export function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId) throw new Error("Set NEXT_PUBLIC_FIREBASE_PROJECT_ID (or FIREBASE_ADMIN_PROJECT_ID).");
  if (clientEmail && privateKey) {
    initializeApp({ projectId, credential: cert({ projectId, clientEmail, privateKey }) });
  } else if (usingEmulators) {
    initializeApp({ projectId });
  } else {
    initializeApp({ projectId, credential: applicationDefault() });
  }
  getFirestore().settings({ ignoreUndefinedProperties: true });
}

export const db = () => getFirestore();
export const auth = () => getAuth();
