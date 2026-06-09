# MVP Scope

## MVP 1A: Ledger and structure core

### Goal

Prove the core model:

> Long-lived groups with activities, participant availability, fast expense entry, and clear balances.

### Included

- User account placeholder / profile model
- Friends by username or invite link
- Groups
- Activities within groups (`GroupContext`)
- Default activity `General`
- Group members
- Activity participants
- Member availability / participant pause
- Expense entry
- Equal split
- Balances across all groups
- Balances per group
- Balances per activity
- External payment marking
- Timeline
- Personal overview
- Simple inbox

### Excluded

- Payment initiation
- Bank account connection
- Account information access
- Wallet / funds holding
- Real payment-method sharing
- Multi-currency
- Exchange-rate API
- Receipt photos
- OCR
- Location
- Offline sync
- Push notifications beyond placeholders
- Shopping lists
- Cleaning plans
- Festival tasks

### Acceptance criteria for MVP 1A

- A user can create a group.
- A group automatically has a `General` activity.
- A user can create another activity within a group.
- A user can add/select group members from mock or real friend records.
- A user can pause a participant for a date range.
- The expense flow defaults to active participants for the selected date and activity.
- Paused participants are not selected by default but can be manually included.
- The app calculates equal-split balances correctly.
- A user can mark a payment as externally paid.
- Timeline records expense/payment/member-availability events.
- Inbox shows action items only, not raw history.

## MVP 1B: Trust and payment-method core

### Included

- Visibility profiles
- PaymentMethod model
- PaymentMethodVisibility model
- IBAN
- PayPal.me
- Revolut link
- Wise link
- Generic payment link
- Masked identifiers
- Revocation
- Export/deletion concept
- Basic notification preferences

### Excluded

- Payment initiation
- Provider APIs
- Bank APIs
- Automatic payment verification

## MVP 2: Travel and Europe convenience

- Multi-currency
- Exchange-rate snapshots
- Manual rates
- Receipt photos
- EXIF stripping
- Offline capture
- Sync queue
- Conflict display
- Country/date-based default currency
- Optional location

## MVP 3: Settlement workflow convenience

- QR friend add
- QR payment confirmation as ledger event
- Payee confirmation
- Internal payment requests/reminders
- Recurring expenses
- Search/filter
- Digest notifications

## Not planned before validation

- OCR
- Provider-specific payment deep integrations
- Real payment initiation
- Open Banking
- Wallet/e-money
- Shopping list
- Cleaning plan
- Festival tasks
- AI categorization
