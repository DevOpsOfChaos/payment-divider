# Local Supabase Schema Validation

Status: MVP 1A development workflow — last validated 2026-06-11 with Supabase CLI 2.105.0 via `npx supabase`: `db start` applied all four migrations plus seed cleanly, `db lint` reported no schema errors, and `db reset` replayed the full chain. `supabase/config.toml` is the stock generated template (all sensitive values via `env()` substitution, no secrets).

This document describes how to validate the SQL migrations in `supabase/migrations/` on a local machine. It never connects to a live Supabase project and never requires secrets.

## Prerequisites

- Supabase CLI (no project link, no login required for local validation)
- Docker Desktop (required for `supabase start` and `supabase db reset`, which run a local PostgreSQL container)

### Installing the Supabase CLI

Windows (Scoop):

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

macOS/Linux (Homebrew):

```bash
brew install supabase/tap/supabase
```

Alternatively run it ad hoc without installing (this is the validated path on this repo):

```powershell
npx supabase --version
```

Docker Desktop must be running first; start it and wait until `docker info` succeeds.

Verify the installation:

```powershell
supabase --version
```

## Validation workflow

All commands run from the repository root and operate only on the local files and the local Docker containers.

1. `supabase db lint` — static analysis of the SQL in `supabase/migrations/` using a temporary local shadow database. Requires Docker. Fails on invalid SQL and reports plpgsql issues.
2. `supabase start` — starts the full local Supabase stack (PostgreSQL, auth, API) in Docker. Only needed for interactive inspection; not required for lint.
3. `supabase db reset` — drops and recreates the local database, replays every migration in order, then applies `supabase/seed.sql`. This is the strongest check that the migration chain applies cleanly from scratch. Requires Docker and a running local stack (`supabase start`).
4. `supabase stop` — shuts the local stack down again.

## Package scripts

Convenience wrappers (no new dependencies):

```powershell
corepack pnpm db:lint    # supabase db lint
corepack pnpm db:reset   # supabase db reset
corepack pnpm db:check   # db lint, then db reset
```

Independent of the CLI, a static boundary check scans `supabase/**/*.sql` for secret-like terms and out-of-scope payment-provider/bank/wallet schema terms:

```powershell
corepack pnpm db:boundary-check
```

It runs on plain Node, needs no Docker and no Supabase CLI, and fails when forbidden terms appear outside clearly marked exclusion comments.

## Mobile data modes

The mobile app defaults to `local-demo` (pure in-memory mocks). Setting `EXPO_PUBLIC_DATA_SOURCE=supabase-local` in `apps/mobile/.env` (template: `.env.example` at the repo root) selects the local-Supabase mode, configured via `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLIC_KEY` — both printed by `supabase start`. Missing configuration falls back to local-demo with a dev hint instead of crashing. Only `.env.example` may be committed; the boundary check enforces this and rejects secret-like values in it.

In `supabase-local` mode the ledger screens (groups, expenses, settlement) read from the local stack with the 1A write paths (group, expense). Claims additionally go through `apps/mobile/src/data/supabase-claims.ts` (#105): counterparties, claims, claim payments and claim events are read and written behind the `ClaimsRepository` interface, status changes run through `canTransitionClaimStatus` client-side with the #106 trigger as server authority, and the person balance overview stays a client-side derivation via core (`buildPersonBalanceOverview`) — there is no person-balance table. Claim reminders (#116) are read and written through the same adapter: strictly personal rows (owner-only RLS), set/snooze/disable via the core helpers (`getDueReminders`, `snoozeReminder`, `disableReminder`), never sent anywhere, no push.

## Generated database types

`apps/mobile/src/services/database.types.ts` is generated from the local
schema and committed (#118). The Supabase client is typed against it
(`createClient<Database>`), so table names, row shapes and insert/update
payloads in the adapters are compile-time checked; the hand-written part is
reduced to the column→core-field mapping plus narrowing the CHECK-constrained
text columns to the core unions.

Regenerate after any migration change (local stack must be running):

```powershell
corepack pnpm db:gen-types
```

The script pins CLI 2.105.0: `supabase gen types` in 2.106.0 demands a
platform access token even for `--local` (regression); the pinned version
works tokenless against the local stack, which this repo requires (no
`supabase login`, no access tokens).

## RLS behavior smoke tests

`supabase/tests/rls_smoke_test.sql` exercises RLS behavior (not just syntax) against the running local stack: group visibility per member, expense inserts allowed for members and rejected for non-members, the two allowed payment-action status transitions, column immutability via triggers, private-claims visibility (creator-only free-text claims, linked-counterparty access with status-only edits, outsider isolation, immutable claim-payment cores), server-side claim status transitions (#106), and the claim write paths used by the supabase-local adapter (payments only as oneself, events only as the acting user, reminders strictly personal). The whole test runs in one transaction and rolls back, leaving the database clean.

```powershell
npx supabase db start
corepack pnpm db:rls-test   # 33 assertions, runs psql inside the local db container
```

Last run 2026-06-12: 33/33 PASS (Postgres image 17.6.1.134; explicit app-role grants required by newer images are in migration 20260611143000). Includes counterparty visibility: unshared claims stay invisible to a linked counterparty, and counterparty records are owner-only.

## Continuous integration

`.github/workflows/checks.yml` runs the boundary check, typecheck, tests, lint, and whitespace hygiene on every pull request and push to `main`. CI uses no secrets and never connects to a Supabase project; Docker-based `db lint`/`db reset` stay a local workflow.

These shell out to the `supabase` binary and fail with a clear error if it is not installed.

## When Docker is needed

| Command            | Docker required |
| ------------------ | --------------- |
| `supabase --version` | no            |
| `supabase db lint`   | yes           |
| `supabase start`     | yes           |
| `supabase db reset`  | yes           |

## If the CLI is missing

- Do not skip review: read the migration SQL manually and check ordering by timestamp prefix.
- State explicitly in the PR that `supabase db lint` / `db reset` were not run and why.
- Do not substitute a live project connection for local validation.

## Boundaries

- No `supabase link`, no access tokens, no project refs, no `.env` files.
- Local validation only; the live Supabase project is never touched from this workflow.
- This workflow validates schema and migration ordering. It does not test RLS behavior end to end; that needs dedicated policy tests in a later issue.
