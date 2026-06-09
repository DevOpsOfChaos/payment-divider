# Activity Detail Screen Specification

Status: draft  
Scope: MVP 1A

## Purpose

Define the activity detail screen as the concrete ledger-context view inside a group.

Technical name: `GroupContext`  
Preferred UI name: `Activity`

The screen must answer:

- what the user's balance is in this activity,
- who is actively participating right now or for the selected date,
- who is paused,
- which expenses belong to this activity,
- which payment-related ledger actions are open,
- which timeline events happened here,
- where the user can quickly record an expense for exactly this activity.

The screen must stay ledger-only. It records and reflects external settlement status but does not execute payments.

## User goal

The user wants to open an activity and understand the exact ledger state for that context without mixing it up with the rest of the group.

The user should immediately understand:

- whether they are owed money or owe money here,
- who is currently active by default,
- who is paused but still relevant historically,
- which expenses and payment actions belong here,
- what the next likely action is.

## Entry points

- Group detail activity row
- Personal overview item linked to a specific activity
- Timeline or inbox item linked to this activity
- Return flow after expense entry or external payment marking
- Direct deep link later

## Primary actions

- Record an expense in this activity
- Mark a payment as externally paid
- Open expense details
- Open payment-action details
- Open participant details
- Open full timeline

Later actions may include:

- manage participant status
- edit activity

Preferred copy examples:

- `Ausgabe erfassen`
- `Zahlung als extern erledigt markieren`
- `Zahlung bestätigen`
- `Details anzeigen`

Avoid copy such as:

- `Jetzt bezahlen`
- `Geld senden`
- `Zahlung ausführen`
- `Überweisung starten`

## Data shown

### Activity header

Show the activity identity inside its parent group.

Required elements:

- activity name,
- optional activity type,
- optional date range,
- parent group reference if helpful for orientation.

The header should make the scoped nature of the screen obvious.

### Activity balance summary

Show the user's balance for this activity only.

Required language:

- positive: `Du bekommst`
- negative: `Du schuldest`
- zero: `Alles ausgeglichen`

The section should include:

- net balance for this activity,
- optional short helper text,
- entry point to more detailed balance rows later.

This number must not silently mix in other group activities.

### Active participants

Show the participants who are active by default for the relevant date context.

This section must reflect the participant-availability logic:

- active participants are determined for date plus activity,
- `Alle auswählen` in expense entry uses active participants for the expense date and activity,
- active status affects default inclusion, not historical membership or balance ownership.

For MVP 1A, the screen should show:

- active participant names,
- compact participant count,
- optional short date label such as `heute` or selected date context later.

### Paused participants

Show paused participants as visible and reachable, not hidden out of existence.

Required concepts:

- paused participants remain part of the activity history,
- paused participants keep balances and historical involvement,
- paused participants can still be manually included in an expense,
- a pause changes default selection, not membership or history.

Each paused row should include:

- participant name,
- compact pause reason or period if present,
- optional re-entry point to manage status later.

### Expense list preview

Show expenses that belong to this activity only.

Requirements:

- do not mix in expenses from other activities in the same group,
- show title or compact label,
- show amount,
- show who paid externally,
- show short date or ordering cue.

MVP 1A default split context:

- equal split is the normal default,
- the screen can assume equal-split behavior without explaining every alternative split type.

Deferred handling:

- deleted or archived expenses should be handled separately later rather than cluttering MVP 1A.

### Payment actions preview

Show payment-related ledger actions for this activity.

Required product framing:

- this is ledger-only,
- marking a payment means recording an external action,
- confirmation reflects user or payee confirmation,
- the app does not execute payment and must not imply provider integration.

Each row may include:

- payer and payee,
- amount,
- status such as pending confirmation,
- entry point into detail or confirmation flow.

### Timeline preview

Show recent timeline items for this activity.

Examples:

- expense created,
- payment marked,
- payment confirmed,
- participant paused,
- participant resumed later.

Each row should include:

- actor,
- concise event text,
- short date label.

### Quick actions

Required quick actions for MVP 1A:

- `Ausgabe erfassen`
- `Zahlung als extern erledigt markieren`

Reserved later actions:

- `Teilnehmerstatus verwalten`
- `Aktivität bearbeiten`

If launched from this screen, expense entry should preselect the current activity.

## Empty state

### Activity has no expenses yet

Message:

- `Noch keine Ausgaben in dieser Aktivität`

Support message:

- explain that the activity will show balances and history after the first expense

Primary action:

- `Ausgabe erfassen`

