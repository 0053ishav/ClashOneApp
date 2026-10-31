import {
  schedulePlanner,
  type SchedulePlannerInput,
} from "@/utils/planner/schedulePlanner";
import type {
  PlannedUpgradeItem,
  ProgressionCandidate,
  ObservedActiveUpgrade,
} from "@/types/planner";

const NOW = 1_800_000_000_000;

function candidate(
  candidateId: string,
  laneCategory: ProgressionCandidate["category"] = "building",
  overrides: Partial<ProgressionCandidate> = {},
): ProgressionCandidate {
  return {
    candidateId,
    entityId: candidateId,
    category: laneCategory,
    village: "home",
    currentLevel: 1,
    targetLevel: 3,
    prerequisites: [],
    estimate: {
      cost: { status: "known", value: { gold: 100 } },
      durationMs: { status: "known", value: 60_000 },
    },
    ...overrides,
  };
}

function item(
  id: string,
  candidateId: string,
  lane: PlannedUpgradeItem["lane"] = { lane: "normal-builders", builderIndex: 1 },
  order = 0,
  targetLevel = 2,
): PlannedUpgradeItem {
  return {
    id: id as PlannedUpgradeItem["id"],
    candidateId,
    targetLevel,
    lane,
    order,
    createdAtMs: NOW,
    updatedAtMs: NOW,
  };
}

function input(overrides: Partial<SchedulePlannerInput> = {}): SchedulePlannerInput {
  return {
    nowMs: NOW,
    candidates: [candidate("a"), candidate("b")],
    items: [item("a-item", "a"), item("b-item", "b", { lane: "normal-builders", builderIndex: 2 })],
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
    ...overrides,
  };
}

