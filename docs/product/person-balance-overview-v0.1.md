# Person Balance Overview v0.1

Status: product and architecture specification (MVP 1B, issue #89), decided
2026-06-11. First implementation: core aggregation + mobile demo section.

## Purpose

Answer per person, not per group: "What is open between me and Anna overall?"
The overview aggregates existing ledger data; it never initiates payments,
stores no payment methods and adds no "pay now" UX.

## Product rules

- **Gross stays visible.** Every open position (single claim, group balance)
  remains listed. Netting is a summary on top, never a replacement — no
  automatic offsetting without visible individual positions.
- **Net is a summary line**: "you get / you owe / settled" per person and
  currency. Currencies are never netted against each other.
- **Closed positions are hidden by default** but stay reachable as history
  (closed claims keep their original amount).
- **Person = counterparty** from the central counterparty layer (#88):
  `app_user`, `invited_person` or `external_person`.

## Sources

| Source | Status | Mapping |
| --- | --- | --- |
| Private claims / IOUs | implemented | one position per claim (remaining amount), incoming linked claims flipped to the current user's perspective |
| Group balances | implemented (pairwise) | one position per group, person and currency, derived pairwise from expenses, shares and settled payment actions; attaches only to counterparties linked to an app user |
| Recurring costs / shared subscriptions | prepared type only | `recurring_cost` source type is reserved; no producer until shared subscriptions (see `shared-subscriptions-v0.1.md`) land |

## Privacy

- The overview is computed from the owner's own data; counterparty records
  never become visible to other users through it.
- Linked-claim payment rules carry through: on a shared linked claim only
  creditor-confirmed payments reduce the open position. Unshared claims stay
  in private mode even against linked counterparties.
- Group positions only attach to people the user already tracks as linked
  counterparties; unknown group members are not auto-created as persons.

## Demarcation from the group overview

The group overview answers "how does this group stand"; the person overview
answers "how do I stand with this person across everything". Group balances
feed the person overview pairwise but remain authoritative in their group
context — the person overview adds no settlement semantics of its own.

## Core API (`packages/core/src/person-balance.ts`)

- `PersonBalancePosition` — gross position with `sourceType`
  (`private_claim` | `group_balance` | `recurring_cost`), direction, amount,
  currency, `closed` flag.
- `claimsToPersonPositions(claims, payments, counterparties)`
- `groupBalancesToPersonPositions({ expenses, expenseShares, paymentActions, currentUserId, counterparties })`
- `buildPersonBalanceOverview({ positions, counterparties })` — one row per
  counterparty and currency with `openOwedToMe`, `openOwedByMe`, `netAmount`,
  `openPositions`, `closedPositions`.

New sources later only need to emit `PersonBalancePosition`s.

## Non-goals (unchanged ledger boundary)

- no payment providers, no bank/wallet features, no payment method storage
- no automatic settlement without visible individual positions
- no contact book sync, no push, no duplicate merge flow
