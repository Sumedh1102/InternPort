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
- Firebase: Auth, Firestore, custom claims and security rules. The Admin SDK is used on the server only.
- Supabase Storage for uploaded files (private buckets, server-issued signed URLs).
- Anthropic or Gemini for AI features, both optional.
- Vitest (unit tests and rules tests) and Playwright (end-to-end tests).

## Quick start (local, no cloud account needed)

The Firebase Emulator Suite runs Auth and Firestore locally with demo data. File uploads need Supabase Storage (see [File storage](#file-storage-supabase)); without it the rest of the app works and uploads show an error.

Requirements: Node.js 24, the version production runs (22.12 or newer also works, though npm warns about the `engines` field), and Java 11 or newer for the Firestore emulator.

```bash
npm install
cp .env.emulator .env.local        # demo project config, emulators on, AI_PROVIDER=mock
npm run emulators                  # terminal 1: auth :9099, firestore :8080
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
4. Set up file storage in Supabase (see [File storage](#file-storage-supabase)).
5. Create the first super admin. Register through the site, verify your email, then run:
   ```bash
   npm run set-role -- you@example.com SUPER_ADMIN
   ```
   Log out and back in. After that, manage roles from **Admin → Students → Accounts**. (`SUPER_ADMIN_EMAILS` can bootstrap this instead, but the script is preferred.)
6. In **Admin → Settings**, fill in:
   - the payment instructions: UPI ID, bank-transfer details and a payment QR code for each pricing tier (the regular-tier ₹1,799 QR ships as the default in `public/payment-qr/`);
   - contact details and the early-bird seat limit;
   - team members.

### Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | Canonical site URL (on Vercel, defaults to the production domain) |
| `NEXT_PUBLIC_FIREBASE_*` | public | Firebase web config |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | public | Connect the browser SDK to the local emulators |
| `FIREBASE_ADMIN_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` | **server** | Admin SDK service account |
| `FIREBASE_ADMIN_USE_ADC` | **server** | Use Application Default Credentials instead |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL (file storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server** | Supabase service-role key, used only by server code and scripts |
| `FIREBASE_ADMIN_STORAGE_BUCKET` | **server** | Old Firebase Storage bucket, only for `npm run storage:migrate` (defaults to `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`) |
| `SUPER_ADMIN_EMAILS` | **server** | Bootstrap super admins on first verified sign-in (optional) |
| `AI_PROVIDER` | **server** | `anthropic`, `gemini`, `mock` or `none` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | **server** | Anthropic provider (default model `claude-opus-5`) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | **server** | Gemini provider (default model `gemini-2.5-flash`) |
| `CRON_SECRET` | **server** | Bearer token for `/api/cron/session-reminders` (Vercel Cron sends it automatically) |

`NEXT_PUBLIC_*` values are inlined at build time, so set them before running `next build`.

## File storage (Supabase)

Uploaded files live in Supabase Storage. Authentication stays on Firebase and data stays in Firestore.

Supabase's storage policies can't identify Firebase users, so every bucket is **private** and has no policies. The server enforces access instead:

- **Upload.** The browser asks the `createUpload` server action for a one-time signed upload URL. The action checks the Firebase session, the folder's owner or role, the file type and the size, and picks the file name. It then uploads straight to Supabase. A signed upload URL can't overwrite an existing file.
- **Save.** Before a path is saved to Firestore, the server re-checks the stored object's real size and type.
- **Read.** Firestore stores the storage path and an app URL, `/api/files/<path>`. That route checks the session against the path's read rule on every request, then redirects to a signed URL that lasts 10 minutes. Links therefore never expire, and access is always re-checked.

| Bucket | Folders | Limit | Who uploads | Who reads |
| --- | --- | --- | --- | --- |
| `profile-images` | `{uid}/` | 2 MB, PNG/JPEG/WebP | the user | the user and staff |
| `resumes` | `{uid}/` | 5 MB, PDF/DOC/DOCX | the user | the user and staff |
| `internship-documents` | `users/{uid}/projects/{projectId}/` | 5 MB images | the student | the student and staff; anyone once the project is featured |
| | `submissions/{assignmentId}_{uid}/` | 10 MB | the student | the student and staff |
| | `assignments/{assignmentId}/` | 20 MB | mentors and admins | any signed-in user |
| | `programs/{programId}/resources/` | 20 MB | admins | any signed-in user |
| | `settings/payment-qr/` | 2 MB images | admins | any signed-in user |

The rules are in `src/lib/domain/storage.ts`. The bucket limits (20 MB for `internship-documents`) are a backstop. Each folder's own limit is enforced by the server.

Setup:

1. Create a Supabase project. Copy its URL into `NEXT_PUBLIC_SUPABASE_URL` and its **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`. The key is server-only: never prefix it with `NEXT_PUBLIC_`, and never commit it.
2. Create the buckets with their limits:
   ```bash
   npm run storage:setup            # creates or updates the three private buckets; safe to re-run
   ```
3. Don't add storage policies. With none, the browser's public key can't read, list, upload or delete anything, so only the server can.

### Moving files from Firebase Storage

Records saved before the move still point at Firebase Storage URLs, and those keep working. To copy the files into Supabase and repoint the records:

```bash
npm run storage:migrate            # dry run: lists what would be copied
npm run storage:migrate -- --apply # copy, verify sizes, then update Firestore
```

The script never deletes or changes Firebase files. It updates a record only after every file it references is copied and verified, and only if the record hasn't changed meanwhile. It is safe to re-run. Once you are satisfied, you can lock down or delete the Firebase Storage bucket yourself.

## Deployment

The app is a standard Next.js server app. It needs a Node runtime; it cannot be a static export. Production runs on **Vercel**. Firebase (Auth, Firestore) and Supabase (Storage) stay where they are.

### Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repository. Vercel detects Next.js, so no build settings need changing.
2. Under **Settings → Build and Deployment**, set **Node.js Version** to **24.x**. `package.json` already pins `24.x`, and keeping the setting the same avoids a build that stops with *Found invalid or discontinued Node.js Version*. Firebase Admin needs Node 22.12 or newer; on older versions, every page that checks the sign-in fails with `ERR_REQUIRE_ESM`.
3. Under **Settings → Environment Variables**, add these for **Production**:

   | Variable | Where it comes from |
   | --- | --- |
   | `NEXT_PUBLIC_FIREBASE_*` (6 values) | Firebase console → Project settings → Your apps → Web app |
   | `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase console → Project settings → Service accounts → *Generate new private key*. Paste the private key as it is. |
   | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings (see [File storage](#file-storage-supabase)) |
   | `CRON_SECRET` | Any long random string. Vercel sends it to the reminder job automatically. |
   | `NEXT_PUBLIC_SITE_URL` | Your public URL, for example your custom domain. If unset, the Vercel production domain is used. |
   | `AI_PROVIDER` and its key, `SUPER_ADMIN_EMAILS` | Optional; see [Environment variables](#environment-variables) |

   Mark the server-only values as *Sensitive*. `NEXT_PUBLIC_*` values are built into the app, so redeploy after changing one. Give **Preview** deployments these values only if previews may use your live data.
4. Deploy. From then on, every push to `main` deploys to production.
5. In the Firebase console, open **Authentication → Settings → Authorized domains** and add your Vercel domain and any custom domain. Google sign-in and the links in verification and password-reset emails only work on listed domains.
6. Under **Settings → Functions**, set the function region nearest your Firestore database. The default is Washington, D.C. (`iad1`). For Firestore in `asia-south1`, use Mumbai (`bom1`). The dashboards read Firestore on every request, so this has a big effect on their speed.

**Session reminders.** `vercel.json` runs `/api/cron/session-reminders` every morning around 08:00 IST. Each run reminds students about sessions starting in the next 25 hours, once per session. Vercel's Hobby plan allows one run a day. On Pro, you can change the schedule to hourly (`0 * * * *`), so sessions added during the day are also reminded. Hobby is for non-commercial use only.

### Other hosts

On **Firebase App Hosting** or **Cloud Run**, set `FIREBASE_ADMIN_USE_ADC=true` instead of the service-account variables. The session cookie is named `__session` so that Firebase Hosting forwards it. Call the reminder job at least daily, for example from Cloud Scheduler:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/session-reminders
```

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
- **Uploads.** The server checks the session, the owner or role, the type and the size before it issues a one-time signed upload URL for Supabase Storage. It re-checks each uploaded object's size and type before saving a reference. Every bucket is private, and files are read through `/api/files`, which re-checks access (see [File storage](#file-storage-supabase)).
- **Secrets.** AI keys, Admin credentials and the Supabase service-role key are read only in `server-only` modules and scripts.

### AI features

- Set `AI_PROVIDER` to `anthropic` or `gemini` and provide the matching key.
- With `none`, or with AI switched off in settings, the assistant page shows as unavailable and progress insights fall back to rule-based tips.
- The assistant uses hint-first tutoring, is grounded in the student's program and progress, and is limited per day.
- Resume analysis is marked "coming soon".

## Testing

```bash
npm run typecheck        # route types + tsc
npm run lint
npm test                 # unit tests: workflows, pricing, progress, schemas, storage access rules
npm run test:rules       # Firestore rules against the emulators (starts its own)
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
  app/api/           session cookie, AI stream, certificate PDF, CSV export, cron, file access
  components/        ui/ (design system), brand/, site/, forms/, dashboard/, staff/, admin/, charts/
  lib/domain/        enums, types, Zod schemas, state machines, pricing, progress, certificates, storage rules
  lib/firebase/      browser SDK + auth flows
  server/            Admin SDK, Supabase client, session, queries, server actions, storage checks, AI providers
scripts/             seed, set-role, storage:setup, storage:migrate
tests/               unit/, rules/, e2e/
firestore.rules  firestore.indexes.json
```

## Content notes

- **Program curricula** in `scripts/seed-data/programs.ts` are a starting draft. Review them in **Admin → Programs**.
- **Real data only.** The Team and Projects pages show only data that admins add or feature. The site has no invented testimonials, clients, statistics or placement claims.
- **Technology badges** use monogram stickers rather than bundled third-party logos. `logoSrc` is an extension point if you have licensed logo assets.
- **Sainam logo.** `src/lib/brand.ts` holds the logo as SVG paths plus its colours (teal `#009FA0`, slate `#263940`). `<Logo />`, the Apple touch icon, the Open Graph image and the certificate PDF all draw from it. `src/app/icon.svg` (favicon) and `public/brand/*.svg` are standalone copies, so update them too if the paths change. The paths were vectorised from the supplied raster logo; if the original vector artwork turns up, replace them with it.
