import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * The whole V1 workflow across three roles, against the Firebase emulators + demo seed:
 * register → verify email → onboard → apply → admin approves → student reports offline
 * payment → admin verifies & activates → lesson + quiz → assignment → mentor review &
 * attendance → admin issues certificate → public verification + PDF.
 */

const PROJECT = "demo-sainam";
const AUTH_EMULATOR = "http://127.0.0.1:9099";
const stamp = Date.now();
// Letters-only suffix keeps each run's student unique so the suite can be re-run on the same data.
const suffix = stamp.toString(26).replace(/./g, (c) => String.fromCharCode(65 + parseInt(c, 26)));
const student = { name: `E2E Student ${suffix}`, email: `e2e-${stamp}@example.com`, password: "Password123" };

test.describe.configure({ mode: "serial" });

async function login(browser: Browser, email: string, password = "Password123"): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
}

async function verifyEmailViaEmulator(email: string) {
  const res = await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const { oobCodes } = (await res.json()) as { oobCodes: { email: string; requestType: string; oobLink: string }[] };
  const code = oobCodes.reverse().find((c) => c.email === email && c.requestType === "VERIFY_EMAIL");
  expect(code, "verification email was sent").toBeTruthy();
  const applied = await fetch(code!.oobLink);
  expect(applied.ok).toBe(true);
}

let studentPage: Page;
let certificateId = "";

test("guards protected areas", async ({ page }) => {
  await page.goto("/dashboard/learning");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Flearning/);
  const api = await page.request.post("/api/ai/assistant", { data: { messages: [{ role: "user", content: "hi" }] } });
  expect(api.status()).toBe(403); // no same-origin header from a raw request → rejected
});

