# Expense Entry Screen Specification

Status: draft  
Scope: MVP 1A

## Purpose

Define the fastest possible expense-entry screen for normal shared expenses.

The screen exists to let a user record a standard expense in 5-10 seconds without forcing optional detail entry up front.

Product rule:

> Save fast first, enrich later.

The screen must stay ledger-oriented. It records who paid, who participated, and how the amount should be split. It must not imply that money moves inside the app.

## User goal

The user wants to capture a shared expense immediately after paying, while context is still fresh, with the minimum required inputs:

1. amount
2. group/activity
3. payer
4. participants
5. save

The user should not be slowed down by optional fields such as receipt photo, category, note, location, currency handling, or advanced split setup.

## Entry points

- Bottom navigation add/record entry point
- Group detail screen
- Activity detail screen
- Personal overview quick-add entry point
- Return flow after creating a group or activity when the next likely action is recording an expense

If the user starts from a group or activity context, that context should be preselected when possible.

## Primary actions

- Enter amount
- Choose group/activity
- Confirm or change payer
- Review default participant selection
- Include or exclude participants manually
- Reveal paused participants for the chosen date
- Include a paused participant despite the pause
- Save the expense

Preferred copy examples:

- `Ausgabe erfassen`
- `Teilnehmer auswählen`
- `Alle aktiven auswählen`
- `Pausierte anzeigen`
- `Trotz Pause einbeziehen`
- `Ausgabe speichern`

Avoid copy such as:

- `Jetzt bezahlen`
- `Geld senden`
- `Zahlung ausführen`

## Data shown

### Amount

This is the first and most prominent field.

Requirements:

- show a decimal amount in the UI, for example `42,80 €`
- validate before save that the amount is greater than zero
- reject zero and negative amounts
- use integer-based money logic in core
- convert the UI decimal value into the smallest currency unit before persistence or core processing

MVP 1A assumes the group or activity default currency rather than a full multi-currency flow.

### Group / activity

The user must choose the ledger context in which the expense belongs.

Requirements:

- show the selected group and activity together
- allow choosing the default `General` activity
- prefill when launched from a group or activity context
- make it clear that `Activity` is the user-facing term

Example:

- `Portugal Reise · Abendessen`
- `WG Berlin · General`

### Payer

The payer is the user who covered the expense externally.

Requirements:

- default payer is the current user
- payer can be changed within MVP 1A
- available payer choices come from the participants of the selected group/activity context
- payer selection must be present before save

Non-goal for MVP 1A:

- supporting a payer who is not part of the selected group/activity default participant set as a normal default flow

If that case matters later, it should be handled as a deliberate product decision instead of leaking complexity into the MVP default.

### Participants

This section determines who shares the expense.

Requirements for default selection:

- default selection is based on active participants for the selected expense date and activity
- paused participants are not automatically selected
- `Alle aktiven auswählen` means active participants for the selected date and activity, not all group members

Requirements for visibility and manual override:

- paused participants remain visible or are reachable via a compact reveal pattern
- paused participants can be manually included
- the UI should explain the pause reason or time range compactly when available
- the user must be able to understand why someone is not selected by default

Example:

```text
Teilnehmer
[x] Manu
[x] Anna
[x] Lukas

Pausiert an diesem Datum
[ ] Max - pausiert bis 07.08.
```

This behavior must follow the participant-selection logic already defined for active and paused members by date and activity. The screen should reflect the logic, not invent a different interpretation in UI copy.

### Save behavior

Saving creates a normal expense record with equal split as the MVP 1A default.

After save:

- the expense is created
- equal split is used for the selected participants
- a timeline event should exist once the backend and event model exist
- any balance preview can update afterward
- the user should ideally return to the previous context or see a short success message

MVP 1A does not require an additional confirmation step for normal expense creation.

### Deferred details

The following must not block the fast-save flow and belong after save or later scope:

- receipt photo
- category
- note
- location
- currency / exchange rate
- split types other than equal split
- OCR
- offline sync

## Empty state

### No group exists

Primary message:

- `Noch keine Gruppe vorhanden`

Support message:

- explain that an expense needs a group before it can be recorded

Primary action:

- create a group

### Group exists, but no activity beyond General

This is not a blocking error. The user can still save into `General`.

Message:

- explain that the default activity `General` is available now and additional activities can be created later

### No active participants on the selected date

Message:

- `Keine aktiven Teilnehmer an diesem Datum`

Support message:

- explain that all default participants are paused for the selected date and that paused participants can still be included manually

