# Personal Overview Screen Specification

Status: draft  
Scope: MVP 1A

## Purpose

Define the start screen that gives the user a fast, personal ledger summary across all groups and activities.

The screen must answer, without payment-provider language:

- How much the user gets overall
- How much the user owes overall
- Who owes the user money
- Whom the user owes money
- Which group or activity each balance comes from
- Which actions need attention right now

## User goal

The user wants to open the app and understand their current position within a few seconds:

- whether they are net positive, net negative, or settled,
- which people require follow-up,
- which groups or activities drive the open balances,
- which inbox-style actions need attention next.

## Entry points

- App launch after sign-in
- Bottom navigation item: `Overview`
- Returning from group, activity, inbox, or expense flows

## Primary actions

- Open balance details
- Open a person-level balance detail view
- Open the related group or activity
- Open inbox items that require action
- Open recent activity details
- Mark a payment as externally paid
- Confirm a payment

Avoid action copy such as:

- `Pay now`
- `Send money`
- `Start transfer`
- `Execute payment`

Preferred copy examples:

- `Details anzeigen`
- `Zahlung als extern erledigt markieren`
- `Zahlung bestätigen`

## Data shown

### Global balance card

Show one primary summary across all groups in the user's default currency.

Required language:

- Positive balance: `Du bekommst`
- Negative balance: `Du schuldest`
- Zero balance: `Alles ausgeglichen`

The card should show:

- net balance,
- short helper text that explains the state,
- optional drill-down entry to see total receivables and total debts separately.

Example helper text:

- `Du bekommst mehr als du schuldest.`
- `Du schuldest mehr als du bekommst.`
- `Du hast aktuell keine offenen Salden.`

### Receivables list

Show the people who owe the user money.

Each row should include:

- other person display name,
- amount,
- originating group or activity label,
- compact status hint if a related payment action already exists.

Sort order for MVP 1A:

1. highest amount first
2. then oldest unresolved ledger state first

### Debts list

Show the people the user owes money to.

Each row should include:

- other person display name,
- amount,
- originating group or activity label,
- compact status hint if the user already marked something as externally paid or if confirmation is pending.

Sort order for MVP 1A:

1. highest amount first
2. then oldest unresolved ledger state first

### Open actions / inbox preview

Show a short preview of unresolved action items only, not raw history.

Examples:

- confirm payment
- accept invitation
- choose visibility profile placeholder if needed later

For MVP 1A, likely action types are:

- `confirm_payment`
- `accept_invitation`

The preview should show:

- item type summary,
- related person or group when relevant,
- count of total open items,
- entry point into the full inbox.

### Recent activity preview

Show a short timeline preview to help the user understand what changed recently.

Examples:

- expense created
- payment marked
- payment confirmed
- member availability changed

Each row should include:

- actor name,
- concise event text,
- related activity or group,
- relative or short date label.

This is informational and must not replace the inbox.

### Group attention list

Show groups or activities that still matter because they contain unresolved balances or open actions.

Each row should include:

- group or activity name,
- short reason for attention, such as open balance, pending confirmation, or invitation,
- aggregate amount only if it helps explain why the item matters.

This section helps the user understand where unresolved ledger state comes from across long-lived groups.

### Later: sync/conflict status

Do not include sync or conflict UI in MVP 1A.

Reserve future space for:

- offline sync queue state,
- conflict warnings,
- unresolved merge prompts.

## Empty state

### New user without groups

Show that no groups exist yet.

Primary message:

- `Noch keine Gruppen`

Support message:

- explain that balances appear after joining or creating a group and recording expenses.

Primary action:

- create or join a group.

### User has groups but no expenses yet

Show that the structure exists but there is no ledger activity yet.

Primary message:

- `Noch keine Ausgaben erfasst`

Support message:

- explain that the overview will populate after the first recorded expense.

Primary action:

- record the first expense.

### Everything settled

Show a calm zero-balance state.

Primary message:

- `Alles ausgeglichen`

Support message:

- explain that nobody currently owes the user money and the user owes nobody.

### Open actions empty

Show that there is nothing requiring attention.

Primary message:

- `Keine offenen Aktionen`

Support message:

- explain that confirmations and invitations will appear here when needed.

## Error states

### Balance could not be loaded

Show a recoverable loading failure for the overview summary.

Requirements:

- clear error copy,
- retry action,
- avoid showing stale values as confirmed truth unless explicitly labeled.

### Inconsistent ledger data

Show a defensive error state when the underlying ledger records do not reconcile correctly.

Examples:

- expense shares do not sum to expense amount,
- invalid balance aggregation,
- broken relation between activity and balance source.

Requirements:

- explain that the overview cannot be shown reliably,
- route the user toward retry or support later,
- do not invent numbers.

### Later: offline or sync conflicts

Do not implement in MVP 1A.

Future errors may include:

- local changes waiting to sync,
- conflicting updates across devices,
- partial timeline or balance data because of unresolved conflicts.

## Privacy concerns

- The overview is a start screen and may be visible on casual glance; future versions should allow hiding amounts.
- Do not show full IBANs, phone numbers, email addresses, or payment links on this screen.
- Do not expose raw payment identifiers in recent activity or action previews.
- Push and lock-screen visibility are not part of MVP 1A, but future notifications must avoid full payment details.
- If payment-method-related states appear later, they should stay summary-level only on the overview.

## MVP 1A scope

Include:

- global balance card,
- receivables list,
- debts list,
- open actions preview,
- recent activity preview,
- group attention list,
- entry points into groups, activities, inbox, and balance details,
- copy that clearly frames the app as a ledger.

Exclude:

- payment initiation,
- bank or provider integrations,
- payment method details,
- multi-currency complexity beyond the current default-currency assumption,
- offline sync or conflict handling UI,
- push-notification UI,
- receipt, OCR, and attachment surfaces.

## Later scope

- hide or blur amounts on demand
- multi-currency summaries
- richer balance filtering and search
- payment-method visibility hints
- sync status and conflict resolution entry points
- archived group handling rules
- smarter prioritization for urgent actions

## Example screen sketch

```text
Übersicht

Gesamtsaldo
+84,50 €
Du bekommst mehr als du schuldest.

Du bekommst
Anna · 34,00 € · Portugal Reise
Max · 20,00 € · WG Allgemein

Du schuldest
Sarah · 12,00 € · Amsterdam 2026

Offene Aktionen
2 Zahlungen bestätigen
1 Einladung offen

Letzte Aktivität
Anna hat Abendessen hinzugefügt · Portugal Reise

Gruppen mit Aufmerksamkeit
Portugal Reise · Offene Forderungen
WG Allgemein · Bestätigung ausstehend
```

## Acceptance criteria

- The spec uses the screen-spec template sections from the index.
- The screen is explicitly defined as the app start screen and overview entry point.
- The spec distinguishes global balance, receivables, debts, open actions, recent activity, and group attention.
- The copy rules use `Du bekommst`, `Du schuldest`, and `Alles ausgeglichen`.
- The spec avoids payment-execution language and keeps actions ledger-oriented.
- The spec defines at least the required empty states:
  - new user without groups,
  - groups without expenses,
  - everything settled,
  - no open actions.
- The spec defines at least the required error states:
  - balance failed to load,
  - inconsistent ledger data,
  - sync or conflict handling deferred to later scope.
- The privacy section states that full payment details and identifiers must not appear on this screen.
- The MVP 1A section excludes payment-provider behavior and non-documentation scope.
