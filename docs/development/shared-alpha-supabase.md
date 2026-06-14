# Shared Alpha Supabase Project — Setup Runbook

Status: runbook (issue #138), written 2026-06-12. **No shared project exists
yet.** This document is the checklist for creating it; nothing here is
fulfilled until the project is real and the verification steps below have
been executed and dated. No project ref, no URL, no key and no token may be
committed to this repo — placeholders only.

Boundary unchanged: the app stays ledger-only (no payment provider, no
payment execution, no banking/wallet, no IBAN/PayPal storage), also and
especially on the shared backend.

## 1. Region decision

- Target: **EU**, per `docs/product/free-sync-premium-backup-v0.1.md` (#94).
- Preferred region at project creation: **Central EU (Frankfurt) /
  `eu-central-1`**, if offered by Supabase at creation time; any other EU
  region is acceptable, non-EU is not.
- The region is fixed at project creation and not freely movable afterwards.
- **Open blocker until a real project exists.** Do not claim "EU fulfilled"
  anywhere before the project exists and its region has been read back from
  the dashboard. When done, record here: region, date checked, who checked.

## 2. Project creation checklist

Execute top to bottom; check off in the PR that documents the real project.

- [ ] Create the project in the Supabase dashboard, organization of the
      maintainer, region per section 1. Free tier is fine for the alpha.
- [ ] Database password: generated, stored in the maintainer's password
      manager only. It is a secret; it never appears in the repo, in the
      mobile app, in CI logs or in tester instructions.
- [ ] Auth providers: **e-mail + password only** (matches #135). Disable
      everything else (no OAuth, no magic links, no phone).
- [ ] Sign-up policy for the alpha: open password sign-up stays enabled,
      invites are distributed privately to testers (the app has no invite
      gate yet). Consequence, documented deliberately: anyone with the URL +
      publishable key could create an account; RLS still isolates all data
      per user. If this is unacceptable at invite time, disable sign-ups in
      the dashboard after the known testers registered, or gate via Auth
      "invite only" — decide then, note the decision here.
- [ ] E-mail confirmations: decide and note. Local stack autoconfirms; the
      shared project default sends confirmation mails. The #135 client
      handles both (profile bootstrap falls back to first sign-in), but the
      choice changes tester onboarding wording.
- [ ] The dev-session test user (`dev@local.test`) **must not exist** on the
      shared project. Nothing creates it there (the dev session is
      hard-blocked outside `EXPO_PUBLIC_APP_ENV=local`, #134); verify in
      Auth → Users after setup and after the first smoke run.
- [ ] Keys: the **anon/publishable key is public client config** — it may be
      sent to testers, but is still never committed (only `.env.example`
      placeholders live in the repo). The **service role key is never used
      anywhere**: not in the mobile app, not in the repo, not in tester
      hands; CI only if a deploy workflow ever needs it, as a GitHub
      encrypted secret.

## 3. Tester configuration

Each tester sets up `apps/mobile/.env` locally (gitignored), from
`.env.example` at the repo root:

```ini
EXPO_PUBLIC_APP_ENV=shared-alpha
EXPO_PUBLIC_DATA_SOURCE=supabase-local
EXPO_PUBLIC_SUPABASE_URL=<shared project URL, distributed privately>
EXPO_PUBLIC_SUPABASE_PUBLIC_KEY=<publishable key, distributed privately>
```

- Distribution channel: direct private message from the maintainer (the
  values are public-client config, not secrets — the concern is invite
  control, not confidentiality).
- `EXPO_PUBLIC_APP_ENV=shared-alpha` is mandatory: it hard-blocks the dev
  session (#134). The variable name list is documented in `.env.example`;
  real values never are.
- Note: the env var names keep the `SUPABASE_LOCAL`-era meaning "configured
  Supabase backend"; `EXPO_PUBLIC_DATA_SOURCE=supabase-local` is also the
  value for the shared backend. Renaming the mode is cosmetic and not worth
  a migration now; revisit if it confuses testers.

## 4. Migration deploy path

Decision: **manual maintainer deploy first, CI later (separate issue, only
once secrets and the project exist).** Reasons: smallest secret surface, no
workflow that can silently rot without a project to run against.

Local validation stays unchanged and mandatory before any deploy:

```powershell
supabase db reset      # full migration chain replays cleanly
supabase db lint       # schema lint
corepack pnpm db:rls-test   # behavioral RLS smoke, currently 43 assertions
```

Remote deploy (maintainer machine only):

```powershell
supabase link --project-ref <project-ref>   # interactive login; ref + token stay local
supabase db push                            # applies supabase/migrations/ in order
supabase migration list                     # verify local == remote afterwards
```

- `supabase link` writes the project ref into `supabase/.temp/` — that
  directory is gitignored by the CLI; never commit it. The access token
  lives in the CLI's credential store, never in the repo.
- `supabase db push` applies exactly the committed migration files; no
  dashboard-side schema edits, ever — the repo stays the single source of
  truth for schema.
- Seed policy: **no demo seed on the shared project** (`supabase/seed.sql`
  is local-only; `db push` does not apply it — deliberate). Testers create
  real data.
- If a GitHub Actions deploy workflow is added later: `workflow_dispatch`
  only (no push-triggered deploys), fail-closed when `SUPABASE_ACCESS_TOKEN`
  / project-ref secrets are missing, no real values in the workflow file.
  Not created now — there is no project and no secret to configure.

## 5. Shared RLS smoke plan

Local 43/43 (`pnpm db:rls-test`) is necessary but not sufficient: the shared
project must be verified once before invites, and after every deploy that
changes policies.

Two paths, same protection cases:

**Path A — psql against the shared database (maintainer-only).** The
existing `supabase/tests/rls_smoke_test.sql` runs in one transaction and
rolls back. It can run against the shared project via
`psql "<direct connection string>" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke_test.sql`
using the database password (secret, maintainer machine only). Caveats: it
creates temporary auth users inside the rolled-back transaction, needs the
session-pooler/direct connection (not the transaction pooler), and the
connection string must never land in shell history files that sync.

**Path B — client-side smoke via supabase-js (tester-credential level).** A
script in the style of `apps/mobile/scripts/auth-flow-smoke.ts`: three
disposable accounts (Alice/owner, Bob/participant, Mallory/outsider) sign up,
then assert allowed AND forbidden behavior through PostgREST. Runs with only
URL + publishable key (no DB password), so it can double as the post-deploy
check. Required cases (mirroring the local suite):

| Case | Allowed | Forbidden |
| --- | --- | --- |
| Profiles | own profile, fellow group members | foreign profiles of non-group users invisible |
| Owner-private rows (counterparties, unshared claims, reminders) | owner reads/writes own | second user sees zero rows |
| Shared claims | linked counterparty reads, status-only updates | outsider sees nothing; counterparty cannot edit core columns |
| Inbox | own items, resolve own | foreign inbox invisible; non-status columns pinned |
| Expenses | member insert; creator soft-delete (`deleted_at`) | non-creator cannot soft-delete; ledger columns pinned |
| Claim transitions | allowed transitions per core table | forbidden transitions rejected by trigger (#106) |

Path B is implemented in `apps/mobile/scripts/shared-rls-smoke.ts` (issue #139).

### Running Path B

**Prerequisite:** email confirmation must be disabled (autoconfirm on) in the
Supabase project's Auth settings so sign-ups return a session immediately.
Local stack has this on by default.

Local stack:

```powershell
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_PUBLIC_KEY = "<anon key from supabase status>"
corepack pnpm db:shared-rls-smoke
```

Shared-alpha project (no service role key required — publishable key only):

```powershell
$env:SUPABASE_URL = "<shared project URL>"
$env:SUPABASE_PUBLIC_KEY = "<publishable/anon key>"
corepack pnpm db:shared-rls-smoke
```

Exit code `0` = all checks passed. Exit code `1` = at least one failure or
missing env vars.

### Cleanup

The script creates three smoke accounts (`pd-rls-smoke-alice-*`,
`pd-rls-smoke-bob-*`, `pd-rls-smoke-mallory-*`) and associated rows on every
run. There is no service role key and no server-side rollback.

- **Local stack:** `supabase db reset` clears all data cleanly.
- **Shared project:** the maintainer must delete smoke accounts manually via
  dashboard → Auth → Users (filter by `pd-rls-smoke-`). Data rows cascade-delete
  when the auth user is removed. No automated cleanup without the service role
  key; run the smoke infrequently on the shared project and clean up promptly.

### Not client-testable via Path B

These cases are covered by the SQL suite (Path A) but cannot be fully exercised
through the publishable-key client:

- `payment_actions` status transitions (no raw insert path in this script)
- `claim_payments` immutability (requires more setup; omitted for scope)
- Exact trigger error message content (checked as error-present only)

- [ ] Smoke (A or B) executed against the shared project, dated here, before
      the first invite.
- [ ] Re-run after every policy-changing deploy.

## 6. Go/no-go before the first invite

All of these, in order:

1. Project exists, region EU confirmed (section 1 recorded).
2. Checklist section 2 fully checked, including dev-user absence.
3. Migrations deployed, `supabase migration list` clean (section 4).
4. RLS smoke green against the shared project (section 5).
5. Readiness docs updated: `docs/product/alpha-readiness.md`,
   `docs/architecture/shared-alpha-backend-readiness.md` (EU row dated).
6. Tester config distributed privately (section 3).
