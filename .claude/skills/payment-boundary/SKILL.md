---
name: payment-boundary
description: Product, privacy and payment/banking boundary for payment-divider. Use whenever writing features, docs, SQL, UI copy or PR descriptions to keep the app ledger-only and the wording neutral. Binding word lists included.
---

# Payment / privacy boundary

Source of truth: `docs/product/mvp1b-boundary-v0.1.md` (#93),
`docs/product/free-sync-premium-backup-v0.1.md` (#94).

## Hard boundary (every phase, no exceptions)

- MVP is ledger-only: it records and displays, it never moves money.
- No payment providers, no payment initiation/execution.
- No banking integration, no wallet, no funds holding.
- No IBAN/PayPal/payment-method storage.
- No "pay now" UX, no action links that trigger payments.
- No dunning, no collections, no fees, no interest, no escalation.

## Vocabulary (binding)

- A claim is a private ledger note — never a Mahnung, demand or debt proof.
- A reminder is a self-set memory aid — never Inkasso or a message to the
  other side.
- Person balance is display only: gross positions stay visible, net is a
  summary — never automatic offsetting/settlement.
- Recurring cost is tracking: rule + periods + history — never auto-debit or
  provider integration.
- Forbidden words in UI/specs: "Mahnung", "Eintreiben", "Inkasso",
  "Strafgebühr", "Verzug", "Betrug", "ungültig"/"falsch" as judgement.

## Privacy / data classes

- Private local data stays local unless shared or synced (never say
  "everything stays local" or "no cloud").
- Shared/synced data lives on EU servers, RLS-scoped to participants.
- Linking a person to an app user never auto-exposes old private claims;
  sharing is explicit per claim (`sharedWithCounterparty`).
- Free-text/external persons stay private to their owner, including names.
- Premium = comfort (encrypted backup, multi-device, restore), never a core
  function and never anything payment-related. Litmus test: if removing it
  breaks settling up with another person, it belongs in free.

## Enforcement hooks

- `corepack pnpm db:boundary-check` scans SQL for forbidden terms — run on
  every SQL change.
- Every PR body restates the boundary confirmation explicitly.
