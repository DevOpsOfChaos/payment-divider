# Payment Divider

European-first group expense sharing app for recurring social groups, trips, shared flats, couples, families, festivals, and events.

## Product stance

Payment Divider is a ledger app, not a payment provider.

It helps users:

- record shared expenses,
- calculate balances,
- structure long-lived groups into activities,
- handle temporary participant pauses,
- track external payments,
- control which payment details are visible per group or activity.

It does not move money, hold funds, initiate bank payments, provide a wallet, or access bank accounts in the MVP.

## Current phase

MVP 1A demo: core ledger package, SQL schema with RLS, and a local-only Expo mock app are in place. No live backend, auth UI, sync, or payment execution.

## Getting started

```powershell
corepack pnpm install
corepack pnpm --filter @payment-divider/mobile start   # Expo dev server (QR / web)
```

Checks:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
corepack pnpm db:boundary-check   # static SQL boundary scan, no Docker needed
corepack pnpm db:lint             # needs Supabase CLI + Docker, see docs/development/supabase-local.md
```

Demo walkthrough: `docs/development/demo-script.md`.

## Data modes

- `local-demo` (default): in-memory mock data, no network, no setup.
- `supabase-local` (optional): points the app at a locally running Supabase stack. Copy `.env.example` to `apps/mobile/.env`, start the stack (`npx supabase start`), and fill in the local URL and publishable client key it prints. Placeholders only in git; real env files are ignored. No cloud project, no secrets, no auth UI yet.

## Current MVP status

- Core ledger package: equal split, balances, participant pauses — unit-tested.
- Supabase schema: MVP 1A tables, baseline read RLS, controlled write policies, ledger-only settlement status transitions, enum values aligned with core types; migrations validated locally (`supabase db reset` + `db lint`).
- Mobile app: local Expo demo over a repository data layer; Record is interactive and local drafts plus settlement actions feed the session balances and timelines.
- CI runs boundary, typecheck, test, and lint checks on every PR.

Full audits: `docs/product/mvp1a-readiness.md` (ledger demo) and `docs/product/alpha-readiness.md` (data modes, supabase-local, RLS tests).

## Known limitations

- Mock data only; the mobile app is not wired to Supabase.
- Drafts and settlement states are session-only and reset on reload.
- No auth UI, offline sync, multi-currency, receipts, or payment methods (later MVP phases).
- Membership-change, availability-edit, inbox-resolution, and delete policies are deferred.

## Repository structure

```text
apps/mobile/        Expo mock app
packages/core/      shared ledger logic + tests
supabase/           SQL migrations (schema + RLS)
scripts/            repo checks
docs/
  product/
  screens/
  architecture/
  development/
  decisions/
```

## MVP focus

MVP 1A proves the core product model:

- users and friends,
- groups,
- activities within groups,
- member participation pauses,
- fast expense entry,
- equal split,
- balances,
- external payment marking,
- timeline,
- personal overview,
- simple inbox.
