import {
  isKnownEstimate,
  type Estimate,
  type PlannerLaneAssignment,
  type PlannedUpgradeItem,
  type UpgradeEstimate,
} from "@/types/planner";

describe("planner domain contracts", () => {
  it("models all five lanes without mixing lane-specific fields", () => {
    const assignments: PlannerLaneAssignment[] = [
      { lane: "normal-builders", builderIndex: 1 },
      { lane: "laboratory" },
      { lane: "pets" },
      { lane: "goblin-builder" },
      { lane: "goblin-laboratory" },
    ];

    expect(assignments.map(({ lane }) => lane)).toEqual([
      "normal-builders",
      "laboratory",
      "pets",
      "goblin-builder",
      "goblin-laboratory",
    ]);
  });

  it("rejects builder-only fields on serial lanes at compile time", () => {
    // @ts-expect-error builderIndex is only valid for the Normal Builders lane
    const invalidAssignment: PlannerLaneAssignment = { lane: "pets", builderIndex: 1 };

    expect(invalidAssignment.lane).toBe("pets");
  });

  it("distinguishes a known zero from an unknown estimate", () => {
    const instantDuration: Estimate<number> = { status: "known", value: 0 };
    const missingDuration: Estimate<number> = {
      status: "unknown",
      reason: "missing-game-data",
    };

    expect(isKnownEstimate(instantDuration)).toBe(true);
    expect(isKnownEstimate(instantDuration) && instantDuration.value).toBe(0);
    expect(isKnownEstimate(missingDuration)).toBe(false);
  });

  it("keeps planned items separate from live upgrade timer fields", () => {
    const item: PlannedUpgradeItem = {
      id: "plan-item-1" as PlannedUpgradeItem["id"],
      candidateId: "building:1000001:2",
      targetLevel: 2,
      lane: { lane: "normal-builders", builderIndex: 1 },
      order: 0,
      createdAtMs: 1_800_000_000_000,
      updatedAtMs: 1_800_000_000_000,
    };

    const estimate: UpgradeEstimate = {
      cost: { status: "known", value: { gold: 0 } },
      durationMs: { status: "known", value: 0 },
    };

    expect(item).not.toHaveProperty("startsAtMs");
    expect(item).not.toHaveProperty("completesAtMs");
    expect(estimate.durationMs).toEqual({ status: "known", value: 0 });
  });
});
