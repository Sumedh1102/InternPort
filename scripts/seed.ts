/**
 * Seeds Firestore with the program catalogue and default platform settings.
 *
 *   npm run seed            # upsert programs (create missing, keep admin edits)
 *   npm run seed -- --force # overwrite programs with the seed file
 *   npm run seed -- --demo  # EMULATOR ONLY: demo accounts, batch, lessons, assignment…
 *
 * Demo data is refused against a real project so no fabricated records reach production.
 */
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { DEFAULT_CERTIFICATE_CRITERIA } from "../src/lib/domain/certificates";
import { SEED_PROGRAMS } from "./seed-data/programs";
import { auth, db, initAdmin, usingEmulators } from "./_admin";

const args = new Set(process.argv.slice(2));
const now = () => FieldValue.serverTimestamp();
const days = (n: number) => Timestamp.fromDate(new Date(Date.now() + n * 86400e3));

async function seedPrograms(force: boolean) {
  const programs = db().collection("programs");
  const ids: Record<string, string> = {};
  for (const program of SEED_PROGRAMS) {
    const existing = await programs.where("slug", "==", program.slug).limit(1).get();
    const payload = { ...program, fees: { ...program.fees, currency: "INR", unit: "MONTH" } };
    if (existing.empty) {
      const ref = await programs.add({ ...payload, createdAt: now(), updatedAt: now() });
      ids[program.slug] = ref.id;
      console.log(`  + ${program.name}`);
    } else {
      ids[program.slug] = existing.docs[0]!.id;
      if (force) {
        await existing.docs[0]!.ref.set({ ...payload, updatedAt: now() }, { merge: true });
        console.log(`  ↻ ${program.name}`);
      } else {
        console.log(`  = ${program.name} (kept)`);
      }
    }
  }
  return ids;
}

async function seedSettings() {
  const ref = db().collection("settings").doc("platform");
  if ((await ref.get()).exists) {
    console.log("  = settings (kept)");
    return;
  }
  await ref.set({
    applicationsOpen: true,
    earlyBird: { enabled: true, limit: 20, claimed: 0, showRemaining: false },
    payment: {
      instructions:
        "Sainam Technology will share the payment details with you directly after your application is approved. " +
        "Once you have paid, submit your transaction reference here so our team can verify it manually. " +
        "Never share card numbers, CVV, OTPs or banking passwords with anyone.",
    },
    contact: {},
    certificate: { ...DEFAULT_CERTIFICATE_CRITERIA },
    ai: { enabled: true, dailyLimit: 40 },
    updatedAt: now(),
  });
  console.log("  + settings");
}

async function ensureUser(email: string, password: string, name: string, role: string) {
  let user;
  try {
    user = await auth().getUserByEmail(email);
  } catch {
    user = await auth().createUser({ email, password, displayName: name, emailVerified: true });
  }
  await auth().setCustomUserClaims(user.uid, { role });
  await db()
    .collection("users")
    .doc(user.uid)
    .set(
      {
        name,
        email,
        role,
        onboarded: true,
        college: role === "STUDENT" ? "Demo Institute of Technology" : null,
        degree: role === "STUDENT" ? "BTECH" : null,
        branch: role === "STUDENT" ? "Computer Engineering" : null,
        year: role === "STUDENT" ? "THIRD_YEAR" : null,
        phone: role === "STUDENT" ? "+91 90000 00000" : null,
        createdAt: now(),
        updatedAt: now(),
      },
      { merge: true },
    );
  return user.uid;
}

