# Private Claims / Personal IOU Tracking v0.1

Status: product and architecture specification (MVP 1B), decided 2026-06-11.
Replaces ad-hoc notes apps and chat threads ("wer schuldet wem was") with
dated, partially-payable, optionally linked claims.

## Product stance

A claim is a private ledger note, not a demand instrument. Payment Divider
stays a ledger app: claims never initiate payments, never produce public debt
proof, never escalate. No interest, no fees, no collections logic, no external
action links.

## Counterparty types

| Type | Meaning | Visibility |
| --- | --- | --- |
| `app_user` | Existing app contact, linked by user id | Creator + linked counterparty |
| `invited_person` | Person to be invited/linked later (name + optional invite hint) | Creator only until linked |
| `free_text_person` | Just a name, never linked | Creator only, permanently private |

A claim starts in whichever type fits and may upgrade later
(`free_text_person` → `invited_person` → `app_user`); downgrades are not
supported, only archiving.

## Direction

Both directions are first-class:

- `owed_to_me`: I am the creditor.
- `owed_by_me`: I am the debtor (my own IOU note about what I owe someone).

## Core flows (UX)

1. **Quick capture**: person (pick contact / type name), amount, currency,
   purpose, date. Two taps from the claims area. Optional: due date,
   group/activity link.
2. **Linked notification**: when the counterparty is an `app_user`, they see
   the claim in their inbox and can acknowledge ("übernehmen") or dispute
   ("Klärung nötig"). Acknowledgement is optional — trust is the default; an
   unacknowledged linked claim stays fully usable for the creator.
3. **Dispute**: a disputed claim stays visible to the creator, clearly marked
   "Klärung nötig". Nothing is deleted, nobody is mahned. Both sides see the
   same state.
4. **Partial payments**: any number of payments against a claim. For linked
   claims the creditor confirms each payment (mirroring the existing
   ledger-only PaymentAction confirmation idea); for private claims the
   creator just records them.
5. **Reminders**: the debtor of a linked claim can set their own reminder even
   if the creditor set no due date. Reminders are personal, reducible, and can
   be disabled. No push escalation in MVP; reminder metadata only.
6. **Per-person summary**: one row per person aggregating open private claims
   in both directions, open group balances, and (later) recurring-cost shares.
7. **History**: settled/archived claims are hidden by default but remain in
   the per-claim history view.

## Status model

```text
draft                created, not yet saved/visible
private_open         open, counterparty not linked (invited/free-text)
linked_open          open, linked counterparty notified
debtor_acknowledged  linked counterparty accepted the claim
disputed             linked counterparty signalled "needs clarification"
partially_paid       at least one payment recorded, remainder > 0
marked_paid          debtor marked the remainder as settled (linked claims)
creditor_confirmed   creditor confirmed full settlement (linked claims)
settled              remainder = 0 and (private || creditor-confirmed)
archived             manually closed regardless of remainder
```

Transition principles: forward-only along payment progress; `disputed` can
return to `linked_open`/`debtor_acknowledged` after clarification; `archived`
is terminal except for an explicit unarchive by the creator. Status is partly
derived (payment progress) and partly explicit (acknowledge/dispute/confirm/
archive) — the derived part must come from one shared core function, never
duplicated in UI.

## Data model proposal

### Claim

```text
id, creditorUserId?, debtorUserId?      one of them is the creator's id
direction                                owed_to_me | owed_by_me (from creator view)
counterpartyType                         app_user | invited_person | free_text_person
counterpartyUserId?                      set when app_user
counterpartyName                         display name (always present)
amount (minor units), currency
purpose, claimDate, dueDate?
groupId?, contextId?                     optional ledger link
status                                   see status model
createdBy, createdAt, updatedAt, archivedAt?
```

### ClaimPayment

```text
id, claimId, amount (minor units), currency
paymentDate, note?
recordedBy
confirmationStatus                       recorded | pending_confirmation | confirmed | rejected
createdAt, confirmedAt?, rejectedAt?
```

### ClaimEvent

```text
id, claimId, actorUserId?, eventType, createdAt
eventType: claim_created | claim_linked | claim_acknowledged | claim_disputed |
           claim_clarified | payment_recorded | payment_confirmed |
           payment_rejected | claim_marked_paid | claim_settled |
           claim_archived | reminder_set | reminder_cleared
```

### ClaimReminder (optional, per user)

```text
id, claimId, userId, remindAt, note?, disabledAt?
```

Remaining amount = `claim.amount - sum(non-rejected confirmed-or-recorded
payments)`; for linked claims only `confirmed` payments reduce the binding
remainder, `recorded`/`pending_confirmation` show as "in Klärung".

## Boundary to Expense / PaymentAction

| | Expense | PaymentAction | Claim |
| --- | --- | --- | --- |
| Lives in | group/activity | group/activity | personal area, optional group link |
| Parties | n participants | payer/payee, both members | creator + 1 counterparty (maybe unlinked) |
| Created from | shared cost | settling a balance | private agreement/notes |
| Confirmation | none | payee confirms | optional acknowledge + per-payment confirm |
| Affects group balances | yes | yes | no — claims aggregate only in the per-person summary |

A claim never rewrites group balances. The per-person summary is the only
place where group balances and claims are combined, clearly labelled per
source.

## Privacy and fairness

- Free-text and invited claims are visible to nobody but the creator —
  including their name strings (RLS: creator-only rows).
- Linked claims are visible to exactly creator and counterparty.
- No aggressive reminders: reminders are self-set by each side, never sent
  on the other's behalf.
- Disputing carries no penalty and is always available to the linked
  counterparty.
- No public proof, no export of someone else's debt, no third-party sharing.

## MVP cut

MVP 1B implements: claim CRUD with the three counterparty types, both
directions, partial payments with confirmation for linked claims, derived
status, per-person summary (claims + group balances), history with default
hide of settled/archived, claim events, local reminder metadata.

Deferred: push reminders, invite flow that actually links `invited_person`,
recurring costs feeding the summary (see shared-subscription spec), offline,
multi-currency conversion in summaries (group per currency instead).

## Follow-up issues

- Core types + calculations + tests (#82)
- Database schema + RLS (#83)
- Mobile UI + data layer (#84)
