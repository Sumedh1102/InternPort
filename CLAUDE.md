# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

The standard checks are listed in AGENTS.md. Narrower and less common runs:

```bash
npx vitest run tests/unit/workflows.test.ts       # one unit test file
npx vitest run -t "early-bird pricing"            # unit tests whose name matches
npx vitest run --config vitest.rules.config.mts   # rules tests against emulators that are already running
npm run build                                     # production build; works without Firebase credentials
npm run set-role -- someone@example.com MENTOR    # set a role claim and sign that user out everywhere
npm run seed -- --force                           # re-apply scripts/seed-data/programs.ts over admin edits
```

- **Type checking:** use `npm run typecheck`, not bare `tsc`. The global `PageProps` / `RouteContext` types only exist after `next typegen`.
- **Emulators and scripts:** the emulators need Java 11+. `seed`, `seed:demo` and `set-role` act on whatever project `.env.local` points to, so they only reach the emulators after `cp .env.emulator .env.local`. `--demo` refuses to run against a real project.
- **E2E:** `tests/e2e/internship-journey.spec.ts` is one serial journey whose tests share state, so run the whole file. Each run registers a new student, so it can be re-run on the same seeded emulators.
- **E2E dev server:** Playwright reuses any server already on `E2E_PORT` (default 3000). If there is none, it launches `node --env-file=.env.emulator … next dev`, which fails on Node 20–22 with `--env-file= is not allowed in NODE_OPTIONS` (`next dev` copies its exec flags into the child's `NODE_OPTIONS`). Start `npm run dev` with the emulator `.env.local` first.
- **Email verification:** the Auth emulator sends no emails. To verify an account, GET `http://127.0.0.1:9099/emulator/v1/projects/demo-sainam/oobCodes` and open the matching `oobLink`, as the E2E suite does.

## Architecture

The app is one Next.js 16 App Router project in `src/`:

- **Areas:** the public site lives in `app/(site)` and sign-in pages in `app/(auth)`. The role-gated areas are `app/dashboard` (STUDENT), `app/mentor` (MENTOR) and `app/admin` (ADMIN, SUPER_ADMIN).
- **Browser Firebase use:** sign-in, direct Storage uploads and a live notifications listener. The listener's mark-as-read `updateDoc` is the only client write `firestore.rules` allows.

### Sessions and roles

1. The browser signs in with the client SDK (`src/lib/firebase/auth-client.ts`) and POSTs the ID token to `app/api/auth/session/route.ts`.
2. That route gives new accounts the `STUDENT` claim (or `SUPER_ADMIN` via `SUPER_ADMIN_EMAILS`) and creates or syncs `users/{uid}`. If it just changed the claims, it answers `{ refresh: true }` and the client retries with a fresh token. Otherwise it sets the httpOnly `__session` cookie and a `sainam_role` cookie that is only a UI hint.
3. `getSession()` (`src/server/auth/session.ts`) verifies the cookie, including revocation, once per request.
4. Each area's `layout.tsx` calls `requireRole()`, which redirects other roles to their `ROLE_HOME`. `src/proxy.ts` is Next 16's replacement for `middleware.ts` and only checks that the cookie exists.

`users/{uid}.role` mirrors the claim so that lists can query it. `setUserRole` (`src/server/actions/admin.ts`) and `scripts/set-role.ts` update both and revoke refresh tokens.

### Writes

These points add to the action pattern in AGENTS.md.

- **Results:** actions resolve to `ActionResult<T>` (`src/lib/domain/types.ts`) instead of throwing. Server components often pre-bind IDs with `.bind(null, id)`.
- **Errors:** `run()` shows `ActionError` and `TransitionError` messages to the user and turns a `ZodError` into `fieldErrors`. Any other error is logged, and the user sees a generic message.
- **Forms:** forms validate with the same Zod schema through `zodResolver`, and push `fieldErrors` back into React Hook Form with `applyServerErrors` (`src/components/forms/form-utils.ts`). One-click actions use `ActionButton` (`src/components/ui/action-button.tsx`).
- **Transactions:** multi-document state changes run in one `adminDb().runTransaction()`. Approving an application, for example, creates the enrollment, locks the price and claims an early-bird seat together. Notifications (`notify` / `notifyProgramStudents` in `src/server/notify.ts`) go out after the commit.
- **Revalidation:** call `revalidatePath` for every affected view. Changes to cached public data also need `revalidateTag("programs" | "settings", { expire: 0 })`; Next 16's `revalidateTag` requires the second argument.
- **Mentor access:** `assertBatchAccess` / `assertEnrollmentAccess` (`src/server/access.ts`) limit mentors to their own batches.

### Reads

- **DB helpers:** `src/server/db/index.ts` names the collections in `COL`. `fromSnap`, `queryDocs` and `getDocById` return plain objects with Timestamps converted to ISO strings, and `whereIn` splits `in` queries into chunks of 30.
- **Indexes:** queries usually filter on one field and sort in memory (`byDateDesc` / `byDateAsc`), so `firestore.indexes.json` holds only two `notifications` indexes. A query that combines `where` with `orderBy` on another field needs a new composite index there.
- **Settings:** platform settings are one `settings/platform` document read through `mergeSettings()`. It fills gaps from `DEFAULT_SETTINGS` (`src/server/queries/settings.ts`) and merges each nested group by name, so new settings and new groups go there.
- **Caching:** public programs and settings are cached with `unstable_cache` under the `programs` / `settings` tags. Public pages guard Firestore reads with `isAdminConfigured()`, so they render without credentials. Per-request loaders such as `getStudentContext`, `getMentorContext` and `getAdminOptions` are memoized with React `cache`.
- **Derived data:** progress, certificate eligibility and insights are pure functions in `src/lib/domain/{progress,certificates,insights}.ts`. `src/server/metrics.ts` loads their inputs.

### Domain layer and tests

`src/lib/domain` holds framework-free code shared by client and server:

- `enums.ts` defines every status vocabulary, with `LABELS` / `label()` for display.
- `workflows.ts` has separate state machines for what students may do and what staff may do (e.g. `STUDENT_PAYMENT_FLOW` vs `PAYMENT_FLOW`, `STUDENT_SUBMISSION_FLOW` vs `REVIEWER_SUBMISSION_FLOW`).

Everything under `src/server` imports `server-only`, which throws outside Next.js. That has three consequences:

- Vitest can't import anything under `src/server`, so unit tests cover `src/lib/domain`.
- The E2E suite is what exercises server behaviour.
- Scripts start their own Admin SDK in `scripts/_admin.ts`.

### Uploads and document IDs

- **Uploads:** the browser uploads straight to Storage. For each upload kind, three things must agree:
  - the `pathPrefix` given to `FileUploader` (`src/components/ui/file-uploader.tsx`);
  - the path, type and size rule in `storage.rules`;
  - the action's `verifyUploadedFile(path, expectedPrefix, UPLOAD_POLICIES.<kind>)` call (`src/server/storage.ts`), which re-checks the Storage metadata and builds the download URL on the server.
- **Deterministic IDs:** some documents have predictable IDs, so writing them is an upsert. Submissions use `${assignmentId}_${uid}`, attendance uses `${sessionId}_${uid}`, and evaluations use `sub_<submissionId>` / `proj_<projectId>`.
- **Assignment IDs:** `storage.rules` matches submission IDs against `^[A-Za-z0-9]+_<uid>$`, so assignment IDs must be alphanumeric. Firestore auto-IDs are.

### Route handlers and AI

- **Route handlers:** `src/app/api/*` holds only what Server Actions can't do: the session cookie exchange, streamed AI replies, certificate PDFs, the applications CSV export and the session-reminder cron, which requires a `CRON_SECRET` bearer token. POST handlers check `isSameOrigin()` (`src/server/security.ts`).
- **AI:** `getAIProvider()` (`src/server/ai`) picks anthropic, gemini or mock from `AI_PROVIDER`. It returns `null`, turning AI off, for `none` or a missing key. `/api/ai/assistant` enforces a per-user daily quota and builds its prompt from the student's enrollment (`src/server/ai/context.ts`).

## Conventions

- **Route props:** pages and route handlers use the global `PageProps<"/route">` / `RouteContext<"/route">` types and `await` their `params` / `searchParams`.
- **Current time:** the React Compiler lint rule `react-hooks/purity` rejects `Date.now()` during render. In Server Components use `requestTime()` from `src/lib/time.ts`.
- **Dates:** a date-only `yyyy-mm-dd` value means midnight IST (`toTimestamp` in `src/server/db`). `formatDate` / `formatDateTime` in `src/lib/utils.ts` display dates in `Asia/Kolkata`.
- **Styling:** use the Tailwind v4 tokens in the `@theme` block of `src/app/globals.css`: `ink`, `paper`, `cream`, `lime`, `pink`, `shadow-brutal*`, `rounded-card` / `rounded-chunk` and `font-display`. The primitives in `src/components/ui` wrap the unified `radix-ui` package.
- **Navigation:** dashboard sidebars come from `src/lib/navigation.ts`, with icons referenced by name. Register new area pages there.