test("student registers, verifies email and onboards", async ({ browser }) => {
  const context = await browser.newContext();
  studentPage = await context.newPage();
  const page = studentPage;
  await page.goto("/register?next=%2Fapply%3Fprogram%3Dfull-stack-development");
  await page.getByLabel("Full name").fill(student.name);
  await page.getByLabel("Email").fill(student.email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(student.password);
  await page.getByLabel("Confirm password").fill(student.password);
  await page.getByLabel(/I agree/).check();
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("**/verify-email");

  await verifyEmailViaEmulator(student.email);
  await page.getByRole("button", { name: /I've verified my email/i }).click();
  await page.waitForURL("**/onboarding");

  await page.getByLabel("Phone / WhatsApp").fill("+91 98765 43210");
  await page.getByLabel("College / institute").fill("E2E Institute of Technology");
  await page.getByLabel("Degree").selectOption("BTECH");
  await page.getByLabel("Branch").fill("Computer Engineering");
  await page.getByLabel("Academic year").selectOption("THIRD_YEAR");
  await page.getByRole("button", { name: /finish setup/i }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Start your internship journey.")).toBeVisible();
});

test("student applies for Full Stack Development", async () => {
  const page = studentPage;
  await page.goto("/apply?program=full-stack-development");
  await expect(page.getByRole("radio", { name: /Full Stack Development/ })).toBeChecked();
  await page.getByLabel("Location (city, state)").fill("Pune, Maharashtra");
  const skills = page.getByLabel("Technical skills");
  await skills.fill("Python");
  await skills.press("Enter");
  await page.getByText("Beginner", { exact: true }).click();
  await page.getByText("Online", { exact: true }).click();
  await page.getByLabel("Availability").selectOption("WEEKDAYS");
  await page.getByLabel("Hours per week").selectOption("10_20");
  await page.getByLabel(/Why do you want to join/).fill("I want to build and deploy full-stack projects with real mentor feedback.");
  await page.getByLabel(/I confirm the information/).check();
  await page.getByRole("button", { name: /submit application/i }).click();
  await expect(page.getByRole("heading", { name: "Application submitted!" })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByLabel("Application progress")).toContainText("Full Stack Development");
});

test("admin approves the application with a batch", async ({ browser }) => {
  const admin = await login(browser, "admin@sainam.test");
  await admin.goto("/admin/applications");
  await admin.getByRole("searchbox").fill(student.email);
  await admin.getByRole("link", { name: student.name }).click();
  await admin.getByRole("button", { name: /^approve$/i }).click();
  const dialog = admin.getByRole("dialog");
  await dialog.getByLabel("Batch").selectOption({ label: "Winter 2026 · Batch A · Full Stack Development" });
  await dialog.getByRole("button", { name: /approve application/i }).click();
  await expect(admin.getByText(/Application approved/)).toBeVisible();
  await expect(admin.getByText("Awaiting payment").first()).toBeVisible();
  await admin.context().close();
});

test("student sees payment instructions and reports an offline payment", async () => {
  const page = studentPage;
  await page.goto("/dashboard/payment");
  await expect(page.getByRole("heading", { name: "How to complete your payment" })).toBeVisible();

  // Card numbers are refused before submission.
  await page.getByLabel("Transaction reference").fill("4111 1111 1111 1111");
  await expect(page.getByText(/looks like a card number/)).toBeVisible();

  await page.getByLabel("Transaction reference").fill("412345678901");
  await page.getByRole("button", { name: /verify my payment/i }).click();
  await expect(page.getByText("Verification in progress").first()).toBeVisible();
});

test("admin verifies the payment and activates the enrollment", async ({ browser }) => {
  const admin = await login(browser, "admin@sainam.test");
  await admin.goto("/admin/students?tab=payments");
  await admin.getByRole("searchbox").fill(student.email);
  await admin.getByRole("button", { name: "Verify" }).click();
  const dialog = admin.getByRole("dialog");
  await expect(dialog.getByLabel("New status")).toHaveValue("PAYMENT_CONFIRMED");
  await expect(dialog.getByLabel(/Activate enrollment now/)).toBeChecked();
  await dialog.getByRole("button", { name: /update payment/i }).click();
  await expect(admin.getByText("Payment updated")).toBeVisible();
  await admin.context().close();
});

test("student learns: passes the quiz, completes lessons, submits the assignment", async () => {
  const page = studentPage;
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Full Stack Development" })).toBeVisible();

  await page.goto("/dashboard/learning/demo-lesson-1");
  await page.getByRole("button", { name: /mark as complete/i }).click();
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();

  await page.goto("/dashboard/learning/demo-lesson-2");
  await page.getByLabel("GET").check();
  await page.getByLabel("A response").check();
  await page.getByRole("button", { name: /submit answers/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "Score: 100%" })).toBeVisible();

  await page.goto("/dashboard/learning/demo-lesson-3");
  await page.getByRole("button", { name: /mark as complete/i }).click();
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();

  await page.goto("/dashboard/assignments/demoassignment1");
  await page.getByLabel("GitHub repository").fill("https://github.com/e2e-student/landing-page");
  await page.getByLabel("Explanation").fill("A responsive landing page built with semantic HTML and CSS grid.");
  await page.getByRole("button", { name: /submit for review/i }).click();
  await expect(page.getByText(/Submitted — your mentor will review it soon/)).toBeVisible();
});

test("AI assistant answers with student context (mock provider)", async () => {
  const page = studentPage;
  await page.goto("/dashboard/assistant");
  await page.getByLabel("Your question").fill("How do I centre a div?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/hint-first approach/)).toBeVisible();
});

test("mentor reviews the submission and marks attendance", async ({ browser }) => {
  const mentor = await login(browser, "mentor@sainam.test");
  await mentor.goto("/mentor/submissions");
  await mentor.getByRole("searchbox").fill(student.name);
  await mentor.getByRole("button", { name: "Review" }).click();
  const dialog = mentor.getByRole("dialog");
  await dialog.getByLabel("Decision").selectOption("APPROVED");
  await dialog.getByLabel(/Score/).fill("92");
  await dialog.getByLabel("Feedback").fill("Clean semantic markup and a solid responsive layout.");
  await dialog.getByRole("button", { name: /save review/i }).click();
  await expect(mentor.getByText("Review saved")).toBeVisible();

  await mentor.goto("/mentor/attendance?session=demo-session-1");
  const row = mentor.getByRole("listitem").filter({ hasText: student.name });
  await row.getByText("Present", { exact: true }).click();
  await mentor.getByRole("button", { name: /attendance/i }).last().click();
  await expect(mentor.getByText(/Attendance saved/)).toBeVisible();
  await mentor.context().close();
});

test("admin issues the certificate", async ({ browser }) => {
  const admin = await login(browser, "admin@sainam.test");
  await admin.goto("/admin/certificates");
  const table = admin.getByRole("table", { name: "Certificate eligibility" });
  // The eligibility filter defaults to "Eligible"; show everyone to find our student.
  await admin.getByLabel("Eligible").first().selectOption("");
  await admin.getByRole("searchbox").first().fill(student.name);
  const row = table.getByRole("row").filter({ hasText: student.name });
  // No project was assigned in this run, so the admin uses the documented override.
  await row.getByRole("button", { name: /override/i }).click();
  const dialog = admin.getByRole("dialog");
  await dialog.getByLabel(/I confirm this student/).check();
  await dialog.getByRole("button", { name: /issue anyway/i }).click();
  await expect(admin.getByText(/Certificate ST-W\d\d-/)).toBeVisible();
  await admin.context().close();
});

test("student downloads and publicly verifies the certificate", async ({ browser }) => {
  const page = studentPage;
  await page.goto("/dashboard/certificates");
  const idText = await page.getByText(/^ST-W\d{2}-[A-Z2-9]{4}-[A-Z2-9]{4}$/).first().textContent();
  certificateId = idText!.trim();

  const pdf = await page.request.get(`/api/certificates/${certificateId}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  const anon = await (await browser.newContext()).newPage();
  await anon.goto(`/verify/${certificateId}`);
  await expect(anon.getByRole("heading", { name: "Certificate Verified" })).toBeVisible();
  await expect(anon.getByText(student.name)).toBeVisible();
  await expect(anon.getByText("Full Stack Development Internship")).toBeVisible();
  await anon.goto("/verify/ST-W26-ZZZZ-ZZZZ");
  await expect(anon.getByRole("heading", { name: "Certificate not found" })).toBeVisible();
});

test("roles are enforced server-side", async () => {
  const page = studentPage;
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/mentor/students");
  await expect(page).toHaveURL(/\/dashboard$/);
  const csv = await page.request.get("/api/admin/export/applications");
  expect(csv.status()).toBe(403);
});
