import { applyMagicItemEffectsToUpgrades } from "@/engine/magicItems/applyMagicItemEffectsToUpgrades";
import type { ActiveMagicEffect } from "@/types/magicItem";
import type { Upgrade } from "@/types/upgrade";

const startedAt = 1_000_000;
const baseUpgrade: Upgrade = {
  id: "upgrade-1",
  accountTag: "#ACCOUNT",
  village: "home",
  dataId: 1,
  entity: "Archer Tower",
  type: "BUILDING",
  upgradeType: "BUILDER",
  startTime: startedAt,
  durationMinutes: 20 * 60,
  endTime: startedAt + 20 * 60 * 60 * 1000,
  isCompleted: false,
};

describe("applyMagicItemEffectsToUpgrades", () => {
  const builderPotion: ActiveMagicEffect = {
    id: "effect-1",
    itemId: "builder-potion",
    startedAt,
    expiresAt: startedAt + 60 * 60 * 1000,
    village: "home",
  };

  it("projects the accelerated finish time without mutating the baseline upgrade", () => {
    const result = applyMagicItemEffectsToUpgrades([baseUpgrade], [builderPotion]);

    expect(result[0].endTime).toBe(startedAt + 11 * 60 * 60 * 1000);
    expect(baseUpgrade.endTime).toBe(startedAt + 20 * 60 * 60 * 1000);
  });

  it("does not apply a Home Village potion to Builder Base timers", () => {
    const result = applyMagicItemEffectsToUpgrades(
      [{ ...baseUpgrade, village: "builderBase" }],
      [builderPotion],
    );

    expect(result[0].endTime).toBe(baseUpgrade.endTime);
  });

  it("maps laboratory and pet upgrades to their own effect targets", () => {
    const research: Upgrade = {
      ...baseUpgrade,
      id: "research-1",
      upgradeType: "LAB",
      type: "LAB",
    };
    const pet: Upgrade = {
      ...baseUpgrade,
      id: "pet-1",
      upgradeType: "PET",
      type: "PET",
    };
    const effects: ActiveMagicEffect[] = [
      {
        id: "research-effect",
        itemId: "research-potion",
        startedAt,
        expiresAt: startedAt + 60 * 60 * 1000,
        village: "home",
      },
      {
        id: "pet-effect",
        itemId: "pet-potion",
        startedAt,
        expiresAt: startedAt + 60 * 60 * 1000,
        village: "home",
      },
    ];

    const result = applyMagicItemEffectsToUpgrades([research, pet], effects);
    expect(result.map((upgrade) => upgrade.endTime)).toEqual([
      startedAt + 17 * 60 * 60 * 1000,
      startedAt + 17 * 60 * 60 * 1000,
    ]);
  });

  it("uses expired effects to preserve work completed during their active window", () => {
    const expiredEffect = {
      ...builderPotion,
      expiresAt: startedAt + 60 * 60 * 1000,
    };
    const result = applyMagicItemEffectsToUpgrades(
      [baseUpgrade],
      [expiredEffect],
    );

    expect(result[0].endTime).toBe(startedAt + 11 * 60 * 60 * 1000);
  });

  it("does not modify completed upgrades", () => {
    const completed = { ...baseUpgrade, isCompleted: true };
    expect(applyMagicItemEffectsToUpgrades([completed], [builderPotion])[0]).toBe(completed);
  });
});
