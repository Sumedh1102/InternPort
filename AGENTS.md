<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes (Sainam Technology platform)

- Setup, env vars and the emulator workflow are in `README.md`. Local dev: `cp .env.emulator .env.local`, `npm run emulators`, `npm run seed:demo`, `npm run dev`.
- Roles come only from Firebase custom claims (`src/server/auth/session.ts`). Never read a role from the client or from `users/{uid}.role` for authorization.
- Every mutation is a Server Action in `src/server/actions/*`: `run()` wraps it, `actor(roles)` checks the session and role, `parse(schema, input)` validates, and status changes go through `assertTransition` from `src/lib/domain/workflows.ts`. Clients never write to Firestore directly (see `firestore.rules`).
- Server reads use the Admin SDK via `src/server/queries/*` and return serialized data (ISO date strings) to components.
- Payments are manual in V1. Do not add a payment gateway, checkout or webhooks unless explicitly requested; `src/server/payments/provider.ts` is the seam for that.
- Never invent content: no fake testimonials, clients, statistics, placement claims or company history.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:rules`, `npm run test:e2e` (the E2E suite needs the emulators and the demo seed).
