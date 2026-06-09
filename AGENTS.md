# Agent Instructions

These rules apply to all AI agents and coding assistants working in this repository.

## Language and communication

- Use concise German summaries for user-facing status updates.
- Keep implementation notes technical and precise.
- Never claim tests passed unless they were actually run.
- Always report exact commands executed and their result.

## Product boundaries

Payment Divider is a ledger app, not a payment app.

Do not implement any feature that:

- initiates a bank payment,
- connects to a bank account,
- reads bank transactions,
- stores bank login credentials,
- holds user funds,
- creates a wallet or e-money balance,
- claims an external payment was successful without user or payee confirmation.

Allowed MVP behavior:

- show balances,
- record expenses,
- mark external payments as paid,
- store user-provided payment methods,
- show or copy payment links/IBANs if the owner explicitly shared them,
- open external payment links while clearly stating that payment happens outside the app.

## Scope discipline

Prefer small, narrow changes.

Before coding, read the relevant docs:

- `docs/product/product-decision-v0.1.md`
- `docs/product/mvp-scope.md`
- relevant files under `docs/screens/` or `docs/architecture/`

Do not add broad features unless an issue explicitly asks for them.

## MVP order

1. Documentation and product foundation.
2. Mock UI prototype.
3. Ledger data model.
4. Ledger calculations and tests.
5. Trust/payment-method visibility.
6. Offline, attachments, multi-currency.

## Technical defaults

Planned stack unless superseded by an ADR:

- Expo / React Native / TypeScript for mobile
- Supabase / PostgreSQL for backend and storage
- pnpm workspace / monorepo
- TypeScript-first shared packages

Do not add dependencies without a clear reason in the PR/commit summary.

## Testing expectations

When code exists, every implementation task should run the narrowest relevant tests plus global checks when feasible:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

If a command cannot run because the project is not scaffolded yet, state that explicitly.

## Security and privacy

- Payment identifiers must not be logged in full.
- IBANs, phone numbers, email addresses, and payment links are personal data.
- Sensitive identifiers should be masked in UI and encrypted at rest once backend storage exists.
- Push notifications must not contain full payment details.
- Contact book access must be optional and opt-in.
- Location and receipt photos must be optional and explicit.

## Git hygiene

- Keep changes narrowly scoped to the issue.
- Avoid unrelated formatting.
- Include acceptance criteria in issue completion notes.
- Prefer pull requests for implementation work once app code exists.
