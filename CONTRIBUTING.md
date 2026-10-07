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

## Releases

Releases are tag-driven.

1. Update `package.json` to the intended semantic version.
2. Keep `app.json` version aligned with `package.json`.
3. Add a matching `## [X.Y.Z]` section to `CHANGELOG.md`.
4. Merge the release-ready changes into `main`.
5. Create and push the tag `vX.Y.Z`.
6. GitHub Actions validates the tag against `package.json` and publishes the matching changelog section as the GitHub Release.

Do not create a release tag for an unpublished or incomplete version.

## Secrets

Never commit API keys, EAS tokens, Sentry auth tokens, RevenueCat secrets, AdMob secrets, or user credentials. Use local environment files and GitHub/EAS secret storage.
