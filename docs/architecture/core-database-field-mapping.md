# Core-to-Database Field Mapping

Status: documentation of the current state, MVP 1A

Maps the shared domain types in `packages/core/src/domain-types.ts` to the SQL schema in `supabase/migrations/20260609220000_initial_mvp1a_schema.sql`. Documentation only; it does not change code or schema.

## Conventions

- TypeScript uses `camelCase`; SQL uses `snake_case`.
- Core `EntityId` is a string; SQL uses `uuid` primary keys.
- Core amounts are numbers interpreted as integer minor units (cents); SQL stores them as `amount_minor integer`.
- Core `currency`/`defaultCurrency` map to SQL `currency_code`/`default_currency_code` (3-letter ISO 4217).
- Core `ISODateString` maps to SQL `date`; `ISODateTimeString` maps to `timestamptz`.
- Optional core fields (`?`) map to nullable SQL columns.

## Table mapping

| Domain type | SQL table |
| --- | --- |
| `User` | `profiles` |
| `FriendConnection` | `friend_connections` |
| `Group` | `groups` |
| `GroupMember` | `group_members` |
| `GroupContext` (alias `Activity`) | `group_contexts` |
| `ContextMember` | `context_members` |
| `MemberAvailability` | `member_availability` |
| `Expense` | `expenses` |
| `ExpenseShare` | `expense_shares` |
| `PaymentAction` | `payment_actions` |
| `TimelineEvent` | `timeline_events` |
| `InboxItem` | `inbox_items` |

## Field mapping highlights

| Domain field | SQL column | Note |
| --- | --- | --- |
| `User.id` | `profiles.id` | references `auth.users(id)` |
| `User.displayName` | `profiles.display_name` | |
| `User.email`, `User.phone` | — | live in Supabase `auth.users`, not duplicated into `profiles` |
| `Group.defaultCurrency` | `groups.default_currency_code` | |
| `Group.createdBy` | `groups.created_by` | |
| `GroupMember.visibilityProfileId` | — | MVP 1B; not stored in MVP 1A schema |
| `GroupContext.defaultCurrency` | `group_contexts.default_currency_code` | |
| `ContextMember.defaultIncluded` | `context_members.default_included` | |
| `MemberAvailability.unavailableFrom` | `member_availability.unavailable_from` | |
| `Expense.amount` | `expenses.amount_minor` | integer minor units |
| `Expense.currency` | `expenses.currency_code` | |
| `Expense.date` | `expenses.expense_date` | renamed; `date` is reserved-ish in SQL |
| `Expense.paidByUserId` | `expenses.paid_by_user_id` | |
| `ExpenseShare.amount` | `expense_shares.amount_minor` | |
| `PaymentAction.status` | `payment_actions.status` | `suggested` / `marked_paid` / `confirmed` / `rejected` |
| `PaymentAction.paymentMethodId` | — | deferred to MVP 1B; no payment-method storage exists in the schema |
| `TimelineEvent.actorUserId` | `timeline_events.actor_user_id` | nullable in SQL (`on delete set null`); required in TS |
| `InboxItem.relatedEntityType` | `inbox_items.related_entity_type` | nullable in SQL; required in TS |

`payment_actions` remain ledger-only in both layers: status changes record what users marked or confirmed outside the app and never imply payment execution.

## Known divergences (TS vs SQL enums)

These check constraints and union types drifted apart and should be reconciled in a future issue:

| Concept | TypeScript union | SQL check constraint |
| --- | --- | --- |
| `FriendConnectionStatus` | `pending, accepted, declined, blocked` | `pending, accepted, blocked, rejected` (`declined` vs `rejected`) |
| `GroupType` | `friends, trip, shared_flat, couple, family, event, custom` | `friends, shared_flat, trip, couple, family, other` (`event`/`custom` vs `other`) |
| `GroupMemberRole` | `owner, admin, member` | `admin, member` (no `owner`) |
| `GroupContextType` | `general, trip, event, household, purchase, custom` | `general, trip, event, recurring, other` |
| `MemberAvailabilityMode` | `paused, available` | `unavailable, paused` (no overlap on the second value) |
| `ExpenseShareType` | `equal, fixed` | `equal, exact` (`fixed` vs `exact`) |

Other structural differences:

- `profiles`, `friend_connections`, and `expenses` carry an `updated_at` column (trigger-maintained) that the core types do not expose.
- `group_contexts` has `created_at` in SQL but not in the TS type.
- TS `User` carries `email`/`phone` that the SQL `profiles` table intentionally does not store.

Reconciling these unions/constraints is tracked as follow-up work; until then, code that bridges core types and the database must translate the diverging enum values explicitly.