async function seedDemo(programIds: Record<string, string>) {
  const password = "Password123";
  const adminUid = await ensureUser("admin@sainam.test", password, "Demo Admin", "SUPER_ADMIN");
  const mentorUid = await ensureUser("mentor@sainam.test", password, "Demo Mentor", "MENTOR");
  const studentUid = await ensureUser("student@sainam.test", password, "Demo Student", "STUDENT");
  const programId = programIds["full-stack-development"]!;
  const programName = "Full Stack Development";
  const d = db();

  await d.doc("batches/demo-batch-a").set({
    programId,
    programName,
    name: "Winter 2026 · Batch A",
    code: "FSD-W26-A",
    startDate: days(-7),
    endDate: days(83),
    mentorIds: [mentorUid],
    capacity: 30,
    studentCount: 1,
    schedule: "Mon / Wed / Fri · 6–8 PM IST",
    status: "ACTIVE",
    createdAt: now(),
    updatedAt: now(),
  });

  await d.doc("courses/demo-course").set({
    programId,
    title: "Full Stack Foundations",
    description: "Start here — the web platform, JavaScript and your first React components.",
    modules: [
      { id: "web", title: "Web foundations", order: 0 },
      { id: "react", title: "React basics", order: 1 },
    ],
    order: 0,
    status: "PUBLISHED",
    createdAt: now(),
    updatedAt: now(),
  });

  const lessons = [
    {
      id: "demo-lesson-1",
      moduleId: "web",
      title: "How the web works",
      type: "ARTICLE",
      summary: "Requests, responses, and what happens when you hit enter.",
      content:
        "## Request → response\n\nA browser sends an **HTTP request** to a server, which replies with a **response** (HTML, JSON, images…).\n\n- `GET` reads data\n- `POST` creates data\n\n```js\nconst res = await fetch('/api/hello');\nconst data = await res.json();\n```\n\nTry opening your browser's **Network** tab and reload this page.",
      order: 0,
      durationMinutes: 15,
    },
    {
      id: "demo-lesson-2",
      moduleId: "web",
      title: "Check your understanding: HTTP",
      type: "QUIZ",
      summary: "A quick quiz on requests and responses.",
      content: "Answer all questions. You need 60% to pass.",
      quiz: [
        { id: "q1", question: "Which HTTP method is typically used to read data?", options: ["POST", "GET", "DELETE"] },
        { id: "q2", question: "What does a server send back to the browser?", options: ["A request", "A response", "A cookie jar"] },
      ],
      answers: [1, 1],
      order: 1,
      durationMinutes: 5,
    },
    {
      id: "demo-lesson-3",
      moduleId: "react",
      title: "Your first React component",
      type: "ARTICLE",
      summary: "Components, props and JSX.",
      content:
        "## Components\n\nA component is a function that returns UI.\n\n```tsx\nfunction Greeting({ name }: { name: string }) {\n  return <h1>Hello, {name}!</h1>;\n}\n```\n\nProps flow **down** from parent to child.",
      order: 0,
      durationMinutes: 20,
    },
  ];
  for (const { id, answers, ...lesson } of lessons) {
    await d.doc(`lessons/${id}`).set({
      ...lesson,
      courseId: "demo-course",
      programId,
      resources: [],
      quiz: lesson.quiz ?? [],
      quizPassPercent: lesson.type === "QUIZ" ? 60 : null,
      status: "PUBLISHED",
      createdAt: now(),
      updatedAt: now(),
    });
    await d.doc(`lessons/${id}/answerKey/key`).set({ answers: answers ?? [] });
  }

  await d.doc("applications/demo-application").set({
    uid: studentUid,
    fullName: "Demo Student",
    email: "student@sainam.test",
    phone: "+91 90000 00000",
    college: "Demo Institute of Technology",
    degree: "BTECH",
    branch: "Computer Engineering",
    academicYear: "THIRD_YEAR",
    location: "Pune",
    programId,
    programSlug: "full-stack-development",
    programName,
    technicalSkills: ["HTML", "CSS", "JavaScript"],
    skillLevel: "BEGINNER",
    preferredMode: "ONLINE",
    availability: "WEEKDAYS",
    hoursPerWeek: "10_20",
    motivation: "Demo application created by the seed script for local development.",
    earlyBirdInterest: true,
    consent: true,
    status: "ENROLLED",
    notes: [],
    pricingTier: "EARLY_BIRD",
    enrollmentId: "demo-enrollment",
    assignedBatchId: "demo-batch-a",
    assignedMentorId: mentorUid,
    createdAt: days(-10),
    updatedAt: now(),
  });

  await d.doc("enrollments/demo-enrollment").set({
    uid: studentUid,
    studentName: "Demo Student",
    studentEmail: "student@sainam.test",
    applicationId: "demo-application",
    programId,
    programName,
    programSlug: "full-stack-development",
    batchId: "demo-batch-a",
    batchName: "Winter 2026 · Batch A",
    mentorId: mentorUid,
    mentorName: "Demo Mentor",
    status: "ACTIVE",
    payment: {
      provider: "MANUAL",
      status: "PAYMENT_CONFIRMED",
      pricingTier: "EARLY_BIRD",
      monthlyFee: 1500,
      months: 3,
      totalAmount: 4500,
      currency: "INR",
      method: "UPI",
      reference: "DEMO-REF-0001",
      verifiedBy: adminUid,
      history: [],
    },
    completedLessonIds: ["demo-lesson-1"],
    progress: { lessonsCompleted: 1, lessonsTotal: 3, lessonPercent: 33 },
    startDate: days(-7),
    endDate: days(83),
    activatedAt: days(-7),
    createdAt: days(-9),
    updatedAt: now(),
  });

  await d.doc("assignments/demoassignment1").set({
    programId,
    batchId: "demo-batch-a",
    courseId: "demo-course",
    title: "Build a personal landing page",
    description: "Create a responsive one-page site that introduces you.",
    instructions:
      "1. Use semantic HTML.\n2. Make it responsive down to 320px.\n3. Deploy it and share the live URL + GitHub repo.",
    dueDate: days(7),
    maxScore: 100,
    allowFileUpload: true,
    attachments: [],
    status: "PUBLISHED",
    createdBy: mentorUid,
    createdByName: "Demo Mentor",
    createdAt: now(),
    updatedAt: now(),
  });

  await d.doc("sessions/demo-session-1").set({
    programId,
    batchId: "demo-batch-a",
    batchName: "Winter 2026 · Batch A",
    title: "Kickoff live class",
    description: "Program overview, tools setup and Q&A.",
    type: "LIVE_CLASS",
    startAt: days(-2),
    durationMinutes: 90,
    mentorId: mentorUid,
    mentorName: "Demo Mentor",
    status: "COMPLETED",
    createdAt: now(),
    updatedAt: now(),
  });
  await d.doc("sessions/demo-session-2").set({
    programId,
    batchId: "demo-batch-a",
    batchName: "Winter 2026 · Batch A",
    title: "React fundamentals workshop",
    type: "WORKSHOP",
    startAt: days(2),
    durationMinutes: 120,
    meetingUrl: "https://meet.google.com/",
    mentorId: mentorUid,
    mentorName: "Demo Mentor",
    status: "SCHEDULED",
    createdAt: now(),
    updatedAt: now(),
  });
  await d.doc(`attendance/demo-session-1_${studentUid}`).set({
    sessionId: "demo-session-1",
    sessionTitle: "Kickoff live class",
    batchId: "demo-batch-a",
    programId,
    uid: studentUid,
    studentName: "Demo Student",
    date: days(-2),
    status: "PRESENT",
    markedBy: mentorUid,
    markedAt: now(),
  });

  await d.doc("projects/demo-project").set({
    uid: studentUid,
    studentName: "Demo Student",
    enrollmentId: "demo-enrollment",
    programId,
    programName,
    batchId: "demo-batch-a",
    mentorId: mentorUid,
    title: "Task manager app",
    description: "A full-stack task manager with auth, CRUD and a deployed frontend.",
    techStack: ["Next.js", "Node.js", "PostgreSQL"],
    status: "ASSIGNED",
    screenshots: [],
    maxScore: 100,
    dueDate: days(60),
    featured: false,
    createdAt: now(),
    updatedAt: now(),
  });

  await d.doc("announcements/demo-welcome").set({
    title: "Welcome to Batch A!",
    body: "Your first workshop is this week. Complete the first two lessons before it starts.",
    audience: "BATCH",
    programId,
    batchId: "demo-batch-a",
    pinned: true,
    authorId: mentorUid,
    authorName: "Demo Mentor",
    createdAt: now(),
    updatedAt: now(),
  });

  await d.doc("settings/platform").set({ earlyBird: { claimed: 1 } }, { merge: true });

  console.log("  + demo accounts (password: Password123)");
  console.log("      admin@sainam.test · mentor@sainam.test · student@sainam.test");
}

async function main() {
  initAdmin();
  console.log("Seeding programs…");
  const ids = await seedPrograms(args.has("--force"));
  console.log("Seeding settings…");
  await seedSettings();
  if (args.has("--demo")) {
    if (!usingEmulators) {
      console.error("✖ --demo only runs against the Firebase emulators.");
      process.exit(1);
    }
    console.log("Seeding demo data (emulator)…");
    await seedDemo(ids);
  }
  console.log("✔ Done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