Primary action:

- reveal paused participants

### All participants paused

Message:

- `Alle Teilnehmer sind an diesem Datum pausiert`

Support message:

- explain that the user can still include someone manually if the expense should count despite the pause

### No participants selected

Message:

- `Keine Teilnehmer ausgewählt`

Support message:

- explain that at least one participant is required for equal split

## Error states

### Invalid amount

Examples:

- empty amount
- zero amount
- negative amount
- malformed decimal input

Requirements:

- block save
- show clear inline validation
- do not silently coerce invalid input into a saved value

### No group/activity selected

Requirements:

- block save
- explain that every expense must belong to a group and activity context

### No payer selected

Requirements:

- block save
- explain that the app must know who paid externally

### No participants selected

Requirements:

- block save
- explain that equal split needs at least one participant

### Participant status could not be loaded

Requirements:

- show that default participant selection may be incomplete or unavailable
- offer retry
- do not present guessed defaults as reliable truth

### Expense could not be saved

Requirements:

- keep the entered values in place where feasible
- show a retry path
- avoid implying that the expense exists if persistence failed

### Inconsistent equal-split data

Examples:

- duplicate selected participants
- resulting shares do not sum to the original amount in smallest currency unit
- missing activity participant mapping

Requirements:

- block save
- show a defensive error state instead of saving corrupt ledger data

## Privacy concerns

- The screen may expose names and participation status on casual glance; future versions may need privacy controls, but MVP 1A can remain straightforward.
- Pause notes or reasons may contain personal context, so the UI should keep them compact and avoid overexposing sensitive detail.
- Payment identifiers must not appear on this screen because they are unrelated to expense creation.
- If payer or participant data is loaded from backend storage later, sensitive identifiers such as phone numbers, email addresses, or payment links must not be shown as substitutes for display names.
- Receipt photo, location, and other sensitive enrichments are out of MVP 1A and must remain optional later.

## MVP 1A scope

Include:

- amount
- group/activity
- payer
- participants
- save action
- active-by-default participant selection based on date and activity
- paused participant visibility or reveal pattern
- manual inclusion of paused participants
- equal split only
- validation for amount, payer, context, and participant selection
- short success return or confirmation after save

Exclude:

- receipt photo
- category
- note
- location
- multi-currency
- exchange-rate logic
- OCR
- offline sync
- advanced split types
- payment execution or provider behavior
- any change to balance or participant-selection domain logic

## Later scope

- edit or enrich an expense after the initial save
- receipt capture and attachment handling
- category and note fields
- optional location
- multi-currency and exchange-rate snapshot handling
- split types beyond equal split
- OCR assistance
- offline capture and sync conflict handling
- better smart defaults based on history if proven useful
- explicit handling for payer-not-participant edge cases if product validation shows demand

## Example screen sketch

```text
Ausgabe erfassen

Betrag
[ 42,80 EUR ]

Gruppe / Aktivität
Portugal Reise · Abendessen

Bezahlt von
Manu

Teilnehmer
[x] Manu
[x] Anna
[x] Lukas

Pausiert an diesem Datum
[ ] Max - pausiert bis 07.08.

[Ausgabe speichern]
```

## Acceptance criteria

- The spec uses the screen-spec template sections from the index.
- The purpose states that normal expense entry should take about 5-10 seconds.
- The minimal visible MVP 1A fields are amount, group/activity, payer, participants, and save.
- The spec states `Save fast first, enrich later.` as the governing rule.
- The amount section states that UI input is decimal while core money logic uses integer values in the smallest currency unit.
- The spec states that zero and negative amounts are invalid and must be blocked before save.
- The payer defaults to the current user and can be changed within the selected group/activity participant set.
- The participant section states that default selection is based on active participants for the selected date and activity.
- The spec states that paused participants are not auto-selected, remain visible or reachable, and can be manually included.
- The spec states that `Alle aktiven auswählen` means active participants for the selected date and activity, not all group members.
- The spec includes the required empty states:
  - no group exists
  - group exists but only `General` is available
  - no active participants on the selected date
  - all participants paused
  - no participants selected
- The spec includes the required error states:
  - invalid amount
  - no group/activity selected
  - no payer selected
  - no participants selected
  - participant status could not be loaded
  - expense could not be saved
  - inconsistent equal-split data
- The spec explicitly keeps receipt photo, category, note, location, multi-currency, OCR, offline sync, and non-equal split types out of the fast-save MVP flow.
- The spec avoids payment-execution language and keeps the screen within the ledger product boundary.
