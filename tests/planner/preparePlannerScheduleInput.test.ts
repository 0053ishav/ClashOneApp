import { preparePlannerScheduleInput, getPlannerCandidateMaximumLevel } from "@/utils/planner/preparePlannerScheduleInput";
import type { PlannerItemId, PlannedUpgradeItem, ProgressionCandidate } from "@/types/planner";

const item: PlannedUpgradeItem = {
  id: "queue-1" as PlannerItemId,
  candidateId: "entity-level-2",
  targetLevel: 3,
  lane: { lane: "normal-builders", builderIndex: 1 },
  order: 0,
  createdAtMs: 1,
  updatedAtMs: 1,
};

const levelTwo: ProgressionCandidate = {
  candidateId: "entity-level-2",
  entityId: "entity",
  category: "building",
  village: "home",
  currentLevel: 1,
  targetLevel: 2,
  prerequisites: [],
  estimate: {
    cost: { status: "known", value: { gold: 100 } },
    durationMs: { status: "known", value: 1000 },
  },
};

const levelThree: ProgressionCandidate = {
  ...levelTwo,
  candidateId: "entity-level-3",
  currentLevel: 2,
  targetLevel: 3,
  prerequisites: [{ kind: "town-hall-level", minimumLevel: 5 }],
  estimate: {
    cost: { status: "known", value: { elixir: 25, darkElixir: 2 } },
    durationMs: { status: "known", value: 2000 },
  },
};

describe("preparePlannerScheduleInput", () => {
  it("sums every level estimate and includes every level prerequisite for a multi-level target", () => {
    const prepared = preparePlannerScheduleInput([levelTwo, levelThree], [item]);

    expect(prepared.items[0].candidateId).toBe("planner-projection:queue-1");
    expect(prepared.candidates).toHaveLength(1);
    expect(prepared.candidates[0]).toMatchObject({
      currentLevel: 1,
      targetLevel: 3,
      prerequisites: [{ kind: "town-hall-level", minimumLevel: 5 }],
      estimate: {
        cost: { status: "known", value: { gold: 100, elixir: 25, darkElixir: 2 } },
        durationMs: { status: "known", value: 3000 },
      },
    });
  });

  it("keeps a multi-level estimate unknown if any intervening level is unknown", () => {
    const prepared = preparePlannerScheduleInput([
      levelTwo,
      {
        ...levelThree,
        estimate: {
          cost: { status: "unknown", reason: "missing-game-data" },
          durationMs: { status: "unknown", reason: "missing-game-data" },
        },
      },
    ], [item]);

    expect(prepared.candidates[0].estimate.cost).toEqual({
      status: "unknown",
      reason: "missing-game-data",
    });
    expect(prepared.candidates[0].estimate.durationMs).toEqual({
      status: "unknown",
      reason: "missing-game-data",
    });
  });

  it("derives the level stepper bound from all validated levels for the entity", () => {
    expect(getPlannerCandidateMaximumLevel([levelTwo, levelThree], levelTwo.candidateId)).toBe(3);
    expect(getPlannerCandidateMaximumLevel([levelTwo], "missing")).toBeUndefined();
  });
});