describe("schedulePlanner", () => {
  it("is deterministic and allows different builder lanes to run concurrently", () => {
    const scenario = input();
    const first = schedulePlanner(scenario);
    expect(schedulePlanner(scenario)).toEqual(first);
    expect(first).toEqual([
      expect.objectContaining({ status: "scheduled", startsAtMs: NOW, completesAtMs: NOW + 60_000 }),
      expect.objectContaining({ status: "scheduled", startsAtMs: NOW, completesAtMs: NOW + 60_000 }),
    ]);
  });

  it("waits for an occupied lane to become available", () => {
    const observed: ObservedActiveUpgrade = {
      observedUpgradeId: "live-1",
      accountTag: "#PLAYER",
      village: "home",
      lane: { lane: "normal-builders", builderIndex: 1 },
      startsAtMs: NOW - 10_000,
      completesAtMs: NOW + 90_000,
      source: "village-import",
    };
    const result = schedulePlanner(input({
      items: [item("a-item", "a")],
      observedActiveUpgrades: [observed],
    }));
    expect(result[0]).toEqual(expect.objectContaining({
      status: "scheduled",
      startsAtMs: NOW + 90_000,
      completesAtMs: NOW + 150_000,
    }));
  });

  it("does not treat an unknown observed end as free", () => {
    const observed: ObservedActiveUpgrade = {
      observedUpgradeId: "live-unknown",
      accountTag: "#PLAYER",
      village: "home",
      lane: { lane: "laboratory" },
      startsAtMs: NOW - 10_000,
      completesAtMs: Number.NaN,
      source: "manual",
    };
    const result = schedulePlanner(input({
      candidates: [candidate("lab", "troop")],
      items: [item("lab-item", "lab", { lane: "laboratory" })],
      observedActiveUpgrades: [observed],
    }));
    expect(result[0]).toEqual(expect.objectContaining({
      status: "blocked",
      reasons: [expect.objectContaining({ code: "lane-unavailable", lane: "laboratory" })],
    }));
  });

  it("keeps unknown durations unknown instead of scheduling them as zero", () => {
    const unknown = candidate("a", "building", {
      estimate: {
        cost: { status: "known", value: { gold: 0 } },
        durationMs: { status: "unknown", reason: "missing-game-data" },
      },
    });
    const result = schedulePlanner(input({
      candidates: [unknown],
      items: [item("a-item", "a")],
    }));
    expect(result[0]).toEqual(expect.objectContaining({
      status: "unknown",
      reasons: [expect.objectContaining({ code: "estimate-unknown", estimate: "duration" })],
    }));
  });

  it("allows known zero-duration tasks without occupying the lane", () => {
    const instant = candidate("a", "building", {
      estimate: {
        cost: { status: "known", value: { gold: 0 } },
        durationMs: { status: "known", value: 0 },
      },
    });
    const result = schedulePlanner(input({
      candidates: [instant, candidate("b")],
      items: [item("instant", "a", { lane: "normal-builders", builderIndex: 1 }, 0), item("after", "b", { lane: "normal-builders", builderIndex: 1 }, 1)],
    }));
    expect(result).toEqual([
      expect.objectContaining({ status: "scheduled", startsAtMs: NOW, completesAtMs: NOW }),
      expect.objectContaining({ status: "scheduled", startsAtMs: NOW, completesAtMs: NOW + 60_000 }),
    ]);
  });

  it("preserves lane order and schedules later work after earlier work", () => {
    const result = schedulePlanner(input({
      candidates: [candidate("a"), candidate("b")],
      items: [item("second", "b", { lane: "normal-builders", builderIndex: 1 }, 2),
        item("first", "a", { lane: "normal-builders", builderIndex: 1 }, 1)],
    }));
    expect(result).toEqual([
      expect.objectContaining({ plannedItemId: "first", startsAtMs: NOW }),
      expect.objectContaining({ plannedItemId: "second", startsAtMs: NOW + 60_000 }),
    ]);
  });

  it("waits for entity prerequisites satisfied by another planned upgrade", () => {
    const prerequisiteCandidate = candidate("hall", "building", {
      entityId: "town-hall",
      currentLevel: 15,
      targetLevel: 16,
    });
    const dependent = candidate("dependent", "building", {
      prerequisites: [{ kind: "entity-level", entityId: "town-hall", minimumLevel: 16 }],
    });
    const result = schedulePlanner(input({
      candidates: [prerequisiteCandidate, dependent],
      items: [
        item("dependent-item", "dependent", { lane: "normal-builders", builderIndex: 2 }, 0),
        item("hall-item", "hall", { lane: "normal-builders", builderIndex: 1 }, 0, 16),
      ],
    }));
    expect(result.find((projection) => projection.plannedItemId === "dependent-item")).toEqual(
      expect.objectContaining({ status: "scheduled", startsAtMs: NOW + 60_000 }),
    );
  });

  it("reports unmet static prerequisites", () => {
    const blocked = candidate("a", "building", {
      prerequisites: [{ kind: "town-hall-level", minimumLevel: 17 }],
    });
    const result = schedulePlanner(input({
      candidates: [blocked],
      items: [item("a-item", "a")],
    }));
    expect(result[0]).toEqual(expect.objectContaining({
      status: "blocked",
      reasons: [expect.objectContaining({ code: "prerequisite-unmet" })],
    }));
  });

  it("reports dependency cycles rather than scheduling either item", () => {
    const a = candidate("a", "building", {
      entityId: "a-entity",
      prerequisites: [{ kind: "entity-level", entityId: "b-entity", minimumLevel: 2 }],
    });
    const b = candidate("b", "building", {
      entityId: "b-entity",
      prerequisites: [{ kind: "entity-level", entityId: "a-entity", minimumLevel: 2 }],
    });
    const result = schedulePlanner(input({
      candidates: [a, b],
      items: [item("a-item", "a"), item("b-item", "b", { lane: "normal-builders", builderIndex: 2 })],
    }));
    expect(result.every((projection) => projection.status === "blocked")).toBe(true);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ reasons: [expect.objectContaining({ code: "dependency-cycle" })] }),
    ]));
  });

  it("requires event eligibility for Goblin lanes", () => {
    const result = schedulePlanner(input({
      candidates: [candidate("a")],
      items: [item("a-item", "a", { lane: "goblin-builder" })],
    }));
    expect(result[0]).toEqual(expect.objectContaining({
      status: "blocked",
      reasons: [expect.objectContaining({ code: "lane-ineligible" })],
    }));
  });
});
