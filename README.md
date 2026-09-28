# Sainam Technology — Website, Internship Platform & LMS

One Next.js app that serves:

- **Public website**: home, about, services, technology, projects, team, internships (7 programs), how it works, contact, apply, and public certificate verification.
- **Student dashboard** (`/dashboard`): application tracker, offline payment reporting, lessons and quizzes, assignments, projects, attendance, certificates, notifications, an AI study assistant and progress insights.
- **Mentor dashboard** (`/mentor`): batch-scoped students, assignments, submission reviews, sessions, attendance and announcements.
- **Admin dashboard** (`/admin`): application review, manual payment verification and enrollment activation, programs, batches, roles, courses and lessons, certificates, analytics and settings.

Built for the **Winter Internship 2026** (3 months, 7 domains).

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript and Tailwind CSS v4.
- Radix UI primitives with shadcn-style components, and Lucide icons.
- React Hook Form and Zod.
- Firebase: Auth, Firestore, Storage, custom claims and security rules. The Admin SDK is used on the server only.
- Anthropic or Gemini for AI features, both optional.
- Vitest (unit tests and rules tests) and Playwright (end-to-end tests).

## Quick start (local, no cloud account needed)

The Firebase Emulator Suite runs Auth, Firestore and Storage locally with demo data.

Requirements: Node.js 20.9 or newer, and Java 11 or newer for the Firestore and Storage emulators.

```bash
npm install
cp .env.emulator .env.local        # demo project config, emulators on, AI_PROVIDER=mock
npm run emulators                  # terminal 1: auth :9099, firestore :8080, storage :9199
npm run seed:demo                  # terminal 2, once per emulator start
npm run dev                        # http://localhost:3000
```

Demo accounts (password `Password123`):

| Email                | Role    | Lands on     |
| -------------------- | ------- | ------------ |
| admin@sainam.test    | ADMIN   | `/admin`     |
| mentor@sainam.test   | MENTOR  | `/mentor`    |
| student@sainam.test  | STUDENT | `/dashboard` |

In the emulator, verification and password-reset emails are not sent. Their links are printed in the emulator's terminal output.

## Connecting a real Firebase project

1. Create a Firebase project and enable these services:
   - **Authentication**: Email/Password and Google providers. Add your domain under *Authorized domains*.
   - **Firestore** (production mode).
   - **Storage**.
2. Copy `.env.example` to `.env.local` and fill it in:
   - `NEXT_PUBLIC_FIREBASE_*` comes from *Project settings → Your apps → Web app*. These values are public.
   - `FIREBASE_ADMIN_*` comes from a service-account key, or set `FIREBASE_ADMIN_USE_ADC=true` on Google Cloud runtimes. **These are server-only.** Never give them a `NEXT_PUBLIC_` prefix and never commit them.
   - `NEXT_PUBLIC_SITE_URL` is used for canonical URLs, the sitemap and certificate QR codes.
3. Deploy the rules and indexes, then seed the programs and default settings:
   ```bash
   npx firebase use <your-project-id>
   npm run deploy:rules
   npm run seed                     # programs + settings; `npm run seed -- --force` overwrites programs
   ```
4. Create the first super admin. Register through the site, verify your email, then run:
   ```bash
   npm run set-role -- you@example.com SUPER_ADMIN
   ```
   Log out and back in. After that, manage roles from **Admin → Students → Accounts**. (`SUPER_ADMIN_EMAILS` can bootstrap this instead, but the script is preferred.)
5. In **Admin → Settings**, fill in:
   - the payment instructions: UPI ID, bank-transfer details and the QR image URL;
   - contact details and the early-bird seat limit;
   - team members.

### Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | Canonical site URL |
| `NEXT_PUBLIC_FIREBASE_*` | public | Firebase web config |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | public | Connect the browser SDK to the local emulators |
| `FIREBASE_ADMIN_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` | **server** | Admin SDK service account |
| `FIREBASE_ADMIN_USE_ADC` | **server** | Use Application Default Credentials instead |
| `FIREBASE_ADMIN_STORAGE_BUCKET` | **server** | Bucket override (optional) |
| `SUPER_ADMIN_EMAILS` | **server** | Bootstrap super admins on first verified sign-in (optional) |
| `AI_PROVIDER` | **server** | `anthropic`, `gemini`, `mock` or `none` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | **server** | Anthropic provider (default model `claude-opus-5`) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | **server** | Gemini provider (default model `gemini-2.5-flash`) |
| `CRON_SECRET` | **server** | Bearer token for `/api/cron/session-reminders` |

`NEXT_PUBLIC_*` values are inlined at build time, so set them before running `next build`.

## Deployment

The app is a standard Next.js server app. It needs a Node runtime; it cannot be a static export.

