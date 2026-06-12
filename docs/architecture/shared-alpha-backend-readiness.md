# Shared Alpha Backend Readiness v0.1

Status: audit (issue #108), written 2026-06-12. Audit and gap list only —
no production setup, no real Supabase project was created, no secrets exist.
Product basis: `docs/product/free-sync-premium-backup-v0.1.md` (#94),
`docs/product/mvp1b-boundary-v0.1.md` (#93). The app stays ledger-only:
no payment providers, no payment execution, no banking/wallet, no
IBAN/PayPal storage — also and especially on a shared backend.

## 1. Region decision

- Target per #94: **shared and synced data lives on EU servers.**
- Current state: **no shared Supabase project exists.** All work so far runs
  against the local stack (`docs/development/supabase-local.md`); there is no
  project ref, no link, no token anywhere in the repo (deliberate boundary).
- Consequence: the EU promise is **not yet verifiable** — there is nothing to
  verify against. This is a **blocker to-do, not a fulfilled promise**:
  - [ ] Create the alpha Supabase project explicitly in an EU region
    (e.g. `eu-central-1`); the region choice is made at project creation and
    is not freely movable afterwards.
  - [ ] Document project region in this file once it exists, with the date
    it was checked.
  - EU region must be confirmed **before** any shared-alpha invite goes out.

## 2. Data-class audit (all 18 tables)

Classes from #94: **local private** (device only unless shared/synced),
**shared/synced** (EU servers, RLS-scoped, free tier), **optional backup**
(premium, E2E-encrypted, later, #109), **dev/technical**.

| Table | Class per #94 | Today (supabase-local) | Fit |
| --- | --- | --- | --- |
| `profiles` | shared/synced (account) | server | ✓ |
| `friend_connections` | shared/synced (planned) | server, **no write path, no UI** | dev-only today |
| `groups` | shared/synced | server | ✓ |
| `group_members` | shared/synced (memberships) | server | ✓ |
| `group_contexts` (activities) | shared/synced | server | ✓ |
| `context_members` | shared/synced | server | ✓ |
| `member_availability` | shared/synced | server, **seed-only writes** | partial |
| `expenses` | shared/synced | server | ✓ |
| `expense_shares` | shared/synced | server | ✓ |
| `payment_actions` | shared/synced (ledger records only) | server | ✓ |
| `timeline_events` | shared/synced | server | ✓ |
| `inbox_items` | shared/synced | server, **no resolve/update path** | partial |
| `counterparties` | **local private** (names of external/invited persons) | **server**, RLS owner-only | ⚠ see 2.1 |
| `counterparty_aliases` | **local private** | **server**, RLS owner-only | ⚠ see 2.1 |
| `claims` (unshared) | **local private** | **server**, RLS creator-only | ⚠ see 2.1 |
| `claims` (`shared_with_counterparty = true`, linked) | shared/synced | server, RLS participant-scoped | ✓ |
| `claim_payments` / `claim_events` | follow their claim's class | server, RLS via claim participant | ⚠ for private claims, see 2.1 |
| `claim_reminders` | **local private** (strictly personal) | **server**, RLS owner-only | ⚠ see 2.1 |

Invitations and cost-plan tables do not exist yet (invite flow is a later
issue; cost plans land with #112) — they are listed in #94 as shared/synced
and must be classified in this file when their schema arrives.

### 2.1 Finding: local-private data is currently server-stored

Issue #94 says local-private data lives "on device only; the server never sees it
unless the user shares or enables backup". The current implementation stores
the entire local-private class (external/invited counterparties incl. names,
unshared claims, reminders) **in Supabase**, protected by owner-only RLS.
Harmless against a local stack on the developer's own machine — **not
compatible with the #94 wording once the backend is shared.**

Before shared alpha, one of two resolutions must be decided explicitly
(tracked as issue #126):

- **(a) Device-local persistence + selective sync**: unshared
  counterparties/claims/reminders persist on the device; only shared claims
  (and the minimal counterparty link data they need) sync. Honors #94
  verbatim; significant work (local store, sync boundary, conflict rules).
- **(b) Revise the promise for alpha**: owner-private rows live on EU
  servers, RLS-scoped to the owner, sharing stays explicit per claim. Honest
  wording would become "private data is visible only to you; shared data is
  visible to participants; everything lives on EU servers". Requires
  updating #94/#93 wording and all UI copy that implies device-only storage.

Until decided, no shared-alpha invite: shipping (b) silently while #94
promises (a) would break the privacy framing.

## 3. RLS cross-check (who reads/writes, gaps)

Authority: migrations `20260609223000` (baseline selects),
`20260611100000` (controlled writes), `20260611120000` (payment-action
transitions), `20260611140000`/`20260612090000`/`20260612120000`/
`20260612130000` (claims/counterparties incl. server-side status
transitions). `authenticated` has only select/insert/update grants —
**no DELETE anywhere** (deliberate; dispute/rejection never deletes).
Smoke: `supabase/tests/rls_smoke_test.sql`, 33 assertions
(`pnpm db:rls-test`).

| Table | Read | Write | Fits class | Smoke |
| --- | --- | --- | --- | --- |
| `profiles` | own + fellow group members | insert/update own | ✓ | indirect only |
| `friend_connections` | participants | **none** | table unused — decide keep/drop before alpha | none |
| `groups` | members | insert as creator | ✓ | ✓ |
| `group_members` | fellow members | insert self-as-creator / by admin; **no leave/role-change** | OK for alpha (invite flow later) | ✓ (visibility) |
| `group_contexts` | members | insert members, update admin | ✓ | indirect |
| `context_members` | members | **none** (seed only) | gap: participation not editable | none |
| `member_availability` | members | **none** (seed only) | gap: pause not editable | none |
| `expenses` | members | insert members; **no update** → `deleted_at` unreachable from client | OK-ish; soft-delete path missing | ✓ |
| `expense_shares` | members | insert members | ✓ | indirect |
| `payment_actions` | members | insert involved; status transitions payer/payee via trigger-checked policies | ✓ | ✓ |
| `timeline_events` | members | insert members (best effort) | ✓ | indirect |
| `inbox_items` | own | insert own; **no update** → cannot resolve | gap | none |
| `counterparties` | own | insert/update own | ✓ (owner-private) | ✓ |
| `counterparty_aliases` | own (via owner check) | insert/update own | ✓ | indirect |
| `claims` | creator inline + shared linked counterparty (security-definer helper) | insert own; update participants, counterparty status-only (trigger), transitions server-enforced (#106, parity-checked) | ✓ | ✓ (incl. #119 RETURNING regression) |
| `claim_payments` | participants | insert as self; cores immutable (trigger) | ✓ | ✓ |
| `claim_events` | participants | insert as acting user | ✓ | ✓ |
| `claim_reminders` | own only | insert/update own only | ✓ (strictly personal) | ✓ |

Dev-session special logic: none in SQL — the dev session
(`apps/mobile/src/services/dev-session.ts`) is a fixed local test user that
signs up through normal auth and passes the normal policies. Nothing to
remove from the database for alpha; the **client** code path (fixed
credentials, Profile-tab button) must be disabled/removed for any shared
deployment.

## 4. Alpha gap list

| Gap | What is needed | Class |
| --- | --- | --- |
| Local-private storage decision (2.1) | decide (a) device-local + selective sync vs (b) revised promise; update #93/#94 + UI copy accordingly (#126) | **Blocker** |
| Supabase project region | create alpha project in EU region, document here | **Blocker** |
| Real auth | replace dev session: real sign-up/sign-in (e-mail+password or magic link), remove fixed credentials path from shared builds | **Blocker** |
| Secrets handling | env separation: local `.env` stays gitignored; shared project URL/publishable key distribution for testers; service keys never in repo/app | **Blocker** |
| Migration deploy path | defined way to apply `supabase/migrations/` to the shared project (CLI `db push` from a maintainer machine or CI job with scoped token — decision + doc) | **Blocker** |
| RLS verification against shared project | run the smoke suite (or an equivalent seeded check) once against the alpha project before invites; local 33/33 is necessary but not sufficient | **Blocker** |
| Seed/test data concept | shared project starts empty; no demo seed on shared DB; testers create real data — document expectations | Can follow |
| RLS smoke gaps (see 3) | add cases for profiles visibility, inbox ownership, context_members/member_availability once they get write paths (#127) | Can follow |
| Unused/partial tables | decide keep/drop `friend_connections`; write paths for `context_members`, `member_availability`, `inbox_items` resolve, expense soft-delete (#127) | Can follow |
| Backup/key handling | stays #109 (premium, E2E) — explicitly **not** alpha | Not in alpha |
| Push, contact book, offline sync, payment anything | excluded by #93 boundary | Not in alpha |

## 5. Blockers vs. non-blockers (summary)

**Blockers for shared alpha** (in order):

1. Local-private storage decision (2.1, #126) — product decision first.
2. EU region confirmed at project creation.
3. Real auth replacing the dev session.
4. Secrets/env separation for shared config.
5. Migration deploy path.
6. RLS smoke (or equivalent) green against the shared project.

**Can follow during alpha**: seed/testdata doc, additional smoke cases,
write paths for participation/availability/inbox resolve, friend_connections
decision, expense soft-delete path.

**Deliberately not part of alpha**: encrypted backup & key handling (#109),
premium features, push/notifications, contact book, offline sync, public
alpha, anything inside the payment/banking boundary.
