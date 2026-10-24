---
name: testing-validation
description: Use for bug fixes, new features, refactors, release preparation, and any task requiring proof that Clash One behavior remains correct.
---

# Testing and Verification

## Choose tests based on risk

- Pure domain calculations: unit tests for normal values, boundaries, invalid inputs, and invariants.
- Stores and persistence: tests for hydration, migrations, account isolation, partial/corrupt data, and failure recovery.
- Imports and network clients: malformed payloads, missing fields, unknown IDs, HTTP errors, and compatibility behavior.
- React Native UI: loading, empty, error, accessibility, theme, retry, and important user interactions.
- Widgets/notifications: validate serialized/cache data and the actual Android behavior when native integration is involved.
- Purchases: distinguish development/preview feature flags from production billing behavior; never claim a real purchase was tested unless it was.

## Standard project checks

Use the repository's package scripts:
- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`

For configuration, native modules, dependencies, or Expo setup changes, also consider the repository's Expo health check and Android fingerprint/build workflow.

## Device verification

Static checks do not prove runtime behavior. Explicitly identify whether an Android development/preview build is required. Smoke-test affected flows such as account switching, JSON import, progression updates, widget refresh, notifications, or purchase/restore.

For an error boundary, test a controlled render-time exception, fallback rendering, retry/reset behavior, and Sentry capture. Remove the temporary test trigger afterward and rerun checks.

## Reporting results

Report each check as passed, failed, or not run. Include the command and relevant result. Distinguish:
- Static checks.
- Automated tests.
- Android device/emulator tests.
- Preview/production build verification.

Never claim tests passed based only on source inspection.
