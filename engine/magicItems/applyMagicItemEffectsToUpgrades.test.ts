import { applyMagicItemEffectsToUpgrades } from "@/engine/magicItems/applyMagicItemEffectsToUpgrades";
import type { ActiveMagicEffect } from "@/types/magicItem";
import type { Upgrade } from "@/types/upgrade";

const HOUR = 60 * 60 * 1000;
const START = Date.UTC(2026, 0, 1, 0, 0, 0);

function upgrade(overrides: Partial<Upgrade> = {}): Upgrade {
  return {
    id: "upgrade-1",
    accountTag: "#TEST",
    village: "home",
    entity: "Archer Tower",
    type: "BUILDING",
    upgradeType: "BUILDER",
    startTime: START,
    durationMinutes: 20 * 60,
    endTime: START + 20 * HOUR,
    isCompleted: false,
    ...overrides,
  };
}

function builderPotion(): ActiveMagicEffect {
  return {
    id: "effect-1",
    itemId: "builder-potion",
    startedAt: START,
    expiresAt: START + HOUR,
    village: "home",
  };
}

describe("applyMagicItemEffectsToUpgrades", () => {
  it("projects the accelerated completion time and time saved without mutating the input", () => {
    const source = upgrade();
    const result = applyMagicItemEffectsToUpgrades([source], [builderPotion()]);

    expect(result[0]).toEqual({
      ...source,
      endTime: START + 11 * HOUR,
      magicItemTimeSavedMs: 9 * HOUR,
    });
    expect(source.endTime).toBe(START + 20 * HOUR);
    expect(source.magicItemTimeSavedMs).toBeUndefined();
  });

  it("returns the original list when there are no effects", () => {
    const upgrades = [upgrade()];
    expect(applyMagicItemEffectsToUpgrades(upgrades, [])).toBe(upgrades);
  });

  it("does not alter completed upgrades", () => {
    const completed = upgrade({ isCompleted: true });
    const result = applyMagicItemEffectsToUpgrades(
      [completed],
      [builderPotion()],
    );

    expect(result[0]).toBe(completed);
  });

  it("does not accelerate research with a builder-only effect", () => {
    const research = upgrade({ upgradeType: "LAB" });
    const result = applyMagicItemEffectsToUpgrades(
      [research],
      [builderPotion()],
    );

    expect(result[0].endTime).toBe(research.endTime);
    expect(result[0].magicItemTimeSavedMs).toBe(0);
  });

  it("does not produce invalid projections for non-positive durations", () => {
    const invalidDuration = upgrade({
      startTime: START,
      endTime: START,
    });
    const result = applyMagicItemEffectsToUpgrades(
      [invalidDuration],
      [builderPotion()],
    );

    expect(result[0]).toBe(invalidDuration);
  });
});
