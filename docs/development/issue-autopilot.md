# Issue Autopilot Policy

Controlled, human-gated workflow for AI-assisted issue work.
The autopilot assists — it does not merge, close issues, or take
product decisions autonomously.

---

## What the autopilot may do

- Read open issues and evaluate dependencies and risk
- Recommend the next issue to pick up
- Recommend model and effort level
- Prepare a branch
- Implement a small, focused PR
- Run local checks
- Create the PR
- Watch CI (`gh pr checks <n> --watch`)
- Request merge approval from the human

## What the autopilot must NOT do without explicit human approval

- Merge PRs
- Close issues
- Force-push
- Mix multiple issues into one PR
- Change DB / RLS / Auth / schema
- Make product decisions
- Change secrets, environment config, or CI pipelines
- Commit `.claude/settings.json`, `.qa-shots/`, or other local-only files
- Set `Closes #N` when scope is not fully fulfilled

---

## Issue classes

### 1 · Mechanical hygiene

Examples: deprecation, import migration, small lint/type fixes.

- Model: `sonnet` medium or high
- PR size: very small
- Extra checks: none beyond standard

### 2 · Mobile UX / wording

Examples: #123 (mobile claims QA wording).

- Model: `sonnet` high
- Tests: `typecheck` / `test` / `lint` / `mobile start --help`
- No DB scope

### 3 · DB / RLS / Auth

Examples: #139 (shared RLS smoke script).

- Model: `opus` high for planning, `sonnet` high for small changes
- Extra checks: `supabase db reset`, `supabase db lint`, `pnpm db:rls-test`
- Requires `supabase-rls` skill

### 4 · Product / data-model design

Examples: #112 (recurring costs), #131 (write paths), #132 (friend connections).

- Start with a design PR or issue comment — no direct code without explicit approval
- Model: `opus` high
- No implementation without written scope agreement

### 5 · Security / backup / key-handling

Examples: #109 (encrypted backup key-handling).

- Design document must exist before any code
- No implementation without human review of the design
- Model: `opus` high

---

## Model / effort routing

| Task type                      | Recommended level   |
| ------------------------------ | ------------------- |
| Small mechanical tasks         | `sonnet` medium     |
| Normal code PRs                | `sonnet` high       |
| Complex architecture / DB / auth | `opus` high       |
| Large concept / design work    | `opus` high (plan only) |

- Do not use `max` effort by default.
- Do not run a multi-issue autopilot pass.
- Do not pin specific model version strings here unless the repo pins them in CI.

---

## Standard workflow per issue

1. `git status --short`
2. `git fetch origin`
3. `git log -1 --oneline`
4. `gh pr list --state open`
5. `gh issue view <id>`
6. Note scope and explicit non-goals
7. Create branch: `git switch -c sidequest/issue-<id>-<slug>`
8. Implement minimally
9. Run checks (see below)
10. Review diff
11. Create PR
12. Watch CI: `gh pr checks <n> --watch`
13. Request merge approval

---

## Standard checks

Always:

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
git diff --check
```

Mobile code:

```powershell
corepack pnpm --filter @payment-divider/mobile start -- --help
```

DB / RLS:

```powershell
supabase db reset
supabase db lint
corepack pnpm db:rls-test
```

Payment boundary:

```powershell
corepack pnpm db:boundary-check
```

Never claim a check passed unless it was actually run.
Name any skipped check with the reason (e.g. "no SQL changes").

---

## PR rules

- One issue per PR
- `Closes #N` only when issue scope is fully fulfilled; otherwise `Refs #N`
- No push or merge without human approval
- No force-push
- Delete branch after merge
- Pull main with `--ff-only` after merge and verify the merge commit

---

## Required final output format

After every PR task, output exactly this block and nothing else:

```text
Issue:
PR:
Branch:
Commit:
Files:
Checks:
CI:
Risks:
Issue status:
Next sensible step:
```

---

## Current issue snapshot (2026-06-14)

This is a point-in-time recommendation, not a permanent priority order.

| Issue | Class | Recommended next action |
| ----- | ----- | ----------------------- |
| #111 Reminder consumer | Mobile UX / light backend | Good next small code issue |
| #110 Counterparty linking | Product + backend | Needs scope design first |
| #112 Recurring costs | Product / data-model design | Do not start without plan PR |
| #131 Write paths | Product / data-model design | Needs product decision |
| #132 friend_connections | Product / data-model design | Needs product decision |
| #109 Encrypted backup | Security / key-handling | Design doc before any code |
| #129 Device-only / local-first | Deferred | Skip until after alpha |

Verify current issue state with `gh issue list` before acting on this table.
