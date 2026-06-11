# Claim Dispute & Clarification Workflow v0.1

Status: product and architecture specification (MVP 1B, issue #91), decided
2026-06-11. Hardens the linked-claim flow from `private-claims-v0.1.md`.

## Product stance

A dispute is a request to talk, not a verdict. The app never decides who is
right: it records that the counterparty has not (yet) taken the claim over and
keeps both sides looking at the same dated facts. No arbitration, no legal
assessment, no chat system, no collections logic, no fees, no dunning.

## Who can dispute what

- Only claims the counterparty can actually see (linked **and** shared) can be
  acknowledged or disputed. Private/unshared claims have no counterparty view,
  so they can never enter the dispute flow.
- Acknowledgement is optional. A linked claim works without it; payments can
  be recorded and confirmed on an unacknowledged claim.
- The counterparty can dispute before or after acknowledging (something may
  turn out wrong later).

## What a dispute does — and does not do

| | Effect |
| --- | --- |
| Creator's view | Claim stays fully visible, listed as open, labelled "Klärung nötig" |
| Counterparty's view | Claim shows as not taken over ("Nicht übernommen"), with a clarification hint ("Bitte klären") |
| Deletion | Never. A dispute cannot delete or hide the creator's record |
| Validity | No statement. The app never claims the record is wrong, invalid or fraudulent |
| Settling | Blocked. A disputed claim cannot move to settled/confirmed until clarified |
| Penalty | None. Disputing is always available to the linked counterparty and carries no consequence |

## Status transitions

Single source of truth: `CLAIM_STATUS_TRANSITIONS` in
`packages/core/src/claims.ts` (`canTransitionClaimStatus`,
`transitionClaimStatus`). Dispute-relevant rules:

- `linked_open` / `debtor_acknowledged` / `partially_paid` / `marked_paid`
  → `disputed`: the counterparty asks for clarification.
- `disputed` → `linked_open`: clarified, claim reopens unchanged (creator may
  also edit and re-share it; the edit is an event, not a new claim).
- `disputed` → `debtor_acknowledged`: counterparty takes the claim over after
  talking it through.
- `disputed` → `archived`: creator drops the matter. Only the creator
  archives; archiving is terminal.
- `disputed` → `settled` / `creditor_confirmed`: **forbidden** — no silent
  settlement of contested claims.
- `private_open` → `disputed`: **forbidden** — nothing to dispute without a
  counterparty view.

## History / audit trail

Every step is a dated `ClaimEvent` with the acting user: `claim_acknowledged`,
`claim_disputed`, `claim_clarified`, plus payment events. The timeline answers
"who confirmed/declined/changed what, when" for both sides. Events are
append-only; clarification never rewrites history.

## Partial payments on linked claims

Unchanged rule, restated as part of fairness: on a shared linked claim,
payments recorded by the counterparty stay `pending_confirmation` until the
creditor confirms. Pending or rejected payments never reduce the open amount.
Private claims keep direct recording.

## Language rules (UI copy)

Use: "Klärung nötig", "Nicht übernommen", "Abgelehnt", "Bitte klären".
Never use: "Betrug", "ungültig", "falsch", "Mahnung" — or any phrasing that
declares the claim automatically wrong or escalates pressure.

## Non-goals

- no chat/messaging system (clarification happens outside the app)
- no arbitration or legal evaluation
- no collections, no fees, no dunning, no reminders sent on someone's behalf
- no payment providers, banking, wallet or payment-method storage
