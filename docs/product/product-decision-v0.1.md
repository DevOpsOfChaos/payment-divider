# Product Decision v0.1

Status: working decision  
Date: 2026-06-09

## Positioning

Payment Divider is a European-first ledger app for shared expenses in recurring social groups.

It is designed for:

- trips with friends,
- short vacations,
- festivals,
- shared flats,
- couples and households,
- families,
- parties and events,
- long-lived friend groups with multiple activities over time.

It is not a payment provider, wallet, bank app, or household all-in-one app.

## Core thesis

The market already covers many hygiene features: groups, expenses, balances, multi-currency, offline support, exports, and receipt attachments in varying quality.

The product opportunity is the combination of:

1. long-lived groups,
2. activities inside those groups,
3. time-based participant availability,
4. very fast expense entry,
5. personal overview across all groups,
6. privacy-by-default visibility profiles,
7. payment-method visibility per group/activity,
8. modular growth without UI bloat.

## Core concepts

### Group

A group is the durable social space.

Examples:

- Friend group
- Shared flat
- Couple
- Family
- Festival crew

### Activity

An activity is a concrete ledger context inside a group.

Examples:

- Amsterdam Trip 2026
- Festival 2026
- Shared-flat consumables
- Furniture purchase
- General

Technical name: `GroupContext`  
Preferred UI name: `Activity`

Every group has a default activity called `General`.

## Navigation

Main navigation:

1. Overview
2. Groups
3. Add / Record
4. Inbox
5. Profile

## Payment boundary

MVP behavior is ledger-only.

Allowed:

- record expenses,
- calculate balances,
- show debts and receivables,
- mark external payments as paid,
- show/copy shared payment details,
- open external payment links,
- track internal confirmation status.

Not allowed in MVP:

- initiate payments,
- connect bank accounts,
- read transactions,
- hold funds,
- create wallet balances,
- offer e-money,
- automatically verify external payments,
- claim a payment succeeded without external confirmation or user/payee confirmation.

Product rule:

> Payments happen outside the app. The app records what is owed, suggested, marked, or confirmed.

## Privacy rules

- Phone number is optional.
- Contact book sync is optional and rejectable.
- Email is not automatically visible to group members.
- Payment methods are private by default.
- Users choose visibility when joining a group.
- Payment methods can be shared per group or activity.
- Sharing can be revoked.
- Deletion and export must be planned from the beginning.

Visibility profile candidates:

- Private
- Standard
- Payment-ready
- Close contacts
- Custom

## Participant availability

A member can remain part of a group while being excluded from default participant selection for a date range.

Paused participants:

- remain members,
- keep old debts and receivables,
- remain in history,
- can still settle balances,
- can be manually included in an expense,
- are not selected by `select all` during their paused period.

Rule:

> Select all means all active participants for the expense date and activity, not all group members.

## Fast expense entry

Minimal flow:

1. Amount
2. Group/activity
3. Payer
4. Participants
5. Save

Details after saving:

- receipt photo,
- category,
- note,
- location,
- currency,
- exchange rate,
- split type.

Rule:

> Save fast first, enrich later.

## Timeline vs Inbox

Timeline is history.

Inbox is action.

Timeline examples:

- expense created,
- expense changed,
- payment marked,
- payment confirmed,
- member joined,
- participant paused.

Inbox examples:

- confirm payment,
- accept invitation,
- choose visibility profile,
- resolve sync conflict,
- review payment-method sharing.

## MVP split

### MVP 1A: Ledger and structure core

Goal: prove that groups + activities + participant availability + fast balances are better than classic flat groups.

Includes:

- user account,
- friends by username/link,
- groups,
- activities inside groups,
- default `General` activity,
- members,
- simple role model,
- participant pauses,
- expense entry,
- equal split,
- balances globally/per group/per activity,
- external payment marking,
- timeline,
- personal overview,
- simple inbox.

Excludes:

- real payment-method sharing,
- multi-currency,
- offline sync,
- receipt photo,
- OCR,
- location,
- payment initiation.

### MVP 1B: Trust and payment-method core

Includes:

- visibility profiles,
- payment methods,
- IBAN,
- PayPal.me,
- Revolut link,
- Wise link,
- generic payment link,
- payment method visibility per group/activity,
- masking,
- encryption at rest once backend exists,
- revocation,
- export,
- deletion logic,
- basic notification preferences.

### MVP 2: Travel and Europe convenience

Includes:

- multi-currency,
- exchange-rate snapshot per expense,
- manual exchange rate,
- receipt photo,
- EXIF stripping,
- offline capture,
- sync queue,
- conflict display,
- country/date-based default currency,
- optional location per expense.

### MVP 3: Settlement workflow convenience

Includes:

- QR friend add,
- QR payment confirmation as ledger event,
- payee confirmation,
- internal payment request/reminder,
- recurring expenses,
- search/filter,
- digest notifications,
- improved activity archiving.

### Later

- OCR,
- provider-specific deep links,
- Wero/TWINT/Bizum/Tikkie-specific logic,
- shopping list,
- cleaning plan,
- festival tasks,
- real payment integration only after legal review and partner/licensing strategy.
