import { simulateUpgrade } from "@/engine/magicItems/simulateUpgrade";
import { DEFAULT_HAMMER_JAM_MANIFEST } from "@/engine/magicItems/hammerJam";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const START = Date.UTC(2026, 10, 3, 12);

const inactiveHammerJam = DEFAULT_HAMMER_JAM_MANIFEST;
const activeHammerJam = {
  ...DEFAULT_HAMMER_JAM_MANIFEST,
  enabled: true,
  startsAt: "2026-11-01T00:00:00.000Z",
  endsAt: "2026-11-17T00:00:00.000Z",
};

function simulate(
  overrides: Partial<Parameters<typeof simulateUpgrade>[0]> = {},
) {
  return simulateUpgrade({
    baseCost: 1_000_000,
    baseDurationMinutes: 120 * 60,
    target: "building",
    workTarget: "builders",
    village: "home",
    startsAt: START,
    hammerJam: inactiveHammerJam,
    ...overrides,
  });
}

describe("simulateUpgrade", () => {
  it("returns base values when no modifiers are selected", () => {
    expect(simulate()).toMatchObject({
      baseCost: 1_000_000,
      effectiveCost: 1_000_000,
      baseDurationMinutes: 7_200,
      effectiveDurationMinutes: 7_200,
      durationSavedMinutes: 0,
      costSaved: 0,
      completionMode: "timed",
      appliedModifierIds: [],
      appliedItemIds: [],
      rejectedItems: [],
    });
  });

  it("previews Hammer Jam cost and duration reductions at the selected start time", () => {
    expect(simulate({ hammerJam: activeHammerJam })).toMatchObject({
      effectiveCost: 500_000,
      effectiveDurationMinutes: 3_600,
      durationSavedMinutes: 3_600,
      costSaved: 500_000,
      appliedModifierIds: ["hammer-jam"],
    });
  });

  it("simulates Builder Potion speed on the Hammer Jam-adjusted duration", () => {
    const result = simulate({
      hammerJam: activeHammerJam,
      selectedItemIds: ["builder-potion"],
    });

    // Hammer Jam halves 120h to 60h; Builder Potion completes 10h of work
    // during its first hour, leaving 50h, for a 51h simulated duration.
    expect(result.effectiveDurationMinutes).toBe(51 * 60);
    expect(result.durationSavedMinutes).toBe(69 * 60);
    expect(result.effectiveCost).toBe(500_000);
    expect(result.appliedItemIds).toEqual(["builder-potion"]);
  });

  it("rejects a potion that does not match the village and work type", () => {
    const result = simulate({
      village: "builderBase",
      selectedItemIds: ["builder-potion"],
    });

    expect(result.appliedItemIds).toEqual([]);
    expect(result.rejectedItems).toEqual([
      {
        itemId: "builder-potion",
        reason: "incompatible-village-or-work-target",
      },
    ]);
  });

  it("simulates research snacks only for research work", () => {
    const result = simulate({
      target: "troop",
      workTarget: "research",
      selectedItemIds: ["study-soup"],
    });

    expect(result.effectiveDurationMinutes).toBe(117 * 60);
    expect(result.appliedItemIds).toEqual(["study-soup"]);
  });

  it("previews an instant Hammer as an instant next-level upgrade", () => {
    expect(
      simulate({
        selectedItemIds: ["hammer-of-building"],
        freeBuilderAvailable: true,
      }),
    ).toMatchObject({
      effectiveCost: 0,
      effectiveDurationMinutes: 0,
      durationSavedMinutes: 7_200,
      costSaved: 1_000_000,
      completionMode: "instant-upgrade",
      appliedItemIds: ["hammer-of-building"],
    });
  });

  it("does not apply a Book to a planned upgrade without an active timer", () => {
    const result = simulate({ selectedItemIds: ["book-of-building"] });

    expect(result.completionMode).toBe("timed");
    expect(result.appliedItemIds).toEqual([]);
    expect(result.rejectedItems).toEqual([
      { itemId: "book-of-building", reason: "no-active-upgrade" },
    ]);
  });

  it("previews a Book against an existing active upgrade", () => {
    expect(
      simulate({
        selectedItemIds: ["book-of-building"],
        hasActiveUpgrade: true,
      }),
    ).toMatchObject({
      effectiveDurationMinutes: 0,
      completionMode: "instant-complete",
      appliedItemIds: ["book-of-building"],
      costSaved: 0,
    });
  });

  it("rejects combining an instant item and a timed potion independent of selection order", () => {
    const forward = simulate({
      selectedItemIds: ["hammer-of-building", "builder-potion"],
      freeBuilderAvailable: true,
    });
    const reversed = simulate({
      selectedItemIds: ["builder-potion", "hammer-of-building"],
      freeBuilderAvailable: true,
    });

    expect(forward).toEqual(reversed);
    expect(forward.completionMode).toBe("timed");
    expect(forward.appliedItemIds).toEqual(["builder-potion"]);
    expect(forward.rejectedItems).toContainEqual({
      itemId: "hammer-of-building",
      reason: "cannot-combine-instant-and-timed-items",
    });
  });

  it("rejects multiple compatible instant items instead of choosing one by selection order", () => {
    const forward = simulate({
      selectedItemIds: ["book-of-building", "book-of-everything"],
      hasActiveUpgrade: true,
    });
    const reversed = simulate({
      selectedItemIds: ["book-of-everything", "book-of-building"],
      hasActiveUpgrade: true,
    });

    expect(forward).toEqual(reversed);
    expect(forward.completionMode).toBe("timed");
    expect(forward.appliedItemIds).toEqual([]);
    expect(forward.rejectedItems).toEqual([
      { itemId: "book-of-building", reason: "cannot-combine-instant-items" },
      { itemId: "book-of-everything", reason: "cannot-combine-instant-items" },
    ]);
  });

  it("deduplicates repeated selections so one item is only applied once", () => {
    const single = simulate({ selectedItemIds: ["builder-potion"] });
    const repeated = simulate({
      selectedItemIds: ["builder-potion", "builder-potion", "builder-potion"],
    });

    expect(repeated).toEqual(single);
  });

  it("ignores non-finite Hammer Jam multipliers instead of corrupting simulated values", () => {
    const result = simulate({
      hammerJam: {
        ...activeHammerJam,
        timeMultiplier: Number.NaN,
        costMultiplier: Number.POSITIVE_INFINITY,
      },
    });

    expect(result.effectiveCost).toBe(1_000_000);
    expect(result.effectiveDurationMinutes).toBe(7_200);
    expect(result.appliedModifierIds).toEqual([]);
  });

  it("rejects invalid input values", () => {
    expect(() => simulate({ baseCost: -1 })).toThrow("INVALID_BASE_UPGRADE_COST");
    expect(() => simulate({ baseDurationMinutes: Number.NaN })).toThrow(
      "INVALID_BASE_UPGRADE_DURATION",
    );
    expect(() => simulate({ startsAt: Number.NaN })).toThrow(
      "INVALID_UPGRADE_START_TIMESTAMP",
    );
  });
  it("applies a Gold Pass Builder Boost to a planned upgrade", () => {
    const result = simulate({
      goldPassBoost: { target: "builder", percent: 20 },
    });

    expect(result.effectiveCost).toBe(800_000);
    expect(result.costSaved).toBe(200_000);
    expect(result.effectiveDurationMinutes).toBe(96 * 60);
    expect(result.durationSavedMinutes).toBe(24 * 60);
    expect(result.appliedModifierIds).toEqual(["gold-pass-builder-boost"]);
  });

  it("compounds Gold Pass with Hammer Jam before resolving potion speed", () => {
    const result = simulate({
      hammerJam: activeHammerJam,
      goldPassBoost: { target: "builder", percent: 20 },
    });

    // 120h × 0.5 Hammer Jam × 0.8 Gold Pass = 48h.
    expect(result.effectiveCost).toBe(400_000);
    expect(result.costSaved).toBe(600_000);
    expect(result.effectiveDurationMinutes).toBe(48 * 60);
    expect(result.durationSavedMinutes).toBe(72 * 60);
    expect(result.appliedModifierIds).toEqual([
      "hammer-jam",
      "gold-pass-builder-boost",
    ]);
  });

  it("does not apply Gold Pass to Builder Base upgrades", () => {
    const result = simulate({
      village: "builderBase",
      goldPassBoost: { target: "builder", percent: 20 },
    });

    expect(result.effectiveCost).toBe(1_000_000);
    expect(result.effectiveDurationMinutes).toBe(7_200);
    expect(result.appliedModifierIds).toEqual([]);
  });

  it("applies Research Boost to Home Village pet upgrades", () => {
    const result = simulate({
      target: "pet",
      workTarget: "pet",
      goldPassBoost: { target: "research", percent: 20 },
    });

    expect(result.effectiveCost).toBe(800_000);
    expect(result.costSaved).toBe(200_000);
    expect(result.effectiveDurationMinutes).toBe(96 * 60);
    expect(result.durationSavedMinutes).toBe(24 * 60);
    expect(result.appliedModifierIds).toEqual(["gold-pass-research-boost"]);
  });

  it("applies Research Gold Pass Boost to planned research work", () => {
    const result = simulate({
      target: "troop",
      workTarget: "research",
      goldPassBoost: { target: "research", percent: 15 },
    });

    expect(result.effectiveCost).toBe(850_000);
    expect(result.costSaved).toBe(150_000);
    expect(result.effectiveDurationMinutes).toBe(102 * 60);
    expect(result.durationSavedMinutes).toBe(18 * 60);
    expect(result.appliedModifierIds).toEqual(["gold-pass-research-boost"]);
  });
});
