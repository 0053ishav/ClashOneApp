import { resolveUpgradeCompletionTime } from "@/engine/magicItems/resolveUpgradeCompletionTime";
import type { ActiveMagicEffect } from "@/types/magicItem";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const START = Date.UTC(2026, 0, 1, 0, 0, 0);

function effect(
  itemId: string,
  startedAt: number,
  durationMs = HOUR,
  village: ActiveMagicEffect["village"] = "home",
): ActiveMagicEffect {
  return {
    id: `${itemId}-${startedAt}`,
    itemId,
    startedAt,
    expiresAt: startedAt + durationMs,
    village,
  };
}

function resolve(
  baseDurationMs: number,
  effects: ActiveMagicEffect[],
  target: "builders" | "research" | "pet" = "builders",
  village: "home" | "builderBase" = "home",
): number {
  return resolveUpgradeCompletionTime({
    baseDurationMs,
    startedAt: START,
    effects,
    target,
    village,
  });
}

describe("resolveUpgradeCompletionTime", () => {
  it("returns the start time for zero or negative work", () => {
    expect(resolve(0, [])).toBe(START);
    expect(resolve(-HOUR, [])).toBe(START);
  });

  it("applies a Builder Potion's 10x speed for one hour, then normal speed", () => {
    // 20h of work: 10h is completed during the boosted hour, 10h remains.
    expect(resolve(20 * HOUR, [effect("builder-potion", START)])).toBe(
      START + 11 * HOUR,
    );
  });

  it("does not apply a Builder Potion to research", () => {
    expect(
      resolve(
        20 * HOUR,
        [effect("builder-potion", START)],
        "research",
      ),
    ).toBe(START + 20 * HOUR);
  });

  it("adds compatible research bonuses instead of multiplying them", () => {
    // Research Potion 24x + Study Soup 4x = 1 + 23 + 3 = 27x.
    // A 30h upgrade completes 27h of work in the first hour, then 3h normally.
    expect(
      resolve(30 * HOUR, [
        effect("research-potion", START),
        effect("study-soup", START),
      ], "research"),
    ).toBe(START + 4 * HOUR);
  });

  it("extends an overlapping use of the same potion without stacking its speed", () => {
    const effects = [
      effect("builder-potion", START),
      effect("builder-potion", START + 30 * MINUTE),
    ];

    // The current implementation extends the first window to two hours total.
    // 30h of work: 20h boosted over 2h, then 10h at normal speed.
    expect(resolve(30 * HOUR, effects)).toBe(START + 12 * HOUR);
  });

  it("does not extend a potion window when the next use starts after expiry", () => {
    const effects = [
      effect("builder-potion", START),
      effect("builder-potion", START + 2 * HOUR),
    ];

    // Two boosted hours complete 20h of work; the remaining 10h includes
    // one normal-speed hour between boosts and nine normal-speed hours after.
    expect(resolve(30 * HOUR, effects)).toBe(START + 12 * HOUR);
  });

  it("applies Clock Tower Potion to Builder Base construction", () => {
    const clockTowerEffect = effect(
      "clock-tower-potion",
      START,
      30 * MINUTE,
      "builderBase",
    );

    // A 10x boost for 30 minutes completes 5h of work; 15h remains.
    expect(
      resolve(20 * HOUR, [clockTowerEffect], "builders", "builderBase"),
    ).toBe(START + 15 * HOUR + 30 * MINUTE);
  });

  it("applies Pet Potion only to pet upgrades", () => {
    // 20h of work at 24x speed takes 50 minutes.
    expect(
      resolve(20 * HOUR, [effect("pet-potion", START)], "pet"),
    ).toBe(START + (20 / 24) * HOUR);

    expect(
      resolve(20 * HOUR, [effect("pet-potion", START)], "builders"),
    ).toBe(START + 20 * HOUR);
  });

  it("does not apply Home Village effects to Builder Base upgrades", () => {
    expect(
      resolve(
        20 * HOUR,
        [effect("builder-potion", START)],
        "builders",
        "builderBase",
      ),
    ).toBe(START + 20 * HOUR);
  });

  it("respects an effect's explicit village when it conflicts with the upgrade village", () => {
    expect(
      resolve(
        20 * HOUR,
        [effect("builder-potion", START, HOUR, "builderBase")],
      ),
    ).toBe(START + 20 * HOUR);
  });

  it("uses the effect's actual start time when a potion begins mid-upgrade", () => {
    const effectStart = START + 5 * HOUR;
    // 5h normal work + 1h at 10x + 5h remaining = 11h total.
    expect(
      resolve(20 * HOUR, [effect("builder-potion", effectStart)]),
    ).toBe(START + 11 * HOUR);
  });

  it("ignores unknown and non-speed item IDs", () => {
    expect(
      resolve(20 * HOUR, [
        effect("not-a-real-item", START),
        effect("book-of-building", START),
      ]),
    ).toBe(START + 20 * HOUR);
  });
});
