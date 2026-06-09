# Group Detail Screen Specification

Status: draft  
Scope: MVP 1A

## Purpose

Define the group detail screen as the durable social-space view for a long-lived group.

The screen must make the core product model legible:

> dauerhafte Gruppe -> mehrere Aktivitäten -> Ausgaben, Zahlungen und Teilnehmerstatus innerhalb der Aktivität

The screen must answer:

- which activities exist in this group,
- what the user's balance is in this group,
- who belongs to the group,
- which open actions need attention,
- where the user can quickly record an expense,
- where activity and member management will later live.

The screen must stay ledger-oriented. It must not imply that money moves inside the app.

## User goal

The user wants to open a group and understand, within a few seconds:

- the group's current ledger state,
- which activities matter,
- how their own balance breaks down across those activities,
- which members exist at the group level,
- which actions are still unresolved.

## Entry points

- Groups list
- Personal overview group-attention entry
- Recent activity or timeline item that links back to the group
- Post-create flow after creating a new group
- Return flow from activity detail, expense entry, inbox, or payment-marking flows

## Primary actions

- Open an activity detail screen
- Open group balance details
- Open members list or member details
- Open open-action details
- Open recent group timeline
- Record an expense in this group
- Create an activity
- Show members

Later actions may include:

- Pause a participant
- Open group settings

Preferred copy examples:

- `Ausgabe erfassen`
- `Aktivität erstellen`
- `Mitglieder anzeigen`
- `Saldo anzeigen`
- `Details anzeigen`

Avoid copy such as:

- `Jetzt bezahlen`
- `Geld senden`
- `Zahlung ausführen`
- `Überweisung starten`

## Data shown

### Group header

Show the durable group identity.

Required elements:

- group name,
- optional group type label,
- optional compact member count,
- optional compact default currency hint if useful.

The header should frame the group as the stable container above activities.

### Group balance summary

Show the user's balance for the whole group, not just one activity.

Required language:

- positive: `Du bekommst`
- negative: `Du schuldest`
- zero: `Alles ausgeglichen`

The summary should include:

- net balance in the group,
- short helper text if needed,
- entry point to balance details,
- optional compact note that activity balances roll up into this group summary.

This section must not suggest settlement execution inside the app.

### Activities list

Show the activities that belong to the group, including the default activity `General`.

Each activity row should include:

- activity name,
- type or compact label if present,
- date range if present,
- user's balance in that activity,
- open actions or warnings if present,
- optional compact active/paused participant hint.

The list should make it obvious that:

- every group has a default activity,
- additional activities represent concrete ledger contexts,
- activity balances are scoped and do not replace the group-level balance.

Example row shapes:

- `Allgemein · Du schuldest 8,00 €`
- `Amsterdam 2026 · 01.08.-07.08. · Du bekommst 50,00 €`
- `Festival 2026 · Alles ausgeglichen`

### Members summary

Show group membership as a stable layer above activity participation.

Required concepts:

- group members belong to the group even if they are paused in one activity,
- activities can have active and paused participants that differ from overall group membership,
- paused members remain members and keep history and balances.

For MVP 1A, this can be a compact summary rather than a full management screen.

The section should include:

- member names,
- compact count,
- compact pause hint when relevant,
- entry point into a fuller member list later.

### Open actions preview

Show unresolved group-relevant actions only, not raw history.

Examples:

- payment confirmation pending,
- invitation acceptance pending,
- participant-status-related attention if it becomes an inbox item.

The preview should include:

- action summary,
- total count,
- related person or activity when relevant,
- entry point into inbox or detail.

### Recent group timeline preview

Show a short history preview for this group.

Examples:

- expense created,
- payment marked,
- payment confirmed,
- participant paused,
- activity created.

Each row should include:

- actor,
- concise event text,
- related activity when relevant,
- short date label.

This is informational. It must not replace inbox actions.

### Quick actions

Required quick actions for MVP 1A:

- `Ausgabe erfassen`
- `Aktivität erstellen`
- `Mitglieder anzeigen`

Reserved later actions:

- `Teilnehmer pausieren`
- `Einstellungen`

If the user launches expense entry from this screen, the group should be preselected.

