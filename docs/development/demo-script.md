# MVP 1A Demo Script

Local mock demo. No backend, no auth, no sync, no payment execution.

## Start

```powershell
corepack pnpm install
corepack pnpm --filter @payment-divider/mobile start
```

Open in Expo Go (QR code) or press `w` for web preview.

## Walkthrough (5–10 minutes)

1. **Overview** — personal net balance derived from the core ledger functions, receivables/debts, open actions, recent activity.
2. **Groups** — three mock groups (Freundeskreis, WG Berlin, Portugal Reise Crew) with activity balances rolled up from the same ledger data.
3. **Group detail** — switch the view mode inside the Groups tab: activities, members incl. paused member, timeline, quick actions.
4. **Activity detail** — Amsterdam 2026: activity-scoped balance, active vs. paused participants, expenses, ledger-only payment actions.
5. **Record (core of the demo)** — enter an amount in German format (`42,80`), optional title, tap a payer, toggle participants. Max is paused for the date and not preselected, but can be manually included. The equal-split preview updates live via `splitExpenseEqually`. Saving creates a local-only draft listed below the button.
6. **Inbox (second demo highlight)** — interactive ledger-only settlement: mark your own suggested payment as externally settled ("als extern erledigt markieren"), or confirm/reject an incoming marked payment. Balances on Overview/Groups update live; rejecting reopens the balance. All local, nothing is executed.
7. **Profile** — identity rows and visibility-profile concept; payment details are placeholders for MVP 1B.

## Talking points

- Balances on every screen come from one shared core package (`@payment-divider/core`), tested with 19 unit tests.
- Payment actions are ledger-only records; the app never moves money.
- Participant pauses change default selection only, never history or balances.
- Drafts and settlement states are session-only in-memory ledger state: closing the app discards them — persistence and backend wiring are later issues.
- Drafts entered in Record immediately change the Overview, group, and activity balances and appear in the timelines as "Demo-Draft".
