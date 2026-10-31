import {
  addPlannerQueueItem,
  movePlannerQueueItem,
  removePlannerQueueItem,
  updatePlannerQueueItem,
  PlannerQueueError,
} from "@/services/planner/plannerQueueService";
import type {
  PlannerItemId,
  PlannerLaneAssignment,
  PlannedUpgradeItem,
} from "@/types/planner";

const builderOne: PlannerLaneAssignment = {
  lane: "normal-builders",
  builderIndex: 1,
};
const builderTwo: PlannerLaneAssignment = {
  lane: "normal-builders",
  builderIndex: 2,
};
const laboratory: PlannerLaneAssignment = { lane: "laboratory" };

function item(
  id: string,
  order: number,
  lane: PlannerLaneAssignment = builderOne,
): PlannedUpgradeItem {
  return {
    id: id as PlannerItemId,
    candidateId: `candidate-${id}`,
    targetLevel: 2,
    lane,
    order,
    createdAtMs: 100,
    updatedAtMs: 100,
  };
}

function laneIds(items: readonly PlannedUpgradeItem[], lane: PlannerLaneAssignment): string[] {
  return items
    .filter((candidate) =>
      candidate.lane.lane === lane.lane &&
      (candidate.lane.lane !== "normal-builders" ||
        (lane.lane === "normal-builders" &&
          candidate.lane.builderIndex === lane.builderIndex)),
    )
    .sort((a, b) => a.order - b.order)
    .map((candidate) => String(candidate.id));
}

describe("plannerQueueService", () => {
  it("adds to the end of the matching lane and does not mutate input", () => {
    const existing = [item("a", 0), item("b", 1), item("other", 0, laboratory)];
    const result = addPlannerQueueItem(existing, item("c", 50));

    expect(laneIds(result, builderOne)).toEqual(["a", "b", "c"]);
    expect(laneIds(result, laboratory)).toEqual(["other"]);
    expect(existing.map((candidate) => candidate.order)).toEqual([0, 1, 0]);
  });

  it("rejects duplicate item IDs", () => {
    expect(() => addPlannerQueueItem([item("a", 0)], item("a", 1))).toThrow(
      new PlannerQueueError("DUPLICATE_PLANNER_ITEM_ID"),
    );
  });

  it("moves an item and compacts order within its lane only", () => {
    const existing = [
      item("a", 0),
      item("b", 1),
      item("c", 2),
      item("lab", 0, laboratory),
    ];
    const result = movePlannerQueueItem(existing, "c" as PlannerItemId, 0);

    expect(laneIds(result, builderOne)).toEqual(["c", "a", "b"]);
    expect(laneIds(result, laboratory)).toEqual(["lab"]);
    expect(result.find((candidate) => candidate.id === "lab")?.order).toBe(0);
  });

  it("removes an item and compacts its previous lane", () => {
    const result = removePlannerQueueItem(
      [item("a", 0), item("b", 1), item("c", 2), item("lab", 0, laboratory)],
      "b" as PlannerItemId,
    );

    expect(laneIds(result, builderOne)).toEqual(["a", "c"]);
    expect(result.find((candidate) => candidate.id === "c")?.order).toBe(1);
    expect(laneIds(result, laboratory)).toEqual(["lab"]);
  });

  it("preserves position when editing an item in the same lane", () => {
    const result = updatePlannerQueueItem(
      [item("a", 0), item("b", 1), item("c", 2)],
      "b" as PlannerItemId,
      { candidateId: "candidate-b-edited", targetLevel: 3, lane: builderOne },
      200,
    );

    expect(laneIds(result, builderOne)).toEqual(["a", "b", "c"]);
    expect(result.find((candidate) => candidate.id === "b")).toMatchObject({
      candidateId: "candidate-b-edited",
      targetLevel: 3,
      order: 1,
      updatedAtMs: 200,
    });
  });

  it("moves an edited item between lanes and compacts both lanes", () => {
    const result = updatePlannerQueueItem(
      [item("a", 0), item("b", 1), item("lab", 0, laboratory)],
      "a" as PlannerItemId,
      { candidateId: "candidate-a", targetLevel: 3, lane: laboratory },
      250,
    );

    expect(laneIds(result, builderOne)).toEqual(["b"]);
    expect(laneIds(result, laboratory)).toEqual(["lab", "a"]);
    expect(result.find((candidate) => candidate.id === "a")?.order).toBe(1);
  });

  it("keeps different builder lanes independent", () => {
    const result = movePlannerQueueItem(
      [item("a", 0, builderOne), item("b", 0, builderTwo), item("c", 1, builderOne)],
      "c" as PlannerItemId,
      0,
    );

    expect(laneIds(result, builderOne)).toEqual(["c", "a"]);
    expect(laneIds(result, builderTwo)).toEqual(["b"]);
  });

  it("rejects an invalid move position and unknown item", () => {
    expect(() => movePlannerQueueItem([item("a", 0)], "a" as PlannerItemId, -1)).toThrow(
      new PlannerQueueError("INVALID_PLANNER_ORDER"),
    );
    expect(() => removePlannerQueueItem([item("a", 0)], "missing" as PlannerItemId)).toThrow(
      new PlannerQueueError("PLANNER_ITEM_NOT_FOUND"),
    );
  });
});
