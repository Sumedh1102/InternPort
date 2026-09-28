"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { firebaseClient } from "./client";

export class AuthFlowError extends Error {}

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters with letters and numbers).",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/cancelled-popup-request": "Google sign-in was cancelled.",
  "auth/user-disabled": "This account has been disabled. Contact Sainam Technology.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
};

export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthFlowError) return error.message;
  const code = (error as { code?: string })?.code;
  return (code && MESSAGES[code]) || "Something went wrong. Please try again.";
}

interface SessionResponse {
  ok: boolean;
  refresh?: boolean;
  redirectTo?: string;
  role?: string;
  error?: string;
  code?: string;
}

async function postSession(user: User, name?: string, forceRefresh = false): Promise<SessionResponse> {
  const idToken = await user.getIdToken(forceRefresh);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, name }),
    credentials: "same-origin",
  });
  const body = (await res.json().catch(() => ({ ok: false }))) as SessionResponse;
  if (!res.ok || !body.ok) throw new AuthFlowError(body.error ?? "Could not start your session.");
  return body;
}

/**
 * Exchanges the Firebase ID token for an httpOnly session cookie. When the server
 * has just assigned a role claim it asks us to refresh the token and try again.
 */
export async function establishSession(user: User, name?: string): Promise<string> {
  let body = await postSession(user, name);
  if (body.refresh) body = await postSession(user, name, true);
  if (body.refresh) throw new AuthFlowError("Your account is being set up. Please try again.");
  return body.redirectTo ?? "/dashboard";
}

export async function loginWithEmail(email: string, password: string): Promise<string> {
  const { auth } = firebaseClient();
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return establishSession(cred.user);
}

export async function registerWithEmail(name: string, email: string, password: string): Promise<string> {
  const { auth } = firebaseClient();
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name });
  await sendEmailVerification(cred.user, { url: `${window.location.origin}/verify-email` }).catch(() => {});
  return establishSession(cred.user, name);
}

const googleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};

export async function loginWithGoogle(): Promise<string | null> {
  const { auth } = firebaseClient();
  try {
    const cred = await signInWithPopup(auth, googleProvider());
    return establishSession(cred.user, cred.user.displayName ?? undefined);
  } catch (error) {
    if ((error as { code?: string }).code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider());
      return null;
    }
    throw error;
  }
}

/** Completes a Google redirect sign-in (used when popups are blocked). */
export async function completeRedirectLogin(): Promise<string | null> {
  const { auth } = firebaseClient();
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return establishSession(result.user, result.user.displayName ?? undefined);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { auth } = firebaseClient();
  try {
    await sendPasswordResetEmail(auth, email.trim(), { url: `${window.location.origin}/login` });
  } catch (error) {
    // Don't reveal whether an account exists for this email.
    if ((error as { code?: string }).code === "auth/user-not-found") return;
    throw error;
  }
}

export async function resendVerification(): Promise<void> {
  const { auth } = firebaseClient();
  // After a full page load the persisted user is restored asynchronously.
  await auth.authStateReady();
  if (!auth.currentUser) throw new AuthFlowError("Please log in again to resend the email.");
  await sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/verify-email` });
}

/** Re-checks verification and, once verified, refreshes the session cookie claims. */
export async function refreshVerifiedSession(): Promise<string | null> {
  const { auth } = firebaseClient();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new AuthFlowError("Please log in again.");
  await user.reload();
  if (!user.emailVerified) return null;
  await user.getIdToken(true);
  return establishSession(user);
}

export async function logout(everywhere = false): Promise<void> {
  await fetch(`/api/auth/session${everywhere ? "?everywhere=1" : ""}`, {
    method: "DELETE",
    credentials: "same-origin",
  }).catch(() => {});
  try {
    await signOut(firebaseClient().auth);
  } catch {
    // Firebase not configured client-side — the cookie is already cleared.
  }
}
