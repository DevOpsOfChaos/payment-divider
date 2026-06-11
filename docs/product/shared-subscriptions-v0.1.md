# Shared Subscriptions and Recurring Costs v0.1

Status: product specification, decided 2026-06-11. Specification only — no
implementation yet; follow-up issues derive from this document.

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

A `CostPlan` is a rule that generates expected periods, not transactions:

```text
CostPlan
  id, name ("Streaming Familienabo")
  ownerUserId                    person who pays the provider upfront
  amount (minor units), currency
  interval                       monthly | yearly | custom_days(n)
  anchorDate                     first period start
  prepaid                        false: per-period | true: paid ahead (e.g. yearly)
  groupId?, contextId?           optional link, NOT treated as a trip group
  archivedAt?

CostPlanParticipant
  id, costPlanId, participant (app user | invited | free-text, like claims)
  shareType                      equal | fixed | fraction
  shareValue?
  joinedAtPeriod, leftAtPeriod?  participation can change over time

CostPlanPeriod                   materialized per interval occurrence
  id, costPlanId, periodStart, periodEnd
  amount (minor units)           snapshot — amount changes affect future periods only
  status                         expected | partially_settled | settled | skipped

CostPlanSettlement               ledger-only, mirrors ClaimPayment semantics
  id, costPlanPeriodId, fromUserId/participantRef, amount, settledDate
  confirmationStatus             recorded | pending_confirmation | confirmed | rejected

CostPlanEvent                    history
  amount_changed | participant_joined | participant_left | share_changed |
  settlement_recorded | settlement_confirmed | period_skipped | plan_archived
```

### Why periods are materialized

- Amount changes ("price went up in March") must not rewrite history: each
  period snapshots the amount valid at generation time.
- Participant/share changes apply from a chosen period onward; old periods
  keep their original split.
- Yearly prepayment: one period covering twelve months; participants settle
  their share once or in parts against that period.

## Aggregation

Open period shares feed the existing per-person summary (claims spec): one
row per person combines open private claims, group balances, and open
recurring-cost shares — each clearly labelled by source. Recurring costs do
not enter group balance math even when linked to a group.

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

1. Core model + period/share calculations + tests.
2. Database schema + RLS (owner/participant visibility, settlement
   confirmation semantics, immutability triggers like claims).
3. Mobile UI: plan list, plan detail with periods, settlement recording,
   per-person summary integration.
