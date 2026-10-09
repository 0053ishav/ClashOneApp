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

  it("rejects combining an instant item and a timed potion", () => {
    const result = simulate({
      selectedItemIds: ["hammer-of-building", "builder-potion"],
      freeBuilderAvailable: true,
    });

    expect(result.completionMode).toBe("timed");
    expect(result.appliedItemIds).toEqual(["builder-potion"]);
    expect(result.rejectedItems).toContainEqual({
      itemId: "hammer-of-building",
      reason: "cannot-combine-instant-and-timed-items",
    });
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
});
