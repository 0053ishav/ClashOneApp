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

  it("schedules known durations when cost data is unknown", () => {
    const costUnknown = candidate("a", "building", {
      estimate: {
        cost: { status: "unknown", reason: "missing-game-data" },
        durationMs: { status: "known", value: 60_000 },
      },
    });
    const result = schedulePlanner(input({
      candidates: [costUnknown],
      items: [item("a-item", "a")],
    }));

    expect(result[0]).toEqual(expect.objectContaining({
      status: "scheduled",
      startsAtMs: NOW,
      completesAtMs: NOW + 60_000,
      estimate: costUnknown.estimate,
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

  it("preserves same-lane order when an earlier item waits for a planned dependency", () => {
    const prerequisite = candidate("prerequisite", "building", {
      entityId: "required-entity",
      currentLevel: 0,
      targetLevel: 1,
    });
    const dependent = candidate("dependent", "building", {
      prerequisites: [{
        kind: "entity-level",
        entityId: "required-entity",
        minimumLevel: 1,
      }],
    });
    const later = candidate("later");
    const result = schedulePlanner(input({
      candidates: [prerequisite, dependent, later],
      items: [
        item("earlier-dependent", "dependent", { lane: "normal-builders", builderIndex: 1 }, 0),
        item("dependency-work", "prerequisite", { lane: "normal-builders", builderIndex: 2 }, 1, 1),
        item("later-same-lane", "later", { lane: "normal-builders", builderIndex: 1 }, 2),
      ],
      prerequisiteState: {
        townHallLevel: 16,
        laboratoryLevel: 12,
        petHouseLevel: 10,
        entityLevels: {},
      },
    }));
    const dependentProjection = result.find(
      (projection) => projection.plannedItemId === "earlier-dependent",
    );
    const laterProjection = result.find(
      (projection) => projection.plannedItemId === "later-same-lane",
    );

    expect(dependentProjection).toEqual(expect.objectContaining({ status: "scheduled" }));
    expect(laterProjection).toEqual(expect.objectContaining({ status: "scheduled" }));
    if (dependentProjection?.status !== "scheduled" || laterProjection?.status !== "scheduled") {
      throw new Error("Expected both same-lane items to be scheduled");
    }
    expect(laterProjection.startsAtMs).toBeGreaterThanOrEqual(dependentProjection.completesAtMs);
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

  it("does not treat an item's own upgrade as a dependency cycle", () => {
    const selfDependent = candidate("self-dependent", "building", {
      entityId: "self-dependent-entity",
      currentLevel: 0,
      targetLevel: 1,
      prerequisites: [{
        kind: "entity-level",
        entityId: "self-dependent-entity",
        minimumLevel: 1,
      }],
    });
    const result = schedulePlanner(input({
      candidates: [selfDependent],
      items: [item("self-dependent-item", "self-dependent", undefined, 0, 1)],
      prerequisiteState: {
        townHallLevel: 16,
        laboratoryLevel: 12,
        petHouseLevel: 10,
        entityLevels: { "self-dependent-entity": 0 },
      },
    }));

    expect(result[0]).toEqual(expect.objectContaining({
      status: "blocked",
      reasons: [{
        code: "prerequisite-unmet",
        prerequisite: {
          kind: "entity-level",
          entityId: "self-dependent-entity",
          minimumLevel: 1,
        },
      }],
    }));
  });

  it("uses a planned Town Hall upgrade to satisfy a later Town Hall-level prerequisite", () => {
    const townHall = candidate("town-hall-upgrade", "building", {
      entityId: "town-hall",
      role: "town-hall",
      currentLevel: 16,
      targetLevel: 17,
    });
    const dependent = candidate("town-hall-dependent", "building", {
      prerequisites: [{ kind: "town-hall-level", minimumLevel: 17 }],
    });
    const result = schedulePlanner(input({
      candidates: [townHall, dependent],
      items: [
        item("town-hall-item", "town-hall-upgrade", { lane: "normal-builders", builderIndex: 1 }, 0, 17),
        item("after-town-hall-item", "town-hall-dependent", { lane: "normal-builders", builderIndex: 2 }, 1),
      ],
      prerequisiteState: {
        townHallLevel: 16,
        laboratoryLevel: 12,
        petHouseLevel: 10,
        entityLevels: {},
      },
    }));

    expect(result.find((projection) => projection.plannedItemId === "after-town-hall-item"))
      .toEqual(expect.objectContaining({
        status: "scheduled",
        startsAtMs: NOW + 60_000,
      }));
  });

  it("never overlaps items on the same lane and schedules independent lanes concurrently", () => {
    const first = candidate("first", "building", {
      estimate: {
        cost: { status: "known", value: { gold: 0 } },
        durationMs: { status: "known", value: 60_000 },
      },
    });
    const second = candidate("second", "building", {
      estimate: {
        cost: { status: "known", value: { gold: 0 } },
        durationMs: { status: "known", value: 120_000 },
      },
    });
    const research = candidate("research", "troop", {
      estimate: {
        cost: { status: "known", value: { elixir: 0 } },
        durationMs: { status: "known", value: 60_000 },
      },
    });
    const scenario = input({
      candidates: [first, second, research],
      items: [
        item("builder-first", "first", { lane: "normal-builders", builderIndex: 1 }, 0),
        item("builder-second", "second", { lane: "normal-builders", builderIndex: 1 }, 1),
        item("research-item", "research", { lane: "laboratory" }, 0),
      ],
    });
    const projections = schedulePlanner(scenario);
    const repeatedProjections = schedulePlanner(scenario);
    const scheduled = projections.filter(
      (projection): projection is Extract<typeof projection, { status: "scheduled" }> =>
        projection.status === "scheduled",
    );

    expect(repeatedProjections).toEqual(projections);
    for (let leftIndex = 0; leftIndex < scheduled.length; leftIndex += 1) {
      const left = scheduled[leftIndex];
      const leftItem = scenario.items.find((planned) => planned.id === left.plannedItemId);
      if (!leftItem) throw new Error(`Missing planned item ${left.plannedItemId}`);

      for (let rightIndex = leftIndex + 1; rightIndex < scheduled.length; rightIndex += 1) {
        const right = scheduled[rightIndex];
        const rightItem = scenario.items.find((planned) => planned.id === right.plannedItemId);
        if (!rightItem) throw new Error(`Missing planned item ${right.plannedItemId}`);
        if (leftItem.lane.lane !== rightItem.lane.lane) continue;
        if (
          leftItem.lane.lane === "normal-builders" &&
          rightItem.lane.lane === "normal-builders" &&
          leftItem.lane.builderIndex !== rightItem.lane.builderIndex
        ) continue;

        expect(
          left.completesAtMs <= right.startsAtMs ||
          right.completesAtMs <= left.startsAtMs,
        ).toBe(true);
      }
    }

    expect(scheduled.find((projection) => projection.plannedItemId === "builder-first"))
      .toEqual(expect.objectContaining({ startsAtMs: NOW }));
    expect(scheduled.find((projection) => projection.plannedItemId === "research-item"))
      .toEqual(expect.objectContaining({ startsAtMs: NOW }));
  });

  it("reports an absent entity prerequisite level as unknown", () => {
    const dependent = candidate("dependent", "building", {
      prerequisites: [{ kind: "entity-level", entityId: "unknown-entity", minimumLevel: 1 }],
    });
    const result = schedulePlanner(input({
      candidates: [dependent],
      items: [item("dependent-item", "dependent")],
      prerequisiteState: {
        townHallLevel: 16,
        laboratoryLevel: 12,
        petHouseLevel: 10,
        entityLevels: {},
      },
    }));

    expect(result[0]).toEqual(expect.objectContaining({
      status: "unknown",
      reasons: [{
        code: "prerequisite-unknown",
        prerequisite: { kind: "entity-level", entityId: "unknown-entity", minimumLevel: 1 },
      }],
    }));
  });

  it("treats a known level zero as unmet rather than unknown", () => {
    const dependent = candidate("dependent", "building", {
      prerequisites: [{ kind: "entity-level", entityId: "unbuilt-entity", minimumLevel: 1 }],
    });
    const result = schedulePlanner(input({
      candidates: [dependent],
      items: [item("dependent-item", "dependent")],
      prerequisiteState: {
        townHallLevel: 16,
        laboratoryLevel: 12,
        petHouseLevel: 10,
        entityLevels: { "unbuilt-entity": 0 },
      },
    }));

    expect(result[0]).toEqual(expect.objectContaining({
      status: "blocked",
      reasons: [{
        code: "prerequisite-unmet",
        prerequisite: { kind: "entity-level", entityId: "unbuilt-entity", minimumLevel: 1 },
      }],
    }));
  });

  it("tracks completion per planned item when the same candidate is queued at multiple target levels", () => {
    const hall = candidate("hall", "building", {
      entityId: "hall-entity",
      currentLevel: 1,
      targetLevel: 3,
    });
    const dependent = candidate("dependent", "building", {
      prerequisites: [{ kind: "entity-level", entityId: "hall-entity", minimumLevel: 2 }],
    });
    const occupiedBuilder: ObservedActiveUpgrade = {
      observedUpgradeId: "live-builder-1",
      accountTag: "#PLAYER",
      village: "home",
      lane: { lane: "normal-builders", builderIndex: 1 },
      startsAtMs: NOW,
      completesAtMs: NOW + 500_000,
      source: "manual",
    };
    const result = schedulePlanner(input({
      candidates: [hall, dependent],
      items: [
        item("hall-level-2", "hall", { lane: "normal-builders", builderIndex: 1 }, 0, 2),
        item("hall-level-3", "hall", { lane: "normal-builders", builderIndex: 2 }, 1, 3),
        item("dependent-item", "dependent", { lane: "normal-builders", builderIndex: 3 }, 2),
      ],
      observedActiveUpgrades: [occupiedBuilder],
    }));

    expect(result.find((projection) => projection.plannedItemId === "hall-level-2")).toEqual(
      expect.objectContaining({ status: "scheduled", completesAtMs: NOW + 560_000 }),
    );
    expect(result.find((projection) => projection.plannedItemId === "dependent-item")).toEqual(
      expect.objectContaining({ status: "scheduled", startsAtMs: NOW + 560_000 }),
    );
  });

  it("distinguishes unknown entity prerequisite levels from unmet known levels", () => {
    const dependent = candidate("dependent", "building", {
      prerequisites: [{ kind: "entity-level", entityId: "missing-entity", minimumLevel: 2 }],
    });
    const result = schedulePlanner(input({
      candidates: [dependent],
      items: [item("dependent-item", "dependent")],
      prerequisiteState: {
        townHallLevel: 16,
        laboratoryLevel: 12,
        petHouseLevel: 10,
        entityLevels: {},
      },
    }));
    expect(result[0]).toEqual(expect.objectContaining({
      status: "unknown",
      reasons: [expect.objectContaining({ code: "prerequisite-unknown" })],
    }));
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
