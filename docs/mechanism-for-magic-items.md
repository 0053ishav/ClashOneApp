# Mechanism for Magic Items

## Purpose

This document explains how Clash One models Magic Items, how timed effects are stored, how upgrade completion times are calculated, and how the app treats repeated or combined boosts.

This describes the **Clash One implementation**. It is not a claim that every interaction exactly matches the live Clash of Clans game.

## Overview

Clash One separates Magic Items into three broad mechanisms:

1. **Timed effects** — potions and snacks that accelerate eligible work for a limited window.
2. **Instant actions** — Books complete eligible upgrades, while Hammers apply an instant upgrade action.
3. **Upgrade-start modifiers** — effects such as Hammer Jam are modeled separately and applied when an upgrade starts, rather than stored as a running timed effect.

The domain model is defined in `types/magicItem.ts`, and item metadata is defined in `config/magicItems.ts`.

## Timed item activation

The timed activation flow is:

1. The app looks up the item metadata and validates its effect type, supported village, target, and duration.
2. It creates an effect record containing the item ID, activation timestamp, expiry timestamp, and village.
3. It consumes one inventory item and inserts the active effect in a single SQLite transaction.
4. Upgrade reads load the account's recorded effects and project those effects onto eligible upgrades.

Relevant implementation:

- `services/activateTimedMagicItem.ts`
- `services/activateClockTowerPotion.ts`
- `services/magicItemService.ts`
- `services/upgradeService.ts`

The inventory decrement and effect insertion are atomic in `consumeMagicItem()`: if either part fails, the transaction is rolled back.

An active effect is account-scoped and records:

- `startedAt` — activation time in milliseconds since the Unix epoch.
- `expiresAt` — expected end of the effect window.
- `village` — the village where the effect applies.
- `itemId` — the Magic Item whose metadata defines the boost.

## Current timed item definitions

The values below come from Clash One's current item registry in `config/magicItems.ts`.

| Item | Modeled speed | Duration | Eligible work / village |
|---|---:|---:|---|
| Builder Potion | 10× | 60 minutes | Builders, Home Village |
| Research Potion | 24× | 60 minutes | Research, Home Village |
| Pet Potion | 24× | 60 minutes | Pet upgrades, Home Village |
| Study Soup | 4× | 60 minutes | Research, Home Village |
| Builder Bite | 2× | 60 minutes | Builders, Home Village |
| Clock Tower Potion | 10× Clock Tower boost | 30 minutes | Builder Base construction and research |

A multiplier is modeled as the **total speed**, not the bonus alone. For example, 10× speed means normal speed plus a 9× bonus.

## How completion time is calculated

The central calculation is implemented in `engine/magicItems/resolveUpgradeCompletionTime.ts` and applied by `engine/magicItems/applyMagicItemEffectsToUpgrades.ts`.

For an eligible upgrade, the resolver:

1. Starts with the upgrade's baseline duration and start timestamp.
2. Finds effects compatible with the target and village.
3. Creates time boundaries for when effects start and expire.
4. Splits the upgrade timeline into intervals at those boundaries.
5. Calculates the effective speed during each interval.
6. Subtracts the amount of work completed in each interval from the remaining work.
7. Returns the timestamp at which the remaining work reaches zero.

The effective speed formula used by the resolver is:

```text
effectiveSpeed = 1 + sum(active effect multiplier - 1)
```

The work completed during one interval is:

```text
workCompleted = elapsedTime × effectiveSpeed
```

If the remaining work finishes before an effect expires, the projected finish time is the earlier completion time.

### Example: one hour of boost

Assuming an upgrade has enough work remaining for the full hour:

| Item | Work completed during 1 real hour | Time saved compared with normal speed |
|---|---:|---:|
| Builder Potion (10×) | 10 hours of work | 9 hours |
| Research Potion (24×) | 24 hours of work | 23 hours |
| Builder Bite (2×) | 2 hours of work | 1 hour |
| Study Soup (4×) | 4 hours of work | 3 hours |

These are idealized examples of the code's speed model. Actual saved time is limited by how much upgrade work remains.

## Reusing the same timed item: duration extension

