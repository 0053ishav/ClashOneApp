import { getPlannerViewModel } from "@/utils/planner/plannerViewModel";
import type { PlannerItemId, UpgradeProjection } from "@/types/planner";

const itemId = "planner-item" as PlannerItemId;

describe("getPlannerViewModel", () => {
  it("summarizes scheduler output without counting blocked or unknown work as scheduled", () => {
    const projections: UpgradeProjection[] = [
      {
        status: "scheduled",
        plannedItemId: itemId,
        startsAtMs: 100,
        completesAtMs: 300,
        estimate: {
          cost: { status: "known", value: { gold: 1200, elixir: 300 } },
          durationMs: { status: "known", value: 200 },
        },
      },
      {
        status: "blocked",
        plannedItemId: "blocked-item" as PlannerItemId,
        reasons: [{ code: "dependency-cycle", itemIds: [itemId] }],
      },
      {
        status: "unknown",
        plannedItemId: "unknown-item" as PlannerItemId,
        reasons: [{ code: "estimate-unknown", estimate: "duration", reason: "missing-game-data" }],
      },
    ];

    expect(getPlannerViewModel(projections, 3)).toMatchObject({
      scheduledCount: 1,
      blockedCount: 1,
      unknownCount: 1,
      projectedFinishMs: 300,
      hasIncompleteWork: true,
      unknownScheduledCostCount: 0,
      resourceTotals: { gold: 1200, elixir: 300, darkElixir: 0 },
    });
  });

  it("keeps unknown scheduled costs out of known totals instead of treating them as zero-cost upgrades", () => {
    const projections: UpgradeProjection[] = [{
      status: "scheduled",
      plannedItemId: itemId,
      startsAtMs: 100,
      completesAtMs: 200,
      estimate: {
        cost: { status: "unknown", reason: "missing-game-data" },
        durationMs: { status: "known", value: 100 },
      },
    }];

    expect(getPlannerViewModel(projections, 1)).toMatchObject({
      scheduledCount: 1,
      projectedFinishMs: 200,
      hasIncompleteWork: false,
      unknownScheduledCostCount: 1,
      resourceTotals: { gold: 0, elixir: 0, darkElixir: 0 },
    });
  });

  it("marks missing projection output as incomplete without inventing a finish date", () => {
    const viewModel = getPlannerViewModel([], 1);
    expect(viewModel.projectedFinishMs).toBeNull();
    expect(viewModel.hasIncompleteWork).toBe(true);
  });
});
