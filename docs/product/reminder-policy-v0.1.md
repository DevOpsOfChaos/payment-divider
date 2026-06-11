# Reminder Policy v0.1 — Claims & Recurring Costs

Status: product specification (MVP 1B, issue #90), decided 2026-06-11.
Complements `private-claims-v0.1.md`, `claim-dispute-clarification-v0.1.md`
and `shared-subscriptions-v0.1.md`.

## Product stance

The app helps people remember; it never pressures them to pay. Reminders are
a personal tool of the user who sets them — not a channel to push the other
side. No dunning, no collections, no fees, no escalation, no "overdue" shaming.

## Rules

- **Optional.** Reminders and due dates are both optional. A claim without a
  due date is simply "Ohne Frist" — never treated as a problem.
- **Personal.** Each user sets reminders for themselves. A reminder is only
  visible to and only fires for its owner. Nothing is ever sent on the other
  side's behalf.
- **Both sides may set them.** The debtor of a linked claim can set their own
  reminder even if the creditor set no due date; the creditor can set one to
  follow up for themselves.
- **Reducible and disableable.** Every reminder can be snoozed ("Später
  erinnern" — always to a later time) or turned off ("Nicht mehr erinnern")
  at any time. Disabling keeps the record; nothing is deleted behind the
  user's back.
- **Neutral language only.** A reminder states the fact (claim, amount, date)
  and nothing more. No urgency framing, no consequences, no repetition
  escalation.
- **No automatic sending.** MVP 1B stores reminder metadata only. There is no
  push, no e-mail, no external message. A due reminder may surface inside the
  app (e.g. inbox/overview) when the owner opens it.

## Recurring costs (prepared, not implemented)

Shared subscriptions / recurring costs may later generate periodic reminders
for the user's own share ("Netflix-Anteil fällig am 1."). Same rules apply:
self-set, per user, pausable per period or entirely, neutral wording. This
spec reserves the behavior; no recurring-cost reminder implementation in
MVP 1B (see `shared-subscriptions-v0.1.md`, phase 2).

## Data model

Already in place — no migration needed:

- DB: `claim_reminders` (`claim_id`, `user_id`, `remind_at`, `note?`,
  `disabled_at?`), RLS own-user only.
- Core: `ClaimReminder` plus `isReminderActive`, `getDueReminders(userId, at)`,
  `snoozeReminder` (later only, re-enables), `disableReminder` (keeps record).
- Events: `reminder_set` / `reminder_cleared` in the claim timeline.

Recurring-cost reminders will reuse the same shape against their own parent
record once that model lands.

## Language rules (UI copy)

Use: "Daran erinnern", "Später erinnern", "Erinnerung pausieren",
"Nicht mehr erinnern", "Fällig am", "Ohne Frist".
Never use: "Mahnung", "Eintreiben", "Strafgebühr", "Verzug", "Inkasso",
"Betrug" — or any phrasing that escalates, threatens or implies fault.

## Non-goals

- no push notifications, no external messages (e-mail/SMS/chat)
- no automatic dunning, no interest, no fees, no collections
- no payment providers, banking, wallet or payment-method storage
- no reminder sent to or on behalf of the other person
