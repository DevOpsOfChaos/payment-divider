# Local Supabase Schema Validation

Status: MVP 1A development workflow

This document describes how to validate the SQL migrations in `supabase/migrations/` on a local machine. It never connects to a live Supabase project and never requires secrets.

## Prerequisites

- Supabase CLI (no project link, no login required for local validation)
- Docker Desktop (required for `supabase start` and `supabase db reset`, which run a local PostgreSQL container)

### Installing the Supabase CLI

Windows (Scoop):

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

macOS/Linux (Homebrew):

```bash
brew install supabase/tap/supabase
```

Alternatively run it ad hoc without installing:

```powershell
npx supabase --version
```

Verify the installation:

```powershell
supabase --version
```

## Validation workflow

All commands run from the repository root and operate only on the local files and the local Docker containers.

1. `supabase db lint` — static analysis of the SQL in `supabase/migrations/` using a temporary local shadow database. Requires Docker. Fails on invalid SQL and reports plpgsql issues.
2. `supabase start` — starts the full local Supabase stack (PostgreSQL, auth, API) in Docker. Only needed for interactive inspection; not required for lint.
3. `supabase db reset` — drops and recreates the local database, replays every migration in order, then applies `supabase/seed.sql`. This is the strongest check that the migration chain applies cleanly from scratch. Requires Docker and a running local stack (`supabase start`).
4. `supabase stop` — shuts the local stack down again.

## Package scripts

Convenience wrappers (no new dependencies):

```powershell
corepack pnpm db:lint    # supabase db lint
corepack pnpm db:reset   # supabase db reset
corepack pnpm db:check   # db lint, then db reset
```

These shell out to the `supabase` binary and fail with a clear error if it is not installed.

## When Docker is needed

| Command            | Docker required |
| ------------------ | --------------- |
| `supabase --version` | no            |
| `supabase db lint`   | yes           |
| `supabase start`     | yes           |
| `supabase db reset`  | yes           |

## If the CLI is missing

- Do not skip review: read the migration SQL manually and check ordering by timestamp prefix.
- State explicitly in the PR that `supabase db lint` / `db reset` were not run and why.
- Do not substitute a live project connection for local validation.

## Boundaries

- No `supabase link`, no access tokens, no project refs, no `.env` files.
- Local validation only; the live Supabase project is never touched from this workflow.
- This workflow validates schema and migration ordering. It does not test RLS behavior end to end; that needs dedicated policy tests in a later issue.
