import { readFileSync } from "node:fs";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

/**
 * Firestore rules. Run with the emulators:
 *   npm run test:rules
 */
let env: RulesTestEnvironment;

const student = (uid = "stu1") => env.authenticatedContext(uid, { email_verified: true });
const withRole = (uid: string, role: string) => env.authenticatedContext(uid, { role, email_verified: true });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-sainam-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "programs/pub"), { status: "PUBLISHED", name: "Published" });
    await setDoc(doc(db, "programs/draft"), { status: "DRAFT", name: "Draft" });
    await setDoc(doc(db, "users/stu1"), { name: "Student One", role: "STUDENT" });
    await setDoc(doc(db, "users/stu2"), { name: "Student Two", role: "STUDENT" });
    await setDoc(doc(db, "applications/a1"), { uid: "stu1", status: "PENDING" });
    await setDoc(doc(db, "applications/a2"), { uid: "stu2", status: "PENDING" });
    await setDoc(doc(db, "lessons/l1"), { programId: "pub", status: "PUBLISHED" });
    await setDoc(doc(db, "lessons/l1/answerKey/key"), { answers: [1] });
    await setDoc(doc(db, "notifications/n1"), { uid: "stu1", title: "Hi", read: false });
    await setDoc(doc(db, "notifications/n2"), { uid: "stu2", title: "Hi", read: false });
    await setDoc(doc(db, "certificates/ST-W26-AAAA-BBBB"), { studentId: "stu1", status: "VALID" });
    await setDoc(doc(db, "settings/platform"), { applicationsOpen: true });
    await setDoc(doc(db, "team/t1"), { name: "Visible", visible: true });
    await setDoc(doc(db, "team/t2"), { name: "Hidden", visible: false });
  });
});

describe("firestore: public data", () => {
  it("anyone can read published programs but not drafts", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "programs/pub")));
    await assertFails(getDoc(doc(db, "programs/draft")));
  });

  it("only visible team members are public", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "team/t1")));
    await assertFails(getDoc(doc(db, "team/t2")));
  });

  it("settings are admin-only", async () => {
    await assertFails(getDoc(doc(student().firestore(), "settings/platform")));
    await assertSucceeds(getDoc(doc(withRole("adm", "ADMIN").firestore(), "settings/platform")));
  });
});

describe("firestore: ownership", () => {
  it("students read their own records only", async () => {
    const db = student().firestore();
    await assertSucceeds(getDoc(doc(db, "applications/a1")));
    await assertFails(getDoc(doc(db, "applications/a2")));
    await assertSucceeds(getDoc(doc(db, "users/stu1")));
    await assertFails(getDoc(doc(db, "users/stu2")));
    await assertSucceeds(getDoc(doc(db, "certificates/ST-W26-AAAA-BBBB")));
    await assertFails(getDoc(doc(student("stu2").firestore(), "certificates/ST-W26-AAAA-BBBB")));
  });

  it("students cannot list other users' notifications", async () => {
    const db = student().firestore();
    await assertSucceeds(getDocs(query(collection(db, "notifications"), where("uid", "==", "stu1"))));
    await assertFails(getDocs(collection(db, "notifications")));
  });

  it("a role supplied by the client is ignored — only custom claims count", async () => {
    const db = student().firestore();
    await assertFails(setDoc(doc(db, "users/stu1"), { role: "ADMIN" }, { merge: true }));
    await assertFails(getDoc(doc(db, "lessons/l1")));
  });
});

describe("firestore: writes go through the server", () => {
  it("clients cannot create or edit applications, enrollments or payments", async () => {
    const db = student().firestore();
    await assertFails(setDoc(doc(db, "applications/new"), { uid: "stu1", status: "APPROVED" }));
    await assertFails(updateDoc(doc(db, "applications/a1"), { status: "ENROLLED" }));
    await assertFails(setDoc(doc(db, "enrollments/e1"), { uid: "stu1", status: "ACTIVE" }));
    await assertFails(setDoc(doc(withRole("adm", "ADMIN").firestore(), "programs/x"), { status: "PUBLISHED" }));
  });

  it("owners may only flip their notification to read", async () => {
    const db = student().firestore();
    await assertSucceeds(updateDoc(doc(db, "notifications/n1"), { read: true }));
    await assertFails(updateDoc(doc(db, "notifications/n1"), { title: "Hacked" }));
    await assertFails(updateDoc(doc(db, "notifications/n2"), { read: true }));
  });
});

describe("firestore: quiz answer keys", () => {
  it("are hidden from students and mentors", async () => {
    await assertFails(getDoc(doc(student().firestore(), "lessons/l1/answerKey/key")));
    await assertFails(getDoc(doc(withRole("men", "MENTOR").firestore(), "lessons/l1/answerKey/key")));
    await assertSucceeds(getDoc(doc(withRole("men", "MENTOR").firestore(), "lessons/l1")));
    await assertSucceeds(getDoc(doc(withRole("adm", "ADMIN").firestore(), "lessons/l1/answerKey/key")));
  });
});
