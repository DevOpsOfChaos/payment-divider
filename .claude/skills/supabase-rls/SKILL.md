---
name: supabase-rls
description: Rules for Supabase/SQL/RLS work in payment-divider — required checks per migration, grant hygiene, RLS smoke tests, core/DB parity proof. Use for any change under supabase/ or to scripts touching the database.
---

# Supabase / SQL / RLS work

## Required for every SQL migration

1. RLS: every new table gets `enable row level security` plus explicit
   policies; think through creator/counterparty/outsider visibility.
2. Grants: check `20260611143000_grant_app_role_table_privileges.sql`
   pattern. `authenticated` gets only the privileges it needs (no blanket
   DELETE — claims intentionally have none). No `anon` rights without a
   deliberate, documented reason.
3. Extend `supabase/tests/rls_smoke_test.sql` for new behavior — positive
   and forbidden cases. Note: `reset role` does NOT clear
   `request.jwt.claims`; impersonate explicitly per section.
4. Run, in this order, and report results honestly:
   - `corepack pnpm db:boundary-check`
   - `supabase db reset` (all migrations must replay cleanly)
   - `supabase db lint`
   - `corepack pnpm db:rls-test`

## Server is never weaker than core

- Any business rule enforced in `packages/core` that matters for integrity
  (status transitions, immutability, visibility) must also be enforced
  server-side (trigger/constraint/policy).
- When a rule exists in both places, prove parity — pattern:
  `scripts/check-claim-transition-parity.ts` parses the migration's
  marker-delimited pair list and compares against the exported core table;
  wired into `pnpm test` so CI catches drift. Never maintain two silently
  diverging tables.

## Security hygiene

- `security definer` functions only after checking what they expose; keep
  them narrow (existing pattern: `is_claim_participant`, `is_claim_creator`,
  `is_counterparty_owner`).
- Never print or commit secrets/keys; local stack uses shared dev defaults
  only (`supabase/config.toml` reads env).
- Immutability via triggers (see `enforce_claim_payment_update`,
  `enforce_payment_action_transition`) — updates pin non-status columns.
