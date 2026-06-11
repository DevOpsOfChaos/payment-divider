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

RLS is enabled on the MVP 1A tables. The baseline policy migration adds authenticated self-access for profiles, participant-only friend connection reads, group-member reads for group-scoped ledger data, and own-user reads for inbox items.

Later scopes also exclude storage for attachments, place metadata, offline sync queues, exchange-rate snapshots, and provider-specific payment behavior.

## Baseline RLS policies

The first RLS policy migration keeps access conservative:

- users can read and update their own `profiles` row
- active group members can read minimal profile rows for other active members in shared groups
- friend connections are readable only by the requester or addressee
- groups, group members, group contexts, context members, member availability, expenses, expense shares, payment actions, and timeline events are readable only by current members of the related group
- inbox items are readable only by the owning user

Current group membership means a matching `group_members` row with `user_id = auth.uid()` and `left_at is null`. Small stable security-definer helper functions centralize this membership check and avoid recursive RLS policy lookups.

A follow-up migration (`20260611100000_controlled_mvp1a_write_policies.sql`) adds controlled write policies: own-profile insert, group creation by the creator, initial creator membership plus admin-managed member inserts, activity creation by members and updates by owners/admins, expense and expense-share inserts by active members, ledger-only payment-action inserts restricted to an involved party, timeline appends by the acting member, and own-inbox inserts. It also adds `is_group_creator` and `is_group_admin` security-definer helpers.

A further migration (`20260611120000_payment_action_status_transitions.sql`) enables the two ledger-only payment-action transitions: the payer may update their own `suggested` action to `marked_paid`, and the payee may update a `marked_paid` action to `confirmed` or `rejected`. A before-update trigger keeps every non-status column immutable, fills the matching status timestamp, and rejects any other transition. These updates document externally settled payments only; they never initiate, execute, or verify a payment.

Still deferred until the corresponding application flows are designed: membership changes beyond creation, availability edits, inbox resolution updates, and all delete policies.

`payment_actions` remain ledger-only records. They do not initiate payments, connect providers, hold funds, import bank data, verify external settlement, or store payment methods.

Payment methods, visibility profiles, receipts, location data, storage buckets, offline sync, and provider-specific behavior remain out of the MVP 1A schema.

## Enum reconciliation

A follow-up migration (`20260611090000_reconcile_core_enum_values.sql`) aligns all text check-constraint values with the core TypeScript unions and remaps legacy values. The TypeScript unions are the source of truth for enum values.

## Core type mapping

How the shared core domain types map to these tables and columns, including known enum divergences, is documented in `docs/architecture/core-database-field-mapping.md`.

## Local validation

Migrations are validated locally with the Supabase CLI (`supabase db lint`, `supabase db reset`) against a Docker-based local stack, never against a live project. See `docs/development/supabase-local.md`.
