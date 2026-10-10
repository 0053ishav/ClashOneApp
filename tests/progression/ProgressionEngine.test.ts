import { DEFAULT_HAMMER_JAM_MANIFEST } from "@/engine/magicItems/hammerJam";
import { ProgressionEngine } from "@/engine/progression/ProgressionEngine";
import { ProgressionResolver } from "@/engine/progression/ProgressionResolver";
import type { ProgressionInput } from "@/engine/progression/models";
import type { ProgressionData } from "@/types/progression";
import { ResourceType } from "@/types/resource";

const EVENT_START = Date.parse("2026-11-01T00:00:00+05:30");
const EVENT_END = Date.parse("2026-11-17T00:00:00+05:30");

const progressionData: ProgressionData = {
  id: 101,
  resource: ResourceType.GOLD,
  maxLevel: 3,
  maxHallLevel: 16,
  levels: {
    1: { hallLevel: 1, cost: 100, upgradeTime: 30 },
    2: { hallLevel: 1, cost: 1_000, upgradeTime: 120 },
    3: { hallLevel: 1, cost: 2_000, upgradeTime: 240 },
  },
};

function resolve(
  overrides: Partial<ProgressionInput> = {},
) {
  const input: ProgressionInput = {
    entity: {
      id: 101,
      slug: "archer-tower",
      category: "building",
      village: "home",
      maxLevel: 3,
    },
    progression: progressionData,
    currentLevel: 1,
    currentHallLevel: 16,
    ...overrides,
  };

  return ProgressionEngine.resolve(ProgressionResolver.resolve(input));
}

const activeHammerJam = {
  ...DEFAULT_HAMMER_JAM_MANIFEST,
  enabled: true,
  startsAt: new Date(EVENT_START).toISOString(),
  endsAt: new Date(EVENT_END).toISOString(),
};

describe("ProgressionEngine Hammer Jam modifiers", () => {
  it("preserves base values when no upgrade start context is supplied", () => {
    const result = resolve();

    expect(result).toMatchObject({
      baseNextCost: 1_000,
      nextCost: 1_000,
      baseNextUpgradeTime: 120,
      nextUpgradeTime: 120,
      appliedModifierIds: [],
    });
  });

  it("applies eligible time and cost multipliers to the next level while preserving base values", () => {
    const result = resolve({
      upgradeStartContext: {
        startsAt: EVENT_START,
        hammerJam: activeHammerJam,
      },
    });

    expect(result).toMatchObject({
      baseNextCost: 1_000,
      nextCost: 500,
      baseNextUpgradeTime: 120,
      nextUpgradeTime: 60,
      appliedModifierIds: ["hammer-jam"],
      remainingCost: 3_000,
      remainingUpgradeTime: 360,
    });
  });

  it("does not apply Hammer Jam to unsupported entity categories", () => {
    const result = resolve({
      entity: {
        id: 101,
        slug: "spring-trap",
        category: "trap",
        village: "home",
        maxLevel: 3,
      },
      upgradeStartContext: {
        startsAt: EVENT_START,
        hammerJam: activeHammerJam,
      },
    });

    expect(result).toMatchObject({
      baseNextCost: 1_000,
      nextCost: 1_000,
      baseNextUpgradeTime: 120,
      nextUpgradeTime: 120,
      appliedModifierIds: [],
    });
  });

  it("does not apply a Home Village event modifier to Builder Base entities", () => {
    const result = resolve({
      entity: {
        id: 101,
        slug: "builder-hall-building",
        category: "building",
        village: "builderBase",
        maxLevel: 3,
      },
      upgradeStartContext: {
        startsAt: EVENT_START,
        hammerJam: activeHammerJam,
      },
    });

    expect(result.nextCost).toBe(1_000);
    expect(result.nextUpgradeTime).toBe(120);
    expect(result.appliedModifierIds).toEqual([]);
  });

  it("uses base values when the upgrade start is outside the event window", () => {
    const result = resolve({
      upgradeStartContext: {
        startsAt: EVENT_START - 1,
        hammerJam: activeHammerJam,
      },
    });

    expect(result.nextCost).toBe(1_000);
    expect(result.nextUpgradeTime).toBe(120);
    expect(result.appliedModifierIds).toEqual([]);
  });

  it("does not calculate event-adjusted values when the entity is already maxed", () => {
    const result = resolve({
      currentLevel: 3,
      upgradeStartContext: {
        startsAt: EVENT_START,
        hammerJam: activeHammerJam,
      },
    });

    expect(result.baseNextCost).toBeUndefined();
    expect(result.baseNextUpgradeTime).toBeUndefined();
    expect(result.nextCost).toBeUndefined();
    expect(result.nextUpgradeTime).toBeUndefined();
    expect(result.appliedModifierIds).toEqual([]);
  });

  it("keeps missing duration data undefined while still applying an eligible cost modifier", () => {
    const dataWithoutDuration: ProgressionData = {
      ...progressionData,
      levels: {
        ...progressionData.levels,
        2: { hallLevel: 1, cost: 1_000 },
      },
    };

    const result = resolve({
      progression: dataWithoutDuration,
      upgradeStartContext: {
        startsAt: EVENT_START,
        hammerJam: activeHammerJam,
      },
    });

    expect(result.nextCost).toBe(500);
    expect(result.baseNextUpgradeTime).toBeUndefined();
    expect(result.nextUpgradeTime).toBeUndefined();
    expect(result.appliedModifierIds).toEqual(["hammer-jam"]);
  });

  it("rejects invalid start timestamps instead of silently using the base values", () => {
    expect(() =>
      resolve({
        upgradeStartContext: {
          startsAt: Number.NaN,
          hammerJam: activeHammerJam,
        },
      }),
    ).toThrow("INVALID_UPGRADE_START_TIMESTAMP");
  });
});
