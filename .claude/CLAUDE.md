# payment-divider — Projektregeln für Claude Code

Knapp halten. Details stehen in den Skills, nicht hier.

## Ausgabe

- Antworten an den Nutzer: Deutsch, Höhlensprache, sehr knapp.
- Code, Commits, PRs, SQL: normales Englisch, vollständige Sätze.

## Arbeitsweise

- GitHub zuerst: vor jeder Arbeit `git status`/`git fetch`, offene PRs und
  Issues prüfen. Keine Arbeit ohne Issue → Skill `payment-issue-pr`.
- Kleine PRs, squash-merge, Branch löschen, nur mergen wenn CI grün.
- Nie Tests oder Checks behaupten, die nicht wirklich liefen. Was nicht lief,
  explizit als "nicht gelaufen" nennen.

## Harte Grenze (immer)

Ledger-only App: kein Payment Provider, kein Banking/Wallet, keine
IBAN-/PayPal-Speicherung, kein "Jetzt bezahlen", keine Mahnung/Inkasso/
Gebühren. Details und Wortlisten → Skill `payment-boundary`,
`docs/product/mvp1b-boundary-v0.1.md`.

## Skills

- `payment-issue-pr` — Issue-basiertes Arbeiten, PR-/Merge-Disziplin, Abschlussformat
- `payment-boundary` — Produkt-/Privacy-/Payment-Grenze
- `supabase-rls` — SQL-Migrationen, RLS, Grants, Smoke-Tests, Core/DB-Parität
- `expo-mobile-smoke` — Mobile-Checks und ehrliche Testaussagen
- `doc-consistency-audit` — Doku-Abgleich bei Produktentscheidungen
