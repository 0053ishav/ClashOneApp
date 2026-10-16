# Android QA with Maestro

These flows exercise the installed Android app, not a mocked React Native tree. They complement Jest tests; they do not replace service tests or native widget validation.

## Prerequisites

- Android emulator or physical Android device connected and unlocked.
- A compatible Clash One Android build installed (package: com.strngelabs.clashone).
- Maestro CLI installed: https://docs.maestro.dev/getting-started/installing-maestro
- Network access to the app's configured game-data/CDN services during first-run setup.

## Run

From the repository root:

    maestro test .maestro/flows/critical-app-smoke.yaml

The smoke flow clears Clash One's app data, completes onboarding, imports the built-in demo village, then checks Home Village, Builder Base, and Settings navigation. This is destructive to local app data on the target device. Use a dedicated emulator/test device, not a personal device with a real tracked village.

## Test layers

1. Pull request CI: npm run lint, npm run typecheck, and npm test -- --ci --runInBand.
2. Maestro: installed-app navigation and basic first-run setup.
3. Device QA: native SQLite lifecycle, Android widgets, notification delivery, background/foreground transitions, and persistence across force-stop/relaunch. These behaviors must be checked on an Android emulator/device; mocked Jest tests or screen automation alone cannot prove native correctness.

## Extending coverage

- Add deterministic flows under .maestro/flows/.
- Prefer existing accessibility labels; add stable labels in app code when an important control cannot be selected reliably.
- Avoid assertions on countdown values, remote content, or animation timing unless the test controls those inputs.
- Keep destructive/reset scenarios isolated from normal regression flows.