- **Firebase App Hosting** or **Cloud Run**: set `FIREBASE_ADMIN_USE_ADC=true` and the `NEXT_PUBLIC_*` variables. The session cookie is named `__session` so Firebase Hosting forwards it.
- **Vercel** or any other Node host: provide the service-account variables.

Schedule the session-reminder job to run hourly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/session-reminders
```

It notifies students about sessions starting in the next 24 hours, once per session.

## How the platform works

```
Register → verify email → onboarding → apply → admin review → approve (assign batch, price locked)
  → student pays offline and reports the transaction reference → admin verifies → enrollment ACTIVE
  → lessons / quizzes / assignments / project / attendance → eligibility → certificate (QR + PDF)
```

### Payments (V1 is manual)

- **Pricing.** Early bird is ₹1,500 per month per course, for the **first 20 approved students**. After that the price is ₹1,800 per month per course. The seat counter is claimed atomically, in a transaction, when an application is approved, and released if that enrollment is cancelled. The limit and the prices are editable in settings.
- **Statuses.** Payment moves through `PAYMENT_PENDING → PAYMENT_IN_REVIEW → PAYMENT_CONFIRMED` or `PAYMENT_REJECTED`.
- **Verification.** Students report only a transaction reference and an optional screenshot. **No card or bank credentials are collected**; inputs that look like card numbers are rejected. Admins verify the payment and activate the enrollment.
- **Future gateway.** No payment gateway is integrated. `src/server/payments/provider.ts` is the seam where one could be added in a future version.

### Security model

- **Roles.** Roles live only in **Firebase custom claims**, set by the server. A role sent by the client is never trusted. A role change revokes the user's refresh tokens.
- **Sessions.** Login exchanges the ID token for an **httpOnly session cookie**. Every protected layout and action verifies that cookie with the Admin SDK, including a revocation check.
- **Writes.** All writes go through **Server Actions** that check the session and role, validate with Zod, and apply state-machine transitions (`src/lib/domain/workflows.ts`) inside transactions. The Firestore rules deny every client write except a user marking their own notification as read.
- **Quizzes.** Quiz answer keys are stored in an admin-only sub-collection and graded on the server. Lesson completion, scores and certificate eligibility are always computed on the server.
- **Uploads.** Files go straight to Storage under `storage.rules` (owner paths plus type and size limits). The server then re-checks each uploaded object's path, size and content type before saving a reference.
- **Secrets.** AI keys and Admin credentials are read only in `server-only` modules.

### AI features

- Set `AI_PROVIDER` to `anthropic` or `gemini` and provide the matching key.
- With `none`, or with AI switched off in settings, the assistant page shows as unavailable and progress insights fall back to rule-based tips.
- The assistant uses hint-first tutoring, is grounded in the student's program and progress, and is limited per day.
- Resume analysis is marked "coming soon".

## Testing

```bash
npm run typecheck        # route types + tsc
npm run lint
npm test                 # unit tests: workflows, pricing, progress, schemas
npm run test:rules       # Firestore + Storage rules against the emulators (starts its own)
npm run test:e2e         # full student/admin/mentor journey (needs `npm run emulators` + `npm run seed:demo`)
```

If the emulators are already running, run the rules tests with `npx vitest run --config vitest.rules.config.mts`.

The end-to-end suite covers:

- registration and email verification, then onboarding;
- applying, admin approval, offline payment reporting, and verification and activation;
- a lesson and quiz, an assignment submission and the AI assistant (mock provider);
- a mentor review and attendance;
- certificate issuance, the PDF download, public verification and server-side role enforcement.

## Project structure

```
src/
  app/(site)/        public website          app/(auth)/   login, register, reset, verify
  app/dashboard/     student area            app/mentor/   mentor area    app/admin/  admin area
  app/api/           session cookie, AI stream, certificate PDF, CSV export, cron
  components/        ui/ (design system), brand/, site/, forms/, dashboard/, staff/, admin/, charts/
  lib/domain/        enums, types, Zod schemas, state machines, pricing, progress, certificates
  lib/firebase/      browser SDK + auth flows
  server/            Admin SDK, session, queries, server actions, storage checks, AI providers
scripts/             seed, set-role
tests/               unit/, rules/, e2e/
firestore.rules  storage.rules  firestore.indexes.json
```

## Content notes

- **Program curricula** in `scripts/seed-data/programs.ts` are a starting draft. Review them in **Admin → Programs**.
- **Real data only.** The Team and Projects pages show only data that admins add or feature. The site has no invented testimonials, clients, statistics or placement claims.
- **Technology badges** use monogram stickers rather than bundled third-party logos. `logoSrc` is an extension point if you have licensed logo assets.
