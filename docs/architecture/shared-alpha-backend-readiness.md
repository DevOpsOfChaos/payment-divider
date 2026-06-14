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

### 2.1 Decision (#126): owner-private EU rows for the alpha

Decided 2026-06-12 (issue #126). Original finding: issue #94 said
local-private data lives "on device only; the server never sees it unless
the user shares or enables backup", while the implementation stores this
class (external/invited counterparties incl. names, unshared claims,
reminders) in Supabase under owner-only RLS.

**Decision: variant (b) — owner-private EU rows are allowed for the shared
alpha**, under these binding conditions:

- Project region is EU, or this stays an open blocker until confirmed
  (section 1 — unchanged).
- RLS stays strictly owner-only for this class (counterparties, aliases,
  unshared claims and their payments/events, reminders) — smoke-tested.
- Sharing stays an explicit per-claim action (`shared_with_counterparty`);
  linking a person never auto-exposes old records.
- UI and docs never claim private unshared data is device-only / "the
  server never sees it"; binding wording is "private data is visible only
  to you; shared data is visible to its participants; everything lives on
  EU servers" (`free-sync-premium-backup-v0.1.md`, amended).
- A true device-only/local-first mode stays a possible later option
  (#129), not an alpha promise. No local-first rebuild, no local sync or
  conflict system now.

The ⚠ rows in the table above are therefore resolved for the alpha: the
owner-private class lives server-side by decision, and the class formerly
called "local private" is renamed to **owner-private** in #94; only
drafts/demo data remain genuinely device-only.

## 3. RLS cross-check (who reads/writes, gaps)

Authority: migrations `20260609223000` (baseline selects),
`20260611100000` (controlled writes), `20260611120000` (payment-action
transitions), `20260611140000`/`20260612090000`/`20260612120000`/
`20260612130000` (claims/counterparties incl. server-side status
transitions). `authenticated` has only select/insert/update grants —
**no DELETE anywhere** (deliberate; dispute/rejection never deletes).
Smoke: `supabase/tests/rls_smoke_test.sql`, 43 assertions
(`pnpm db:rls-test`, count as of #127).

| Table | Read | Write | Fits class | Smoke |
| --- | --- | --- | --- | --- |
| `profiles` | own + fellow group members | insert/update own | ✓ | ✓ (#127) |
| `friend_connections` | participants | **none** | dormant by decision (#132): not required for alpha; Social Graph deferred to MVP 1C | none |
| `groups` | members | insert as creator | ✓ | ✓ |
| `group_members` | fellow members | insert self-as-creator / by admin; **no leave/role-change** | OK for alpha (invite flow later) | ✓ (visibility) |
| `group_contexts` | members | insert members, update admin | ✓ | indirect |
| `context_members` | members | **none** (seed only) | read-only by decision (#127) until membership flows land → #131 | none |
| `member_availability` | members | **none** (seed only) | read-only by decision (#127) until membership flows land → #131 | none |
| `expenses` | members | insert members; creator-only one-way soft delete (`deleted_at`), ledger columns trigger-pinned (#127) | ✓ | ✓ |
| `expense_shares` | members | insert members | ✓ | indirect |
| `payment_actions` | members | insert involved; status transitions payer/payee via trigger-checked policies | ✓ | ✓ |
| `timeline_events` | members | insert members (best effort) | ✓ | indirect |
| `inbox_items` | own | insert own; resolve/dismiss own, non-status columns trigger-pinned (#127) | ✓ | ✓ |
| `counterparties` | own | insert/update own | ✓ (owner-private) | ✓ |
| `counterparty_aliases` | own (via owner check) | insert/update own | ✓ | indirect |
| `claims` | creator inline + shared linked counterparty (security-definer helper) | insert own; update participants, counterparty status-only (trigger), transitions server-enforced (#106, parity-checked) | ✓ | ✓ (incl. #119 RETURNING regression) |
| `claim_payments` | participants | insert as self; cores immutable (trigger) | ✓ | ✓ |
| `claim_events` | participants | insert as acting user | ✓ | ✓ |
| `claim_reminders` | own only | insert/update own only | ✓ (strictly personal) | ✓ |

Dev-session special logic: none in SQL — the dev session
(`apps/mobile/src/services/dev-session.ts`) is a fixed local test user that
signs up through normal auth and passes the normal policies. Nothing to
remove from the database for alpha; the **client** code path is env-gated
since #134: `EXPO_PUBLIC_APP_ENV` must be exactly `local` (fail-closed,
unknown values count as production) or `startDevSession` refuses and the
Profile-tab card is hidden (`apps/mobile/src/config/app-env.ts`, unit-tested).

## 4. Alpha gap list

| Gap | What is needed | Class |
| --- | --- | --- |
| Local-private storage decision (2.1) | **decided** (#126): owner-private EU rows for alpha; #93/#94 updated; device-only stays later option (#129) | Done |
| Supabase project region | create alpha project in EU region (preferred `eu-central-1`), document here; full checklist in `docs/development/shared-alpha-supabase.md` (#138) | **Blocker** (runbook ready) |
| Real auth | **done** (#134 gate + #135 flow): e-mail+password sign-up/sign-in/sign-out, AsyncStorage session persistence, RLS-scoped profile bootstrap; local-stack smoke 9/9 PASS (`apps/mobile/scripts/auth-flow-smoke.ts`). Re-verify against the shared project once it exists | Done (re-check on shared project) |
| Secrets handling | env-tier separation **done** (#134); tester config distribution **documented** (#138 runbook §3: private distribution of URL + publishable key, both public-client config; service keys never in repo/app/testers). Executable once the project exists | Done (doc; execute with project) |
| Migration deploy path | **decided + documented** (#138 runbook §4): manual maintainer deploy via `supabase link` + `db push` after mandatory local validation; `migration list` parity check; no seed on shared DB; CI workflow deliberately later (`workflow_dispatch`, fail-closed) | Done (doc; execute with project) |
| RLS verification against shared project | plan **documented** (#138 runbook §5): Path A = rolled-back SQL suite via psql (maintainer), Path B = client-side supabase-js smoke → #139; must run before invites; local 43/43 is necessary but not sufficient | **Blocker** (execution; script → #139) |
| Seed/test data concept | **documented** (#138 runbook §4): shared project starts empty, `seed.sql` stays local-only, testers create real data | Done |
| RLS smoke gaps (see 3) | **done** (#127): profiles visibility, inbox ownership/resolve, expense soft-delete covered; participation/availability cases follow with their write paths (#131) | Done |
| Unused/partial tables | inbox resolve + expense soft-delete **done** (#127); `context_members`/`member_availability` read-only until membership flows (#131); `friend_connections` dormant by decision (#132) | Mostly done |
| Backup/key handling | stays #109 (premium, E2E) — explicitly **not** alpha | Not in alpha |
| Push, contact book, offline sync, payment anything | excluded by #93 boundary | Not in alpha |

## 5. Blockers vs. non-blockers (summary)

**Blockers for shared alpha** (in order; the storage decision from 2.1 is
resolved via #126 — owner-private EU rows):

1. EU region confirmed at project creation.
2. ~~Real auth replacing the dev session~~ — done: dev session hard-blocked
   in shared builds (#134), e-mail+password flow with session persistence and
   profile bootstrap (#135, local-stack smoke 9/9). Re-verify on the shared
   project.
3. ~~Secrets/env separation for shared config~~ — env tiers since #134,
   tester config distribution documented (#138 runbook §3); execution is part
   of project creation.
4. ~~Migration deploy path~~ — decided and documented (#138 runbook §4:
   manual maintainer `db push` first, CI later); execution is part of project
   creation.
5. RLS smoke (or equivalent) green against the shared project — plan in
   #138 runbook §5, client-side script is #139.

Net remaining work: execute the #138 runbook (create the EU project, deploy,
smoke, distribute config) plus the #139 script.

**Can follow during alpha**: seed/testdata doc, participation/availability
write paths with the membership flows (#131). `friend_connections` decision
is done (#132): dormant, Social Graph deferred to MVP 1C. Inbox resolve,
expense soft-delete and the matching smoke cases are done (#127).

**Deliberately not part of alpha**: encrypted backup & key handling (#109),
premium features, push/notifications, contact book, offline sync, public
alpha, anything inside the payment/banking boundary.
