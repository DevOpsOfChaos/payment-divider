# ADR 0001: Initial Tech Stack

Status: proposed  
Date: 2026-06-09

## Context

The product is mobile-first. Fast expense entry, trips, festivals, receipt photos, QR flows, optional location, and later offline support are central use cases.

The project should remain fast to prototype and friendly to AI-assisted engineering.

## Decision

Use the following default stack unless future evidence changes it:

- Expo / React Native / TypeScript for the mobile app
- Supabase / PostgreSQL for backend, auth, storage, and later edge functions
- pnpm workspace / monorepo
- Shared TypeScript packages for core ledger logic and validation

## Rationale

- One mobile codebase for iOS and Android.
- TypeScript is well suited for shared domain logic and agent-assisted changes.
- Supabase provides fast MVP infrastructure: auth, PostgreSQL, storage, row-level security, and local development.
- PostgreSQL is appropriate for ledger-style data with relational constraints.

## Consequences

- Offline sync must be designed deliberately.
- Payment-related identifiers require careful protection and masking beyond basic CRUD.
- Ledger calculations should live in a shared package and be testable independently from UI.

## Non-decisions

This ADR does not yet select:

- UI component library,
- E2E test framework,
- analytics provider,
- production hosting details,
- payment-provider integration strategy.
