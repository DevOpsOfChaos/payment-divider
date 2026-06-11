# Free Sync and Premium Encrypted Backup v0.1

Status: product decision (issue #94), decided 2026-06-11. Closes the
sync/backup outlook left open in `mvp1b-boundary-v0.1.md` (#93).
Decision document only — no backend, backup or encryption implementation.

## Decision

Core collaboration must work in the free tier. Everything required for the
app to function between people — account, groups, shared expenses, shared
claims — syncs for free. Premium phase 1 sells comfort, never function:
encrypted full backup, multi-device convenience, easy restore.

## Framing (binding wording)

- Never say: "everything stays local" or "no cloud".
- Correct: **private local data stays local unless it is shared or synced.**
  Shared data is synchronized because the app cannot work otherwise.
  Full backup is optional.
- Shared and synced data lives on EU servers.

## Data classes

| Class | Examples | Where it lives | Tier |
| --- | --- | --- | --- |
| **Local private** | external/invited counterparties and their names/aliases, unshared private claims, self-set reminders, drafts, local demo data | on device only; server never sees it unless the user shares or enables backup | — |
| **Shared / synced** | account/profile, groups, memberships, invitations, activities, shared expenses, payment actions, claims that are shared with a linked counterparty | EU servers, RLS-scoped to participants (existing Supabase model) | **Free** |
| **Optional backup** | encrypted full snapshot including the local-private class | EU servers, end-to-end encrypted, opaque to the server | **Premium phase 1** |

Boundary consequences:

- Sharing moves a record from "local private" to "shared/synced" explicitly
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

- Encrypted full backup of the device data, including local-private records
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
   shared-by-design vs. owner-private; RLS already encodes most of it).

## Non-goals

- no backend/backup/encryption implementation in this issue
- no payment providers, banking, wallet, IBAN/PayPal storage (#93 boundary)
- no push, no contact book sync
- no premium gating of any core sync feature
