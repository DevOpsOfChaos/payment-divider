# MVP 1B Feature Boundary and Non-Goals v0.1

Status: product decision (issue #93), decided 2026-06-11. Consolidates the
boundaries from all MVP 1B specifications so implementation issues can point
at one document instead of restating limits.

Source specs: `private-claims-v0.1.md` (#82–#84, #88),
`claim-dispute-clarification-v0.1.md` (#91), `reminder-policy-v0.1.md` (#90),
`person-balance-overview-v0.1.md` (#89), `shared-subscriptions-v0.1.md`
(#85, #92), `mvp-scope.md` (MVP 1A baseline).

## What MVP 1B is

MVP 1B extends the 1A group ledger with the personal layer: who do I track,
what is open between me and each person, across private notes, groups and
(later) recurring costs. It stays a ledger — it records and displays, it
never moves money and never pressures anyone.

## In MVP 1B

- Counterparties / central person model: reusable owner-private person
  records (`app_user`, `invited_person`, `external_person`), aliases,
  normalized names for duplicate suggestions (#88).
- Private claims / IOUs, both directions, optional group link (#82–#84).
- Partial payments; on shared linked claims the creditor confirms (#84, #91).
- Dispute/clarification workflow with enforced status transitions (#91).
- Optional due dates and self-set reminder metadata (#90).
- Person balance overview across claims and pairwise group balances; gross
  positions visible, net as summary, closed as history (#89).
- Recurring cost / shared subscription specification plus narrow core
  groundwork (types, period boundaries, participation history) (#92).
- Local demo and Supabase alpha foundation (schema, RLS, smoke tests).

## Later (specified or planned, not in 1B)

- Recurring cost implementation: share splitting, settlements, period store,
  `recurring_cost` person-balance producer, plan UI (follow-ups per #92 spec).
- Reminder consumer (inbox/overview surfacing of due reminders) (#90).
- Invite flow that actually links `invited_person` to an app user.
- Duplicate merge as explicit user-confirmed flow (#88 prepares only).
- `disputed → linked_open` clarification action in mobile UI (#91 spec only).
- Free sync and premium encrypted backup model: decided in
  `free-sync-premium-backup-v0.1.md` (#94) — core sharing/sync stays free,
  premium phase 1 is comfort only (encrypted backup, multi-device, restore);
  private local data stays local unless shared or synced.

## Expressly not in MVP 1B

- Contact book sync
- Push notifications, e-mails, SMS or any external messages
- External web links that trigger actions
- OCR / receipt scanning, location features
- Offline sync, multi-currency conversion (display per currency instead)
- Public alpha

## Hard payment/banking boundary (applies to every phase, not just 1B)

The app never:

- integrates payment providers or initiates/executes payments
- connects to banks, holds funds, or offers wallet functionality
- stores IBANs, PayPal handles or any payment-method data
- auto-debits anything, charges interest, fees or penalties

"Marked as paid" and settlements always describe what happened outside the
app. `db:boundary-check` enforces forbidden terms in SQL; specs and PRs
restate this boundary explicitly.

## Vocabulary (binding for UI copy and specs)

| Term | Is | Is not |
| --- | --- | --- |
| Claim | dated private ledger note between creator and one counterparty | Mahnung, demand instrument, debt proof |
| Reminder | self-set, snoozable, disableable personal memory aid | Inkasso, dunning, escalation, message to the other side |
| Person balance | display aggregation: gross positions + net summary | automatic offsetting/settlement of positions |
| Recurring cost | tracking rule with periods and history | subscription billing, auto-debit, provider integration |
| Dispute | request to clarify, claim stays visible at creator | verdict, deletion, statement of fraud/invalidity |

Forbidden wording everywhere: "Mahnung", "Eintreiben", "Inkasso",
"Strafgebühr", "Verzug", "Betrug", "ungültig", "falsch" (as judgement),
or anything implying pressure, escalation or legal assessment.

## Privacy rules (carried from the specs)

- Free-text/external persons stay private to their owner — including names.
- Linking a counterparty to an app user never auto-exposes old private
  claims; sharing is explicit per claim.
- Reminders are per-user; nothing fires for or is sent to the other side.
- No public proof of debt, no export of someone else's debt.

## Issue map

| Area | Spec | Issues |
| --- | --- | --- |
| Claims core/DB/UI | private-claims-v0.1 | #82, #83, #84 |
| Counterparties | private-claims-v0.1 (§central layer) | #88 |
| Person balance | person-balance-overview-v0.1 | #89 |
| Reminder policy | reminder-policy-v0.1 | #90 |
| Dispute workflow | claim-dispute-clarification-v0.1 | #91 |
| Recurring costs | shared-subscriptions-v0.1 | #85, #92 |
| Boundary (this doc) | mvp1b-boundary-v0.1 | #93 |
| Sync/backup model | free-sync-premium-backup-v0.1 | #94 |
| Shared alpha readiness | shared-alpha-backend-readiness v0.1 (architecture) | #108 |
