# MVP 1A Readiness Audit

Status: audited 2026-06-11 at main commit `91fe278` (after PRs #54–#66).

## Verdict

MVP 1A is demo-ready as a local prototype. It proves the core product model — groups, activities, participant pauses, fast expense entry, equal split, balances, ledger-only external settlement — without any backend connection. It is not user-ready: no auth, no persistence, no real data.

## What works

- Core ledger package (`@payment-divider/core`): equal split with deterministic remainder distribution, group/activity/personal balances, participant-pause selection; 19 unit tests, integer minor units throughout.
- Supabase schema: 5 migrations (tables, baseline read RLS, enum reconciliation, controlled write policies, ledger-only settlement transitions), validated locally with Supabase CLI 2.105.0 (`db reset` full replay, `db lint` clean).
- Mobile demo (Expo): all seven screens read through a repository data layer; Record is interactive (German amount input, payer/participant selection incl. paused override, validation, live equal-split preview); local drafts feed session balances and timelines; Inbox runs the ledger-only settlement transitions (mark paid / confirm / reject) with live balance effect.
- Guardrails: static SQL boundary checker, CI (boundary, typecheck, tests, lint, hygiene) on every PR and push to main.

## What does not work yet

- No auth, no live Supabase connection, no persistence: drafts and settlement states reset on app reload.
- Mock data only; mobile app and SQL schema are not wired together.
- Some Overview sections (receivables/debts rows, open actions, recent activity) are static copy, not ledger-derived.
- No membership-change, availability-edit, inbox-resolution, or delete policies.
- No multi-currency, receipts, location, offline sync, push notifications (later MVPs).

## How to demo

See `docs/development/demo-script.md`. Quick start:

```powershell
corepack pnpm install
corepack pnpm --filter @payment-divider/mobile start
```

## Commands

```powershell
corepack pnpm typecheck ; corepack pnpm test ; corepack pnpm lint
corepack pnpm db:boundary-check
corepack pnpm db:lint    # Supabase CLI + Docker
corepack pnpm db:reset   # Supabase CLI + Docker
```

## Current risks

- TS↔SQL alignment is documented convention, not enforced by generated types; drift can re-enter silently.
- RLS policies are validated for syntax locally but have no behavioral tests (no policy-level test suite yet).
- Static Overview copy can contradict ledger-derived numbers as mock data evolves.

## Pre-real-backend checklist

- [ ] Generate TypeScript types from the SQL schema (e.g. `supabase gen types`) and reconcile with `domain-types.ts`.
- [ ] Add RLS behavioral tests (e.g. pgTAP or SQL test harness) for read scopes, write policies, and the settlement transition trigger.
- [ ] Design auth/session flow and profile bootstrap (profile insert on first login).
- [ ] Replace the mock repository with a Supabase-backed implementation behind the same interfaces.
- [ ] Decide persistence strategy for offline drafts before wiring sync.

## Pre-public-launch checklist

- [ ] Real auth UI with account deletion/export concept (GDPR).
- [ ] Mask and encrypt personal identifiers at rest; no payment details in notifications.
- [ ] Privacy policy and data-processing documentation (European-first stance).
- [ ] Rate limiting / abuse review on write paths.
- [ ] App-store boundary review: wording must never imply payment execution.

## Privacy and payment boundary

The app remains a ledger, not a payment provider: no payment initiation, no bank/provider connection, no wallet or funds holding, no payment-method storage in MVP 1A. `payment_actions` only document settlements that happen entirely outside the app, and the schema/trigger/RLS design enforces that updates stay limited to ledger status transitions.

## MVP 1B candidates

- Visibility profiles and the PaymentMethod model with masked identifiers and revocation (per existing 1B scope).
- Membership management flows (invite, leave, role changes) with matching write policies.
- Ledger-derived Overview rows (receivables/debts per person) replacing static copy.
- Persistence for local drafts and inbox resolution.
