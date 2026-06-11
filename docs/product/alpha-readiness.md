# Alpha Readiness Audit

Status: audited 2026-06-11 after the alpha block (PRs #75–#79). Supersedes the
MVP 1A view in `mvp1a-readiness.md` for data-mode questions.

## Data modes

### local-demo (default)

- Pure in-memory mock data, zero setup, no network.
- Full demo flow: Overview/Groups/Group/Activity balances from the core ledger
  functions, interactive Record with drafts that feed session balances and
  timelines, interactive ledger-only settlement transitions in the Inbox.
- Session-only: reload discards drafts and settlement states.

### supabase-local (optional)

- Opt-in via `apps/mobile/.env` (`.env.example` template); local stack only.
- Reads: profiles, overview, groups, group detail, activity detail, inbox,
  settlement items — RLS-scoped, with clean mock fallback + dev hint while
  unconfigured/loading/sessionless.
- Dev session: fixed local test user via Profile tab (sign-up on first use,
  self-profile upsert). Explicitly not production auth.
- Writes: create group (+ default activity + owner membership), create expense
  (+ equal shares + best-effort timeline event) through the conservative RLS
  policies. Settlement transitions are not yet wired to the UI in this mode
  (read-only settlement cards).
- Verified: migrations replay cleanly (`db reset`), `db lint` clean, RLS
  behavior smoke tests 9/9 PASS (`pnpm db:rls-test`).

## Setup

```powershell
corepack pnpm install
# local-demo: nothing else needed
corepack pnpm --filter @payment-divider/mobile start

# supabase-local:
npx supabase start              # needs Docker
# copy .env.example to apps/mobile/.env, paste URL + publishable key
corepack pnpm db:rls-test       # optional: behavioral RLS check
```

## Known risks

- supabase-local read adapter shows the first group/context for detail screens;
  no group navigation by id yet.
- Settlement transitions in supabase-local mode are not yet executable from the
  UI (policies + trigger exist and are smoke-tested).
- Pause/availability evaluation is not applied in the supabase-local Record
  setup (all members preselected).
- Dev session uses fixed local credentials — meaningless outside the local
  stack, but must never be reused in any deployed environment.
- No generated DB types; the row mapping in the adapter is hand-written.

## Next MVP 1B block

- Group/activity navigation by id across both data modes.
- Settlement transition writes in supabase-local mode (reuse existing policies).
- Membership flows (invite, join, leave) with matching write policies.
- Visibility profiles and the PaymentMethod model (masked, revocable) per the
  existing 1B scope.
- Generated database types and adapter tests.

## Before any public launch

- Real auth (no fixed dev users), account deletion/export, GDPR documentation.
- Secrets management and environment separation; never ship dev-session code paths.
- RLS test suite in CI against an ephemeral stack, not just local runs.
- Masking/encryption for personal identifiers; notification content review.
- Wording audit: nothing may imply payment execution — the app stays a ledger.
