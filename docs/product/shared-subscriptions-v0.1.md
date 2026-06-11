# Shared Subscriptions and Recurring Costs v0.1

Status: product specification, decided 2026-06-11. Periods, participant/share
history and counterparty integration refined per issue #92 (same day).
Core types and period groundwork live in `packages/core/src/cost-plans.ts`;
everything else is specification only — follow-up issues derive from this
document.

## Problem

Many shared costs are not one-off group expenses: streaming subscriptions,
family/flat plans, yearly prepayments, monthly memberships with changing
amounts. One person pays upfront; others participate regularly or
proportionally. Today this lives in spreadsheets and chat reminders.

## Product stance

Recurring cost tracking is planning and bookkeeping, not billing. The app
never debits anyone, never connects to providers or banks, never stores
payment details. It tells people what is owed and lets them record what was
settled externally — same ledger-only stance as expenses, payment actions,
and claims.

## Core concept: CostPlan

A `CostPlan` is a rule that generates expected periods, not transactions.
Types in `packages/core/src/cost-plans.ts`:

```text
CostPlan
  id, name ("Streaming Familienabo")
  ownerUserId                    person who pays the provider upfront
  amount (minor units), currency current amount; periods snapshot it
  intervalKind                   monthly | yearly | custom_days (+ intervalDays)
  anchorDate                     first period start; all boundaries derive
                                 deterministically from anchorDate + periodIndex
  prepaid                        false: per-period | true: paid ahead (e.g. yearly)
  groupId?, contextId?           optional link, NOT treated as a trip group
  archivedAt?

CostPlanParticipant              one participation PHASE of a counterparty (#88)
  id, costPlanId, counterpartyId reusable person record; app_user, invited_person
                                 or external_person — same privacy rules as claims
  shareType                      equal | fixed (fraction: phase 2)
  shareValue?                    fixed amount in minor units
  joinedAtPeriodIndex
  leftAtPeriodIndex?             exclusive — no longer active in this period

CostPlanPeriod                   materialized per interval occurrence
  id, costPlanId, periodIndex, periodStart, periodEnd (exclusive)
  amount (minor units)           snapshot — amount changes affect future periods only
  status                         expected | partially_settled | settled | skipped

CostPlanSettlement               ledger-only, mirrors ClaimPayment semantics
  id, costPlanPeriodId, counterpartyId, amount, settledDate
  confirmationStatus             recorded | pending_confirmation | confirmed | rejected

CostPlanEvent                    history (who changed what, when)
  plan_created | amount_changed | participant_joined | participant_left |
  share_changed | period_generated | period_skipped | settlement_recorded |
  settlement_confirmed | settlement_rejected | plan_archived
```

### Counterparties, and the owner's own share

Participants are counterparty references (#88), never raw names: external
persons stay private to the owner, linked app users can later see the plans
and periods they are part of (claims sharing rules apply). The owner is not a
participant record — their own share is the implicit remainder
(`period.amount − sum(participant shares)`; for equal splits the owner counts
as one head). This avoids self-counterparties and guarantees shares never
exceed the period amount.

### History as records, not mutation

Participant and share changes never rewrite existing rows. A participant
record is one phase: leaving sets `leftAtPeriodIndex` (exclusive); re-joining
or changing a share/type closes the old record and starts a new one from the
chosen period. Resolving any past period therefore reproduces exactly the
participants and shares that were valid then. At most one active record per
counterparty and period (`getActiveParticipants` enforces this).

### Why periods are materialized

- Amount changes ("price went up in March") must not rewrite history: each
  period snapshots the amount valid at generation time. The plan's `amount`
  is only the template for future periods; changing it is an
  `amount_changed` event.
- Participant/share changes apply from a chosen period onward; old periods
  keep their original split.
- Yearly prepayment (`prepaid: true`, yearly interval): one period covering
  twelve months; participants settle their share once or in parts against
  that period. Insurance paid upfront works the same way.
- Period boundaries are pure functions of the plan (`getPeriodRange`):
  monthly/yearly clamp month-end anchors (Jan 31 → Feb 28) without drifting,
  custom intervals step by exact day counts. Periods are generated on demand,
  never by background jobs.

### Open positions and settled history

Every non-skipped period produces one open position per active participant
(their share minus confirmed settlements). A period becomes `settled` when
all shares are settled, `skipped` when the owner marks it as not applicable
(e.g. paused subscription). Settled and skipped periods stay visible as
history with their original snapshot — they only stop producing open
positions.

## Aggregation: person balance overview (#89)

Open period shares feed the person balance overview
(`person-balance-overview-v0.1.md`): each open participant share becomes one
gross `PersonBalancePosition` with the reserved `recurring_cost` source type
("4,99 EUR Netflix-Anteil"), keyed by the same counterparty as claims and
group balances. Gross positions stay visible, net is summary only, settled
periods move to the history section — identical rules to the other sources.
Recurring costs do not enter group balance math even when linked to a group.

## Reminders (#90)

Recurring costs may later generate periodic self-set reminders ("Anteil
fällig am 1."), following `reminder-policy-v0.1.md` unchanged: optional,
per-user, snoozable, disableable, neutral wording, no push, nothing sent on
the other side's behalf. Reference only — no reminder implementation here.

## Boundary to Expense and Claim

| | Expense | Claim | CostPlan |
| --- | --- | --- | --- |
| Occurrence | one-off | one-off note | recurring rule + periods |
| Parties | group participants | 1 counterparty | n participants, changing over time |
| Amount | fixed | fixed | changes over time, snapshot per period |
| Settlement | group balance | claim payments | per-period settlements |

A CostPlan is not sugar for repeated expenses: periods, share evolution, and
prepayment make it a separate model. Converting a settled period into a
regular expense is explicitly out of scope.

## MVP cut

Phase 1 (tracking only): create/edit plan, participants with equal or fixed
shares, monthly/yearly intervals, period generation on demand (no background
jobs), record/confirm settlements, history events, per-person summary
integration, archive.

Phase 2 (later): custom intervals, fraction shares, reminders (self-set, like
claims), invited-person linking, group-context views.

Not planned before validation: automation of any kind — no auto-debit, no
provider integration, no bank connection, no payment-data storage, no
notifications to other people, no background period generation.

## Privacy and fairness

Same rules as claims: free-text participants stay private to the plan owner;
linked participants see exactly the plans and periods they are part of;
no reminders sent on someone else's behalf; no public proof of debt.

## Follow-up issues (to be created when implementation starts)

1. Core: share splitting per period (equal remainder distribution like
   `splitExpenseEqually`), settlements, open-position derivation feeding the
   `recurring_cost` person-balance source. (Types, period boundaries and
   participation history already landed via #92.)
2. Database schema + RLS (owner/participant visibility, settlement
   confirmation semantics, immutability triggers like claims).
3. Mobile UI: plan list, plan detail with periods, settlement recording,
   person balance overview integration.
