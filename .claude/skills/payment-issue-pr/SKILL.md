---
name: payment-issue-pr
description: Issue-based workflow for payment-divider — verify GitHub state before any work, small PRs, honest check reporting, squash-merge discipline, fixed final-output format. Use for every coding or docs task in this repo.
---

# Issue-based working

## Before any work

- `git status --short`, `git fetch origin`, `git log -1 --oneline`
- `gh pr list --state open`, `gh issue list --state open`
- Verify the previous task's reported state (merged PR, closed issue) before
  building on it. Do not work on a dirty tree or stale main.

## Issues

- No prompt/feature work without a GitHub issue. If none exists, create one
  first and say so.
- One issue, one small PR. Split rather than grow.

## PRs

- Small, focused. Body states: what was implemented, what deliberately not,
  the payment/banking boundary confirmation, which checks actually ran,
  open risks.
- `Closes #N` only when the issue is genuinely complete; otherwise `Refs #N`.
- Never claim a test/check that did not run. Name skipped checks explicitly
  with the reason (e.g. "no SQL changes").
- After creating the PR: watch CI (`gh pr checks <n> --watch`). Merge only
  when green. Squash-merge. Delete the branch. Pull main and verify the
  merge commit landed.

## Final output (exactly this, nothing more)

- PR (number + link)
- Commit (merge commit on main, or head commit if unmerged)
- Files changed
- Checks with results
- Risks / non-goals
- Issue status
