# friend_connections decision

Decision for issue #132. Refs #127, #108, #110.

## Decision

**Keep dormant.** `friend_connections` is not built out and not dropped for
Shared Alpha. It remains a schema-only table with no write path, no UI, and no
product flow. Building the full friend/connection flow (request, accept, block,
policies, smoke) is deferred to a Social Graph milestone (MVP 1C or later).
Dropping it is also deferred: the schema is stable, causes no RLS or grant harm,
and removing it requires a migration + type-gen update that should follow an
explicit product call.

This decision supersedes the open action from #127 ("build flow or drop before
alpha"). After the analysis below, neither action is needed for Shared Alpha.
The readiness doc (`shared-alpha-backend-readiness.md`) is updated accordingly.

## Current state

| Aspect | State |
| --- | --- |
| Schema | exists since `20260609220000_initial_mvp1a_schema.sql` |
| Columns | `id`, `requester_user_id`, `addressee_user_id`, `status` (pending/accepted/declined/blocked), `created_at`, `updated_at`, `accepted_at` |
| Indexes | unique pair, requester+status, addressee+status |
| RLS | enabled; one SELECT policy for participants; **no write policy** |
| Grants | `authenticated` has table-level privileges (via `20260611143000`); write never reachable without an INSERT/UPDATE policy |
| Core type | `FriendConnection` / `FriendConnectionStatus` in `domain-types.ts` — type definition only; nothing instantiates or reads it |
| UI | none |
| Write path | none |
| Smoke tests | none |
| Product flow | none |

## Why not needed for Shared Alpha

Shared Alpha needs users to share and sync ledger data (groups, expenses,
claims) with known participants. Participant membership is controlled by
`group_members` / `context_members`. Access is group-scoped, not friend-scoped.
There is no product requirement to gate any Alpha feature behind a mutual friend
connection. The Alpha can launch, be used fully, and be smoke-tested without
`friend_connections` ever having a row in it.

## Counterparty Linking implication (#110)

`friend_connections` and Counterparty Linking (#110) are **independent models**:

- Counterparty Linking uses `counterparties.linked_user_id` (owner-private,
  one-directional). When an invited/external counterparty is linked to an app
  user, `linkCounterpartyToUser()` upgrades `kind` to `app_user` and sets
  `linked_user_id`. No mutual acceptance required.
- `friend_connections` is a symmetric, mutual-request model (requester →
  addressee, status: pending/accepted). It has no foreign key into
  `counterparties` and is not referenced anywhere in Core.
- #110 can be designed and implemented without touching `friend_connections`.
  The invite/link flow goes: create counterparty → invite via username or link →
  acceptance upgrades `kind` → existing claims are unaffected (no auto-share).

## RLS and write-path implication

No RLS change is needed to keep the table dormant. The existing SELECT policy is
correct and harmless; rows will simply never exist until a write path is
explicitly added. No ad-hoc INSERT policy should be added outside a full flow
implementation (per the principle established in #127).

If `friend_connections` is eventually built out, it will need:
- INSERT policy (requester creates pending row)
- UPDATE policy (addressee updates status; requester may withdraw)
- RLS smoke coverage
- Core functions for request/accept/decline/block
- UI flow

None of this is scoped to #132 or #110.

## Implications for other open issues

| Issue | Implication |
| --- | --- |
| #110 Counterparty Linking | No dependency on `friend_connections`. Proceed independently. |
| #131 context_members / member_availability write paths | No dependency. |
| #112 Recurring costs | No dependency. |
| #129 Device-only / local-first | No dependency. |

## Non-goals

- No migration (no drop, no ALTER).
- No write policy added here.
- No UI or invite flow.
- No Core function for friend requests.
- No smoke test for `friend_connections` (dormant table; zero rows expected).

## Follow-up

When a Social Graph / friend-list feature is planned (MVP 1C or later), a new
issue should cover: product requirements, write-path design, RLS policies
(INSERT + UPDATE), Core functions, UI flow, and smoke coverage. That issue
should also decide definitively whether to reuse this schema or start fresh.
