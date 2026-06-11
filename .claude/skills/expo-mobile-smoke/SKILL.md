---
name: expo-mobile-smoke
description: Mobile/Expo check discipline for payment-divider — which checks to run for apps/mobile changes and how to report test coverage honestly (typecheck is not a device test). Use for any change under apps/mobile.
---

# Expo / mobile checks

## Required for any apps/mobile change

- `corepack pnpm typecheck`
- `corepack pnpm test` (core tests still guard shared logic)
- Expo CLI smoke: `corepack pnpm --filter @payment-divider/mobile start -- --help`

## Honest reporting (non-negotiable)

- Typecheck + CLI smoke is NOT "mobile tested". Never claim device testing
  when only static checks ran.
- When real app behavior/UI changed, the PR must state explicitly whether a
  device/emulator run happened or not ("UI verified via typecheck and CLI
  smoke only, no device test" is the honest default).
- Device QA has its own track: issue #107 and
  `docs/development/demo-script.md`.

## Expo Go vs development build

- Expo Go is fine for the local demo flows (mock data, claims store,
  navigation).
- Do not treat Expo Go as a production-near test once native capabilities
  are involved. Push notifications, deep links/app links and other native
  features need a development build — test them only there, never claim
  them verified from Expo Go.
- No push implementation exists in this repo by design (boundary); if that
  ever changes, it starts with a development build, not Expo Go.

## Data modes

- `local-demo` (default): in-memory mocks, session-only.
- `supabase-local`: opt-in via `apps/mobile/.env`; see
  `docs/product/alpha-readiness.md` for what works in each mode. Say which
  mode a manual check used.