### Activity is settled

Message:

- `Alles ausgeglichen`

Support message:

- explain that there are currently no open balances in this activity

### No active participants on the selected or current date

Message:

- `Keine aktiven Teilnehmer an diesem Datum`

Support message:

- explain that all default participants are paused for the relevant date and that paused participants remain manually selectable in expense entry

### All participants paused

Message:

- `Alle Teilnehmer sind pausiert`

Support message:

- explain that history and balances remain visible and that manual inclusion is still possible when recording an expense

### No open actions

Message:

- `Keine offenen Aktionen`

Support message:

- explain that pending confirmations will appear here when needed

## Error states

### Activity data could not be loaded

Requirements:

- clear failure copy,
- retry action,
- do not present a guessed activity identity as confirmed.

### Participant status could not be loaded

Requirements:

- explain that active and paused lists may be incomplete,
- offer retry,
- do not present guessed participant status as reliable truth.

### Balance could not be calculated

Requirements:

- do not show invented numbers,
- offer retry,
- preserve access to non-balance sections where feasible.

### Expenses could not be loaded

Requirements:

- show that the activity exists but expense list is unavailable,
- offer retry,
- avoid showing partial expense truth without labeling it.

### Inconsistent ledger data

Examples:

- balances point to missing expenses,
- payment action references invalid context linkage,
- participant-state data conflicts with ledger visibility.

Requirements:

- explain that the activity view cannot be shown reliably,
- avoid misleading balances or participant claims,
- provide retry and future support path.

## Privacy concerns

- Activity balances and participant status may be visible on casual glance; later versions may need privacy controls.
- Do not show full IBANs, payment links, phone numbers, or email addresses in payment previews or participant rows.
- Pause reasons or notes may contain personal context and should stay compact.
- Expense and payment previews must not expose raw payment identifiers.
- Payment-related UI must stay summary-level and ledger-oriented in MVP 1A.

## MVP 1A scope

Include:

- activity header,
- activity balance summary,
- active participants,
- paused participants,
- expense list preview,
- payment actions preview,
- timeline preview,
- quick actions for expense entry and external payment marking,
- explicit explanation that participant availability affects default selection rather than historical membership,
- explicit statement that expenses shown belong to this activity only.

Exclude:

- payment execution,
- provider or bank integrations,
- activity editing flow,
- participant-status management flow,
- deleted or archived expense management UI,
- payment-method sharing UI,
- multi-currency handling,
- offline or sync-conflict UI.

## Later scope

- participant-status management UI
- activity editing
- archived or deleted expense views
- filters and search for expenses and timeline
- multi-currency activity balances
- richer payment-method visibility hints
- sync-state handling
- date switching for participant-state views

## Example screen sketch

```text
Amsterdam 2026

Saldo in dieser Aktivität
Du bekommst 38,00 €

Teilnehmer heute
Manu, Anna, Lukas

Pausiert
Max · pausiert bis 07.08.

Ausgaben
Abendessen · 42,80 € · bezahlt von Manu
Tickets · 120,00 € · bezahlt von Anna

Zahlungen
Lukas hat 20,00 € als extern erledigt markiert · Bestätigung offen

[Ausgabe erfassen] [Zahlung markieren]
```

## Acceptance criteria

- The spec uses the screen-spec template sections from the index.
- The purpose defines the screen as the concrete ledger context inside a group.
- The spec states that the screen must answer the user's activity balance, active participants, paused participants, scoped expenses, payment actions, and timeline.
- The screen includes the required main sections:
  - activity header
  - activity balance summary
  - active participants
  - paused participants
  - expense list preview
  - payment actions preview
  - timeline preview
  - quick actions
- The quick actions include at least `Ausgabe erfassen` and `Zahlung als extern erledigt markieren`.
- The participant sections explicitly state that paused participants remain visible, keep history and balances, and can still be manually included in expense entry.
- The spec explicitly states that `Alle auswählen` behavior in expense entry is based on active participants for date plus activity.
- The expenses section explicitly states that only expenses from this activity are shown.
- The payment-actions section explicitly states that the flow is ledger-only and does not execute payments in the app.
- The spec includes the required empty states:
  - no expenses yet
  - activity is settled
  - no active participants on the selected or current date
  - all participants paused
  - no open actions
- The spec includes the required error states:
  - activity data failed to load
  - participant status failed to load
  - balance failed to calculate
  - expenses failed to load
  - inconsistent ledger data
- The spec stays inside MVP 1A and avoids payment-provider or payment-execution language.

