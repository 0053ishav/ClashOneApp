# Contributing to Clash One

## Development flow

1. Create an issue for non-trivial work.
2. Create a short-lived branch from `main`.
3. Keep a branch focused on one change.
4. Open a pull request using the repository template.
5. Wait for CI to pass.
6. Test affected Android flows on a development/preview build.
7. Merge only when the change is understood and reversible.

## Branch naming

Use one of:

- `feature/<name>`
- `fix/<name>`
- `refactor/<name>`
- `chore/<name>`
- `hotfix/<name>`

## Clash One-specific validation

Changes affecting progression, JSON import, widgets, notifications, billing, or account state should include targeted validation in the PR description.

The Clash of Clans API should be used for data it actually exposes. Do not assume it provides client-side upgrade timers or progression state that must come from imported village data or Clash One's own state model.

## Commits

Prefer conventional prefixes such as `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, and `docs:`.

## Secrets

Never commit API keys, EAS tokens, Sentry auth tokens, RevenueCat secrets, AdMob secrets, or user credentials. Use local environment files and GitHub/EAS secret storage.
