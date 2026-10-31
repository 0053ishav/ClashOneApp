import { getPlannerPlan } from "@/services/plannerPersistenceService";
import { recalculatePlannerProjection } from "@/services/plannerApplicationService";
import type { PlannerPlan, PlannerPlanId, ProgressionCandidate } from "@/types/planner";

jest.mock("@/services/plannerPersistenceService", () => ({
  getPlannerPlan: jest.fn(),
}));

const mockedGetPlannerPlan = jest.mocked(getPlannerPlan);
const NOW = 1_800_000_000_000;
const PLAN_ID = "plan-1" as PlannerPlanId;

function makePlan(): PlannerPlan {
  return {
    id: PLAN_ID,
    accountTag: "#PLAYER",
    village: "home",
    createdAtMs: NOW - 1000,
    updatedAtMs: NOW,
    items: [{
      id: "item-1" as PlannerPlan["items"][number]["id"],
      candidateId: "building:1:2",
      targetLevel: 2,
      lane: { lane: "normal-builders", builderIndex: 1 },
      order: 0,
      createdAtMs: NOW,
      updatedAtMs: NOW,
    }],
  };
}

function candidate(durationMs: number): ProgressionCandidate {
  return {
    candidateId: "building:1:2",
    entityId: "building:1",
    category: "building",
    village: "home",
    currentLevel: 1,
    targetLevel: 2,
    prerequisites: [],
    estimate: {
      cost: { status: "known", value: { gold: 100 } },
      durationMs: { status: "known", value: durationMs },
    },
  };
}

const context = {
  accountTag: "#PLAYER",
  planId: PLAN_ID,
  nowMs: NOW,
  candidates: [candidate(60_000)],
  observedActiveUpgrades: [],
  prerequisiteState: {
    townHallLevel: 16,
    laboratoryLevel: 12,
    petHouseLevel: 10,
    entityLevels: {},
  },
  laneAvailability: {
    normalBuilderCount: 5,
    goblinBuilderEligible: false,
    goblinLaboratoryEligible: false,
  },
};

describe("recalculatePlannerProjection", () => {
  beforeEach(() => mockedGetPlannerPlan.mockReset());

  it("rejects a blank account tag before accessing persistence", async () => {
    await expect(recalculatePlannerProjection({
      ...context,
      accountTag: "   ",
    })).rejects.toThrow("INVALID_ACCOUNT_TAG");
    expect(mockedGetPlannerPlan).not.toHaveBeenCalled();
  });

  it("rejects a blank plan ID before accessing persistence", async () => {
    await expect(recalculatePlannerProjection({
      ...context,
      planId: "   " as PlannerPlanId,
    })).rejects.toThrow("INVALID_PLANNER_PLAN_ID");
    expect(mockedGetPlannerPlan).not.toHaveBeenCalled();
  });

  it("recalculates schedule output from the account-owned plan and current context", async () => {
    mockedGetPlannerPlan.mockResolvedValue(makePlan());

    const result = await recalculatePlannerProjection(context);

    expect(mockedGetPlannerPlan).toHaveBeenCalledWith("#PLAYER", PLAN_ID);
    expect(result).toEqual(expect.objectContaining({
      accountTag: "#PLAYER",
      planId: PLAN_ID,
      calculatedAtMs: NOW,
      projections: [expect.objectContaining({
        status: "scheduled",
        plannedItemId: "item-1",
        startsAtMs: NOW,
        completesAtMs: NOW + 60_000,
      })],
    }));
  });

  it("recalculates instead of returning a stale cached projection", async () => {
    mockedGetPlannerPlan.mockResolvedValue(makePlan());

    const first = await recalculatePlannerProjection(context);
    const second = await recalculatePlannerProjection({
      ...context,
      nowMs: NOW + 10_000,
      candidates: [candidate(120_000)],
    });

    expect(first?.projections[0]).toEqual(expect.objectContaining({
      startsAtMs: NOW,
      completesAtMs: NOW + 60_000,
    }));
    expect(second?.projections[0]).toEqual(expect.objectContaining({
      startsAtMs: NOW + 10_000,
      completesAtMs: NOW + 130_000,
    }));
  });

  it("ignores observed timers belonging to another account", async () => {
    mockedGetPlannerPlan.mockResolvedValue(makePlan());

    const result = await recalculatePlannerProjection({
      ...context,
      observedActiveUpgrades: [{
        observedUpgradeId: "other-account-timer",
        accountTag: "#OTHER",
        village: "home",
        lane: { lane: "normal-builders", builderIndex: 1 },
        startsAtMs: NOW - 1000,
        completesAtMs: NOW + 90_000,
        source: "manual",
      }],
    });

    expect(result?.projections[0]).toEqual(expect.objectContaining({
      status: "scheduled",
      startsAtMs: NOW,
    }));
  });

  it("returns null when the requested account does not own the plan", async () => {
    mockedGetPlannerPlan.mockResolvedValue(null);

    await expect(recalculatePlannerProjection(context)).resolves.toBeNull();
  });

  it("rejects invalid clock input before accessing persistence", async () => {
    await expect(recalculatePlannerProjection({
      ...context,
      nowMs: Number.NaN,
    })).rejects.toThrow("INVALID_PLANNER_TIMESTAMP");
    expect(mockedGetPlannerPlan).not.toHaveBeenCalled();
  });
});
