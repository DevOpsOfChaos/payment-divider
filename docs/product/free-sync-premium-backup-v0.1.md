# Free Sync and Premium Encrypted Backup v0.1

Status: product decision (issue #94), decided 2026-06-11. Closes the
sync/backup outlook left open in `mvp1b-boundary-v0.1.md` (#93).
Decision document only — no backend, backup or encryption implementation.
Amended 2026-06-12 (issue #126): the "local private" storage location is
decided for the alpha as **owner-private EU rows**, see the data-class table
and `docs/architecture/shared-alpha-backend-readiness.md` §2.1.

## Decision

Core collaboration must work in the free tier. Everything required for the
app to function between people — account, groups, shared expenses, shared
claims — syncs for free. Premium phase 1 sells comfort, never function:
encrypted full backup, multi-device convenience, easy restore.

## Framing (binding wording)

- Never say: "everything stays local" or "no cloud".
- Never say (since #126): "the server never sees private data" or
  "device-only" for the alpha — private unshared data is stored as
  owner-private rows on EU servers and is visible to no one but its owner.
- Correct: **private data is visible only to you; shared data is visible to
  its participants; everything lives on EU servers.** Sharing is always an
  explicit per-record action. Full backup is optional.
- A true device-only / local-first mode (private records never leave the
  device) remains a possible later mode, but is **not** an alpha promise.

## Data classes

| Class | Examples | Where it lives | Tier |
| --- | --- | --- | --- |
| **Owner-private** (decided #126; previously "local private") | external/invited counterparties and their names/aliases, unshared private claims, self-set reminders | owner-private rows on EU servers, RLS owner-only — visible to nobody but the owner; sharing stays an explicit per-record action. A device-only/local-first mode is a possible later option, not an alpha promise | — |
| **Device-only** | drafts, local demo data (session-only mock mode) | on device only, never sent anywhere | — |
| **Shared / synced** | account/profile, groups, memberships, invitations, activities, shared expenses, payment actions, claims that are shared with a linked counterparty | EU servers, RLS-scoped to participants (existing Supabase model) | **Free** |
| **Optional backup** | encrypted full snapshot including the owner-private class | EU servers, end-to-end encrypted, opaque to the server | **Premium phase 1** |

Boundary consequences:

- Sharing moves a record from "owner-private" to "shared/synced" explicitly
  (e.g. the per-claim `sharedWithCounterparty` flag); linking a person never
  auto-moves old data (rule from #88/#91, unchanged).
- Backup never changes visibility: an encrypted backup of private data does
  not share it with anyone — the server stores ciphertext it cannot read.

## Free tier (function — never behind premium)

- Auth / account
- Groups and group sync
- Activities sync
- Shared expenses sync
- Claims sync, when shared with a linked counterparty
- Memberships
- Invitations
- EU servers for all of the above

## Premium phase 1 (comfort — never function)

- Encrypted full backup of the device data, including owner-private records
- Multi-device convenience on top of the backup
- Simple restore (new device, reinstall)
- Explicitly **no** payment features in premium, ever: premium never gates
  or adds anything inside the payment/banking boundary of #93

Litmus test for future premium ideas: if removing it breaks settling up with
another person, it is function and belongs in free.

## Derived follow-up work (not in this issue)

1. Device transfer / restore flow design on top of encrypted backup.
2. Backup format and key handling decision (user-held key, E2E — design doc
   before any code).
3. Mapping the data classes onto the existing schema (audit: which tables are
   shared-by-design vs. owner-private; RLS already encodes most of it) —
   done in `docs/architecture/shared-alpha-backend-readiness.md` (#108),
   including the open local-private storage decision.

## Non-goals

- no backend/backup/encryption implementation in this issue
- no payment providers, banking, wallet, IBAN/PayPal storage (#93 boundary)
- no push, no contact book sync
- no premium gating of any core sync feature
