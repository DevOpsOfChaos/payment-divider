# Data Model v0.1

Status: draft  
Purpose: MVP 1A/1B planning baseline, not final schema.

## Core entities

### User

```text
User
- id
- display_name
- username
- email
- phone optional
- created_at
- deleted_at optional
```

### FriendConnection

```text
FriendConnection
- id
- requester_user_id
- addressee_user_id
- status
- created_at
- accepted_at optional
```

### Group

```text
Group
- id
- name
- type
- default_currency
- created_by
- created_at
- archived_at optional
```

### GroupMember

```text
GroupMember
- id
- group_id
- user_id
- role
- joined_at
- left_at optional
- visibility_profile_id optional
```

### GroupContext

UI name: Activity

```text
GroupContext
- id
- group_id
- name
- type
- start_date optional
- end_date optional
- default_currency optional
- archived_at optional
```

### ContextMember

```text
ContextMember
- id
- context_id
- user_id
- default_included
- joined_at
```

### MemberAvailability

Controls default participant selection. Does not delete membership or historical balances.

```text
MemberAvailability
- id
- group_id
- context_id optional
- user_id
- unavailable_from
- unavailable_until optional
- mode
- note optional
- affects_default_selection
- created_by
- created_at
```

### Expense

```text
Expense
- id
- group_id
- context_id
- amount
- currency
- paid_by_user_id
- date
- title optional
- note optional
- created_by
- created_at
- updated_at
- deleted_at optional
```

### ExpenseShare

```text
ExpenseShare
- id
- expense_id
- user_id
- share_type
- amount
- currency
```

### PaymentAction

Ledger event only. It does not execute payment.

```text
PaymentAction
- id
- group_id
- context_id optional
- payer_id
- payee_id
- amount
- currency
- status
- payment_method_id optional
- created_at
- marked_paid_at optional
- confirmed_by_payee_at optional
- rejected_at optional
```

### TimelineEvent

```text
TimelineEvent
- id
- group_id
- context_id optional
- actor_user_id
- event_type
- entity_type
- entity_id
- created_at
```

### InboxItem

```text
InboxItem
- id
- user_id
- group_id optional
- context_id optional
- type
- status
- related_entity_type
- related_entity_id
- created_at
- resolved_at optional
```

## Trust/payment entities for MVP 1B

### VisibilityProfile

```text
VisibilityProfile
- id
- user_id
- name
- profile_type
- visible_fields
- created_at
- updated_at
```

### PaymentMethod

```text
PaymentMethod
- id
- user_id
- provider_type
- display_name
- identifier_type
- masked_identifier
- encrypted_identifier
- payment_url optional
- instructions optional
- created_at
- revoked_at optional
- deleted_at optional
```

### PaymentMethodVisibility

```text
PaymentMethodVisibility
- id
- payment_method_id
- group_id
- context_id optional
- visibility_status
- visible_to_member_ids optional
- created_at
- revoked_at optional
```

## Important rules

- `GroupContext` is the technical name; UI should say `Activity` unless product copy changes.
- `MemberAvailability` affects default selection only.
- Payment identifiers must not be fully logged.
- `PaymentAction` is a ledger state object; it must not imply external payment success without confirmation.
- Historical records must remain understandable even if a payment method is later revoked or deleted.
