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

## Current MVP status

- Core ledger package: equal split, balances, participant pauses — unit-tested.
- Supabase schema: MVP 1A tables, baseline read RLS, controlled write policies, enum values aligned with core types.
- Mobile app: local Expo demo over a mock data layer; the Record flow is interactive (validation, equal-split preview, local drafts).

## Known limitations

- Mock data only; the mobile app is not wired to Supabase.
- Record drafts live in component state and are discarded on reload.
- No auth UI, offline sync, multi-currency, receipts, or payment methods (later MVP phases).
- Payment-action status transitions and delete policies are deferred.

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
