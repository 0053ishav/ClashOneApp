---
name: typescript-architecture
description: Use for TypeScript implementation, refactoring, domain modeling, service boundaries, state management, and code review in Clash One.
---

# TypeScript and Architecture

## TypeScript practices

- Keep strict typing. Avoid `any`, unsafe casts, non-null assertions, and broad catch-and-ignore blocks unless there is a documented reason.
- Use `unknown` for untrusted values and narrow them with runtime checks.
- Model meaningful domain states with discriminated unions and named types where they improve correctness.
- Make invalid states hard to represent; encode invariants in types and constructors/parsers where practical.
- Keep functions small and name them after domain intent. Prefer explicit inputs/outputs and predictable side effects.
- Avoid duplicating derived state when it can be computed from a canonical source.

## Architecture boundaries

Follow existing repository conventions; inspect before creating a new layer.

- UI components own rendering and user interaction, not persistence or core progression formulas.
- Domain services own business rules and calculations.
- Storage/database modules own persistence and migrations.
- API/CDN clients own network access and response parsing.
- Stores coordinate client state but should not become dumping grounds for domain logic.
- Widgets should consume canonical prepared data and avoid reimplementing application calculations.

## Error handling

- Handle expected failures explicitly and preserve useful context.
- Do not turn an error into success-shaped default data if that would mislead the user or corrupt progression.
- Keep recoverable UI errors distinct from data-integrity and persistence failures.
- Do not log secrets or sensitive payloads.
- Use existing Sentry/logger conventions and avoid duplicate capture of the same failure without a reason.

## Refactoring discipline

1. Identify the current contract and callers.
2. Search for all consumers before changing a shared type or function.
3. Fix the underlying ownership or invariant problem rather than patching each caller.
4. Keep changes focused and maintain backward compatibility where persisted data is involved.
5. Add tests for changed behavior and regression cases.
6. Run type-check, lint, and targeted/full tests as appropriate.
