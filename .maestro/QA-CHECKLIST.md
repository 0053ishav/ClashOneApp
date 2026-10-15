# Clash One Android regression checklist

Record app version, Android version, device/emulator, build type, and result for each run. Use a dedicated test village or the built-in demo account. Do not use destructive reset/clear-upgrades actions against a real village.

## P0 — Startup and local persistence

- [ ] Fresh install: launch, complete onboarding, load demo village; no fatal boot screen.
- [ ] Relaunch repeatedly (at least 5 times); Home and Settings load without SQLite errors.
- [ ] Background the app for 10–15 minutes, resume, navigate between tabs, and refresh.
- [ ] Force-stop from Android settings, reopen, and confirm account/upgrades remain available.
- [ ] Repeat force-stop/reopen with a widget already placed on the launcher.
- [ ] Observe logcat during startup/widget refresh; no NativeDatabase.execAsync, NativeDatabase.prepareAsync, migration, or unhandled promise errors.

## P0 — Upgrade tracking

- [ ] With a test account, add a tracked builder upgrade and verify it appears on Home.
- [ ] Verify the remaining-time display decreases and survives app backgrounding.
- [ ] Complete/remove the test upgrade using the intended UI; confirm it disappears after refresh/relaunch.
- [ ] Add/verify a research upgrade and a pet upgrade where supported by the test data.

## P1 — Village and account boundaries

- [ ] Switch between Home Village and Builder Base; each shows its own builder/lab state.
- [ ] Return to Home Village; its previously displayed state is preserved.
- [ ] Add/switch between two test accounts; verify upgrades and profile data do not leak between accounts.
- [ ] Delete/reset only a disposable test account and verify the remaining account is unchanged.

## P1 — JSON import

- [ ] Import a valid supported Clash of Clans village JSON export.
- [ ] Import the same export again; verify the account and active upgrades do not duplicate unexpectedly.
- [ ] Import malformed JSON and valid JSON with an unsupported structure; verify a recoverable error and no partial corruption.
- [ ] Import data with expired timers; verify expired upgrades are handled and Home remains usable.

## P1 — Android widgets

For each installed widget type (Builder Status, Laboratory, Pets, All Accounts, Upcoming Upgrades):
- [ ] Add the widget from the Android launcher.
- [ ] Verify initial render with an empty account and with the demo/test account.
- [ ] Trigger an app-side state change and verify the widget refreshes.
- [ ] Background/force-stop/reopen the app and verify widget refresh does not crash.
- [ ] Verify account selection/isolation for account-aware widgets.
- [ ] Remove and re-add the widget; verify it recovers without clearing app data.

## P1 — Notifications

- [ ] Grant notification permission and verify the preference is reflected in Settings.
- [ ] Schedule a short-duration test upgrade using a test-only fixture or controlled test data.
- [ ] Verify completion notification delivery while app is foregrounded, backgrounded, and after relaunch.
- [ ] Disable notifications and verify future completion notifications are not delivered.

## P2 — Recovery and interaction

- [ ] Launch with network unavailable; local screens remain usable and recover after connectivity returns.
- [ ] Rapidly tap navigation/refresh controls; no duplicate navigation or stuck loading state.
- [ ] Verify empty states and missing/invalid import errors are understandable and recoverable.
- [ ] Repeat key flows in both development and release-like builds when possible.

## Result log

| Date | App version / commit | Device + Android | Build type | Passed / failed | Issue link / notes |
|---|---|---|---|---|---|
| | | | | | |
