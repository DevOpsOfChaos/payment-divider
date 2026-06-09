# Database Schema v0.1

Status: initial MVP 1A schema

## Covered

The first Supabase/PostgreSQL migration creates the MVP 1A ledger foundation:

- profiles compatible with Supabase Auth users
- friend connections
- groups and group members
- group contexts, shown as activities in the product
- activity members and member availability ranges
- expenses and expense shares using integer minor currency units
- ledger-only payment actions
- timeline events
- inbox items

Amounts use `amount_minor integer` and currencies use 3-letter `currency_code` values. Tables use UUID primary keys, foreign keys, check constraints, timestamps, and query indexes for group, context, user, timeline, and inbox lookups.

## Boundaries

`payment_actions` are ledger-only records. They track suggested, marked, confirmed, or rejected external settlement states inside the app ledger. They do not initiate payments, connect to providers, hold funds, import bank data, or claim provider-verified payment success.

The schema deliberately omits `payment_method_id` and all payment-method storage. Payment methods and visibility profiles belong to MVP 1B.

RLS is enabled on the MVP 1A tables, but policies are intentionally deferred to a later issue.

Later scopes also exclude storage for attachments, place metadata, offline sync queues, exchange-rate snapshots, and provider-specific payment behavior.
