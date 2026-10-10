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
  resourceMultiplier: 2,
};

describe("ProgressionEngine modifiers", () => {
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

  it("keeps missing cost data undefined while still applying an eligible duration modifier", () => {
    const dataWithoutCost: ProgressionData = {
      ...progressionData,
      levels: {
        ...progressionData.levels,
        // Simulate a malformed remote payload that violates the ProgressionLevel contract.
        2: { hallLevel: 1, upgradeTime: 120 } as unknown as ProgressionData["levels"][number],
      },
    };

    const result = resolve({
      progression: dataWithoutCost,
      upgradeStartContext: {
        startsAt: EVENT_START,
        hammerJam: activeHammerJam,
      },
    });

    expect(result.baseNextCost).toBeUndefined();
    expect(result.nextCost).toBeUndefined();
    expect(result.baseNextUpgradeTime).toBe(120);
    expect(result.nextUpgradeTime).toBe(60);
    expect(result.appliedModifierIds).toEqual(["hammer-jam"]);
  });

  it("applies the configured resource multiplier to production stats and preserves base stats", () => {
    const productionData: ProgressionData = {
      ...progressionData,
      levels: {
        ...progressionData.levels,
        1: {
          hallLevel: 1,
          cost: 100,
          upgradeTime: 30,
          stats: { production: 100, hitpoints: 500 },
        },
        2: {
          hallLevel: 1,
          cost: 1_000,
          upgradeTime: 120,
          stats: { production: 150, hitpoints: 600 },
        },
      },
    };

    const result = resolve({
      progression: productionData,
      resourceProductionContext: {
        at: EVENT_START,
        hammerJam: activeHammerJam,
      },
    });

    expect(result.baseCurrentStats).toEqual({ production: 100, hitpoints: 500 });
    expect(result.baseNextStats).toEqual({ production: 150, hitpoints: 600 });
    expect(result.currentStats).toEqual({ production: 200, hitpoints: 500 });
    expect(result.nextStats).toEqual({ production: 300, hitpoints: 600 });
    expect(result.appliedResourceModifierIds).toEqual([
      "hammer-jam-resource-production",
    ]);
  });

  it("does not apply resource production modifiers to unsupported categories or villages", () => {
    const productionData: ProgressionData = {
      ...progressionData,
      levels: {
        ...progressionData.levels,
        1: { hallLevel: 1, cost: 100, upgradeTime: 30, stats: { production: 100 } },
        2: { hallLevel: 1, cost: 1_000, upgradeTime: 120, stats: { production: 150 } },
      },
    };
    const context = {
      at: EVENT_START,
      hammerJam: activeHammerJam,
    };

    const trap = resolve({
      progression: productionData,
      entity: {
        id: 101,
        slug: "spring-trap",
        category: "trap",
        village: "home",
        maxLevel: 3,
      },
      resourceProductionContext: context,
    });
    const builderBase = resolve({
      progression: productionData,
      entity: {
        id: 101,
        slug: "builder-hall-building",
        category: "building",
        village: "builderBase",
        maxLevel: 3,
      },
      resourceProductionContext: context,
    });

    expect(trap.currentStats.production).toBe(100);
    expect(trap.nextStats.production).toBe(150);
    expect(builderBase.currentStats.production).toBe(100);
    expect(builderBase.nextStats.production).toBe(150);
    expect(trap.appliedResourceModifierIds).toEqual([]);
    expect(builderBase.appliedResourceModifierIds).toEqual([]);
  });

  it("rejects invalid resource production timestamps", () => {
    expect(() => resolve({
      resourceProductionContext: {
        at: Number.NaN,
        hammerJam: activeHammerJam,
      },
    })).toThrow("INVALID_RESOURCE_PRODUCTION_TIMESTAMP");
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
  it.each([
    { percent: 0, cost: 1_000, duration: 120, remainingCost: 3_000, remaining: 360, ids: [] },
    { percent: 10, cost: 900, duration: 108, remainingCost: 2_700, remaining: 324, ids: ["gold-pass-builder-boost"] },
    { percent: 15, cost: 850, duration: 102, remainingCost: 2_550, remaining: 306, ids: ["gold-pass-builder-boost"] },
    { percent: 20, cost: 800, duration: 96, remainingCost: 2_400, remaining: 288, ids: ["gold-pass-builder-boost"] },
  ] as const)(
    "applies the Builder Boost percentage $percent to cost and time",
    ({ percent, cost, duration, remainingCost, remaining, ids }) => {
      const result = resolve({
        goldPassBoost: { target: "builder", percent },
      });

      expect(result).toMatchObject({
        baseNextCost: 1_000,
        nextCost: cost,
        baseNextUpgradeTime: 120,
        nextUpgradeTime: duration,
        remainingCost,
        remainingUpgradeTime: remaining,
        appliedModifierIds: ids,
      });
    },
  );

  it("compounds Gold Pass with Hammer Jam without intermediate duration rounding", () => {
    const result = resolve({
      goldPassBoost: { target: "builder", percent: 20 },
      upgradeStartContext: {
        startsAt: EVENT_START,
        hammerJam: activeHammerJam,
      },
    });

    expect(result).toMatchObject({
      baseNextUpgradeTime: 120,
      nextUpgradeTime: 48,
      nextCost: 400,
      remainingCost: 2_400,
      remainingUpgradeTime: 288,
      appliedModifierIds: ["hammer-jam", "gold-pass-builder-boost"],
    });
  });

  it("uses the explicitly selected Research Gold Pass percentage", () => {
    const result = resolve({
      entity: {
        id: 101,
        slug: "archer",
        category: "troop",
        village: "home",
        maxLevel: 3,
      },
      goldPassBoost: { target: "research", percent: 15 },
    });

    expect(result).toMatchObject({
      baseNextCost: 1_000,
      nextCost: 850,
      remainingCost: 2_550,
      baseNextUpgradeTime: 120,
      nextUpgradeTime: 102,
      remainingUpgradeTime: 306,
      appliedModifierIds: ["gold-pass-research-boost"],
    });
  });

  it("applies Builder Boost to Home Village heroes", () => {
    const result = resolve({
      entity: {
        id: 101,
        slug: "barbarian-king",
        category: "hero",
        village: "home",
        maxLevel: 3,
      },
      goldPassBoost: { target: "builder", percent: 15 },
    });

    expect(result).toMatchObject({
      nextCost: 850,
      nextUpgradeTime: 102,
      remainingCost: 2_550,
      remainingUpgradeTime: 306,
      appliedModifierIds: ["gold-pass-builder-boost"],
    });
  });

  it("does not apply Builder Boost to Builder Base buildings", () => {
    const result = resolve({
      entity: {
        id: 101,
        slug: "builder-hall-building",
        category: "building",
        village: "builderBase",
        maxLevel: 3,
      },
      goldPassBoost: { target: "builder", percent: 20 },
    });

    expect(result).toMatchObject({
      baseNextCost: 1_000,
      nextCost: 1_000,
      baseNextUpgradeTime: 120,
      nextUpgradeTime: 120,
      appliedModifierIds: [],
    });
  });

  it("applies Research Boost to Home Village pet upgrades", () => {
    const result = resolve({
      entity: {
        id: 101,
        slug: "pet",
        category: "pet",
        village: "home",
        maxLevel: 3,
      },
      goldPassBoost: { target: "research", percent: 20 },
    });

    expect(result).toMatchObject({
      baseNextCost: 1_000,
      nextCost: 800,
      remainingCost: 2_400,
      baseNextUpgradeTime: 120,
      nextUpgradeTime: 96,
      remainingUpgradeTime: 288,
      appliedModifierIds: ["gold-pass-research-boost"],
    });
  });

  it("applies Builder Boost to Home Village traps", () => {
    const result = resolve({
      entity: {
        id: 101,
        slug: "spring-trap",
        category: "trap",
        village: "home",
        maxLevel: 3,
      },
      goldPassBoost: { target: "builder", percent: 20 },
    });

    expect(result).toMatchObject({
      baseNextCost: 1_000,
      nextCost: 800,
      remainingCost: 2_400,
      baseNextUpgradeTime: 120,
      nextUpgradeTime: 96,
      remainingUpgradeTime: 288,
      appliedModifierIds: ["gold-pass-builder-boost"],
    });
  });

  it.each(["crafted", "townhall", "builderhall", "guardian"] as const)(
    "applies Builder Boost to Home Village %s upgrades",
    (entityType) => {
      const result = resolve({
        entity: {
          id: 101,
          slug: entityType,
          category: entityType,
          village: "home",
          maxLevel: 3,
        },
        goldPassBoost: { target: "builder", percent: 15 },
      });

      expect(result).toMatchObject({
        nextCost: 850,
        nextUpgradeTime: 102,
        remainingCost: 2_550,
        remainingUpgradeTime: 306,
        appliedModifierIds: ["gold-pass-builder-boost"],
      });
    },
  );

  it("rejects an unsupported Gold Pass percentage at the engine boundary", () => {
    expect(() =>
      resolve({
        goldPassBoost: {
          target: "builder",
          percent: 12 as unknown as 0 | 10 | 15 | 20,
        },
        upgradeStartContext: {
          startsAt: EVENT_START,
          hammerJam: activeHammerJam,
        },
      }),
    ).toThrow("INVALID_GOLD_PASS_BOOST_PERCENT");
  });
});