The resolver groups effects by item ID. When another activation of the **same item** begins before the previous normalized window expires, it extends the existing window by the new activation's full effect duration.

For example, two Builder Potions used in overlapping succession are modeled as:

- **10× speed for a combined two-hour window**, not 20× speed for one hour.
- Three such activations in overlapping succession can extend that continuous window to three hours, and so on.

This is an implementation rule in `getRelevantSpeedEffects()`. It does not multiply the same item's speed bonus for overlapping uses.

If the next activation occurs after the previous window has ended, the resolver treats it as a separate time window; it does not automatically turn a gap into continuous boosted time.

## Combining different compatible items

The resolver adds the **bonus above normal speed** from each compatible effect. For example:

- Builder Potion contributes a bonus of 9× (10× total speed).
- Builder Bite contributes a bonus of 1× (2× total speed).
- If both are active for the same eligible builder work, the modeled total is (1 + 9 + 1 = 11×).

Likewise, Research Potion (24×) plus Study Soup (4×) is modeled as (1 + 23 + 3 = 27×) for eligible research while both effects overlap.

These combinations describe the current Clash One calculation. They should be verified against observed in-game behavior before being presented as exact live-game rules.

## Which upgrades are affected?

The current projection maps upgrade types to targets as follows:

- `BUILDER` → `builders`
- `LAB` → `research`
- `PET` → `pet`

Effects are filtered by item metadata, village compatibility, target compatibility, and any village stored on the effect record. The Clock Tower boost is restricted to Builder Base construction and research in the resolver.

Completed upgrades and upgrades with invalid or non-positive baseline durations are not recalculated by `applyMagicItemEffectsToUpgrades()`.

## Does the app permanently subtract time?

The timed-effect projection does **not** update the persisted upgrade finish timestamp directly. It calculates an adjusted `endTime` on the returned upgrade object and records `magicItemTimeSavedMs` as the difference between the baseline finish and the projected finish.

This is intended to prevent repeatedly loading an upgrade from subtracting the same saved time over and over. The active effect history is used to reconstruct the projected timeline, including effects that have expired but accelerated work earlier in the upgrade.

The main integration is in `services/upgradeService.ts`:

- `getUpgrades()` loads normalized upgrades and account effects, applies the projection, and derives completion state.
- `getActiveUpgrades()` applies the projection before filtering for unfinished upgrades whose projected finish remains in the future.

## Books, Hammers, and upgrade-start modifiers

Books and Hammers are not ongoing speed effects:

- **Books** use the instant-completion path for an eligible active upgrade.
- **Hammers** use the instant-upgrade path for an eligible entity.
- **Upgrade-start modifiers** are modeled separately as `UpgradeStartModifier`, because their result belongs to the upgrade that was started and should not change when the modifier/event later expires.

See the relevant domain model in `types/magicItem.ts` and the item definitions in `config/magicItems.ts`. The timed-effect resolver should not be used as the mechanism for instant actions or upgrade-start modifiers.

## Verification checklist

Before considering the behavior fully verified, test the following with deterministic timestamps and the project's test runner:

- [ ] A single timed item applies the configured multiplier and duration.
- [ ] Reusing the same item during its active window extends duration without multiplying its speed again.
- [ ] Reusing the same item after its prior window expires creates a separate window.
- [ ] Different compatible effects combine according to the resolver's bonus-multiplier formula.
- [ ] Effects do not apply to an unsupported village or target.
- [ ] Expired effects can still account for work accelerated earlier in an upgrade's timeline.
- [ ] Re-reading an upgrade does not compound previously projected time savings.
- [ ] Builder Base Clock Tower behavior is covered independently.
- [ ] Books and Hammers use their instant-action paths.

## Clash of Clans API boundary

Clash One's inventory and active-effect records are local application state. The public Clash of Clans API is useful for supported player and game data, but the Magic Item activation and timer projection described here are implemented by Clash One; they do not activate items in the live game.

For API integration, refer to the official [Clash of Clans API portal](https://developer.clashofclans.com/). Treat the API's documented capabilities as the source of truth for what can be retrieved; do not assume it exposes local inventory, potion activation, or an authoritative live upgrade timer unless the API explicitly documents that capability.
