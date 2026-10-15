# Android QA checklist

Run destructive end-to-end flows only on a dedicated emulator or test device. The Maestro critical smoke flow clears application data.

## Automated smoke test

- [ ] Start Metro with `npm run start`.
- [ ] For a physical Android device, run `adb reverse tcp:8081 tcp:8081`.
- [ ] Confirm the development build for `com.strngelabs.clashone` is installed.
- [ ] Run `maestro test .maestro/flows/critical-app-smoke.yaml`.
- [ ] Confirm the flow reaches the app without manually selecting the Metro server or pressing the development-client Continue button.
- [ ] Confirm the Home tab selector uses the app's stable `home-tab` test ID, not Android's system Home action.

## Manual regression

### App launch and onboarding
- [ ] Fresh install opens onboarding and completes successfully.
- [ ] Returning launch skips completed onboarding.
- [ ] Cold launch and warm resume work without a blank screen or crash.

### Accounts and villages
- [ ] Demo-village import completes and persists after app restart.
- [ ] Home Village and Builder Base can be selected independently.
- [ ] Switching villages does not leak active upgrades or builder/laboratory state across villages.
- [ ] Switching accounts does not show another account's upgrades, inventory, or profile state.

### Upgrade tracking and persistence
- [ ] Create, edit, and delete a tracked upgrade.
- [ ] Active upgrade countdown and completion state update correctly.
- [ ] State survives force-stop and relaunch.
- [ ] JSON import handles supported data and reports invalid input without corrupting saved state.

### Widgets and notifications
- [ ] Builder Status widget renders the selected account's next-builder state.
- [ ] Upcoming Upgrades widget sorts active upgrades by completion time.
- [ ] Laboratory, Pet, and Multi Account widgets render their expected data.
- [ ] Widget refresh after account/village changes uses current persisted state.
- [ ] Upgrade completion notifications are scheduled, updated, and cancelled as appropriate.

## Repository checks

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test -- --runInBand`
- [ ] `npx expo-doctor`

Record device model, Android version, app build, test date, and any failure logs in the pull request. Do not mark device-only checks complete unless they were actually run.
