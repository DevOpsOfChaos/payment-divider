---
name: doc-consistency-audit
description: Documentation consistency audit for payment-divider — which docs to re-check after any product decision, keeping the issue map and payment boundary wording in sync. Use after merging spec/product changes or when wording conflicts appear.
---

# Doc consistency audit

## When

After every new product decision, spec change or boundary-relevant PR.

## Docs to cross-check

- `docs/product/mvp1b-boundary-v0.1.md` — consolidated boundary + issue map
- `docs/product/free-sync-premium-backup-v0.1.md` — data classes, free/premium
- `docs/product/private-claims-v0.1.md` — claims + counterparty layer
- `docs/product/person-balance-overview-v0.1.md` — gross/net/history rules
- `docs/product/claim-dispute-clarification-v0.1.md` — dispute language/transitions
- `docs/product/reminder-policy-v0.1.md` — reminder rules and word lists
- `docs/product/shared-subscriptions-v0.1.md` — cost plans, periods, history
- `docs/architecture/core-database-field-mapping.md` — core type ↔ table map

## Checks

- No contradictory statements between docs; the boundary doc consolidates,
  the specs own the detail — change both or neither.
- Issue map in `mvp1b-boundary-v0.1.md` stays current: new issues added,
  decided items no longer marked "open".
- Payment/banking boundary wording identical in spirit everywhere; forbidden
  word lists (see `payment-boundary` skill) not violated by new copy.
- Field-mapping doc updated when a core type or table is added/renamed —
  no "(pending)" rows left behind once the type exists.
- Cross-references use real file names and real issue numbers (verify with
  `gh issue view` — PR numbers are not issue numbers).
