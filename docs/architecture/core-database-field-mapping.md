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
| `Claim` | `claims` |
| `ClaimPayment` | `claim_payments` |
| `ClaimEvent` | `claim_events` |
| (reminder metadata, core type pending) | `claim_reminders` |
| `Counterparty` | `counterparties` |
| `CounterpartyAlias` | `counterparty_aliases` |

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
| `Claim.amount` | `claims.amount_minor` | integer minor units |
| `Claim.currency` | `claims.currency_code` | |
| `Claim.creatorUserId` | `claims.creator_user_id` | |
| `Claim.counterpartyId` | `claims.counterparty_id` | stable reference into `counterparties` |
| `Claim.sharedWithCounterparty` | `claims.shared_with_counterparty` | creator-controlled privacy gate; linking never flips it |
| `Counterparty.kind` | `counterparties.kind` | `app_user` requires `linked_user_id`, others forbid it |
| `Counterparty.normalizedName` | `counterparties.normalized_name` | duplicate-suggestion basis |
| `ClaimPayment.confirmationStatus` | `claim_payments.confirmation_status` | `recorded / pending_confirmation / confirmed / rejected` |

`payment_actions` remain ledger-only in both layers: status changes record what users marked or confirmed outside the app and never imply payment execution.

## Enum values (reconciled)

The migration `20260611090000_reconcile_core_enum_values.sql` aligned all SQL check constraints with the TypeScript unions; the TypeScript unions are the domain source of truth. Current shared values:

| Concept | Shared values (TS union = SQL check) |
| --- | --- |
| `FriendConnectionStatus` | `pending, accepted, declined, blocked` |
| `GroupType` | `friends, trip, shared_flat, couple, family, event, custom` |
| `GroupMemberRole` | `owner, admin, member` |
| `GroupContextType` | `general, trip, event, household, purchase, custom` |
| `MemberAvailabilityMode` | `paused, available` |
| `ExpenseShareType` | `equal, fixed` |
| `PaymentActionStatus` | `suggested, marked_paid, confirmed, rejected` |

Legacy SQL-only values were remapped in the migration: `rejected`→`declined` (friend connections), `other`→`custom` (groups), `recurring`/`other`→`custom` (contexts), `unavailable`→`paused` (availability), `exact`→`fixed` (shares).

Other structural differences:

- `profiles`, `friend_connections`, and `expenses` carry an `updated_at` column (trigger-maintained) that the core types do not expose.
- `group_contexts` has `created_at` in SQL but not in the TS type.
- TS `User` carries `email`/`phone` that the SQL `profiles` table intentionally does not store.

These structural gaps are intentional for MVP 1A; enum values no longer diverge.