## Empty state

### Group has only `General`

This is valid and expected.

Message:

- explain that every group starts with the default activity `General`
- explain that additional activities can be created later when needed

Primary action:

- `Aktivität erstellen`

### Group has members but no expenses yet

Message:

- `Noch keine Ausgaben erfasst`

Support message:

- explain that balances and activity history will appear after the first recorded expense

Primary action:

- `Ausgabe erfassen`

### No open actions

Message:

- `Keine offenen Aktionen`

Support message:

- explain that confirmations or invitations will appear here when needed

### No recent activity

Message:

- `Noch keine letzte Aktivität`

Support message:

- explain that timeline events appear after expenses, payment markings, or participant changes

## Error states

### Group data could not be loaded

Requirements:

- clear loading failure copy,
- retry action,
- do not show guessed group identity as confirmed truth.

### Activities could not be loaded

Requirements:

- show that the group exists but activity list is unavailable,
- offer retry,
- avoid pretending `General` or other activities are confirmed if the fetch failed.

### Balance could not be calculated

Requirements:

- do not invent or cache-forward a balance without labeling it,
- provide retry,
- keep navigation to other recoverable sections if possible.

### Inconsistent membership or activity data

Examples:

- activity references missing group members,
- paused-state data conflicts with activity participation,
- balance rows point to missing activities.

Requirements:

- explain that the group view cannot be shown reliably,
- avoid showing misleading counts or balances,
- provide retry and future support path.

## Privacy concerns

- Group balances and member status may be visible on casual glance; later versions may need amount hiding.
- Do not show full IBANs, payment links, phone numbers, or email addresses on this screen.
- Pause notes or status hints may reveal personal context and should stay compact.
- Open-action and timeline previews must not expose raw payment identifiers.
- If payment-method visibility hints appear later, they should remain summary-level and masked.

## MVP 1A scope

Include:

- group header,
- group balance summary,
- activities list,
- members summary,
- open actions preview,
- recent group timeline preview,
- quick actions for expense entry, activity creation, and member access,
- explicit explanation that activities are scoped contexts inside a durable group,
- default activity `General`.

Exclude:

- payment initiation,
- bank or provider integrations,
- activity settings management UI,
- participant-pause management UI as a full flow,
- payment-method visibility surfaces,
- multi-currency handling,
- offline or sync-conflict UI,
- archived-activity management.

## Later scope

- full member management
- participant pause management
- group settings and permissions
- activity archiving
- richer filters for activity list and timeline
- payment-method visibility hints per group or activity
- multi-currency summaries
- hidden or blurred amounts

## Example screen sketch

```text
Freundeskreis

Saldo in dieser Gruppe
Du bekommst 42,00 €

Aktivitäten
Allgemein · Du schuldest 8,00 €
Amsterdam 2026 · Du bekommst 50,00 €
Festival 2026 · ausgeglichen

Mitglieder
Manu, Anna, Lukas, Max
Max pausiert in Amsterdam 2026 bis 07.08.

Offene Aktionen
1 Zahlung bestätigen

[Ausgabe erfassen] [Aktivität erstellen]
```

## Acceptance criteria

- The spec uses the screen-spec template sections from the index.
- The purpose defines the group as the durable social space above activities.
- The spec states that the screen must answer which activities exist, what the user's group balance is, who the members are, and which open actions exist.
- The screen includes the required main sections:
  - group header
  - group balance summary
  - activities list
  - members summary
  - open actions preview
  - recent group timeline preview
  - quick actions
- The quick actions include at least `Ausgabe erfassen`, `Aktivität erstellen`, and `Mitglieder anzeigen`.
- The activities list states that each row should show name, type or label if present, period if present, the user's balance, and open-action or warning hints.
- The members section explicitly states that paused members remain group members and keep history and balances.
- The spec includes the required empty states:
  - group has only `General`
  - group has members but no expenses
  - no open actions
  - no recent activity
- The spec includes the required error states:
  - group data failed to load
  - activities failed to load
  - balance failed to calculate
  - inconsistent membership or activity data
- The spec stays within the ledger-only boundary and avoids payment-execution language.

