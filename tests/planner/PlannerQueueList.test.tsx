jest.mock("@/theme/useHomeColors", () => ({
  useHomeColors: () => ({
    border: "#222222",
    danger: "#ff0000",
    gold: "#fbbf24",
    orangeLight: "#fb923c",
    success: "#00ff00",
    surface: "#111111",
    surfaceRaised: "#222222",
    textDark: "#000000",
    textMuted: "#888888",
    textPrimary: "#ffffff",
    textSecondary: "#cccccc",
    background: "#000000",
  }),
}));

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { PlannerQueueList } from "@/components/planner/PlannerQueueList";
import type {
  PlannerItemId,
  PlannedUpgradeItem,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";

const item: PlannedUpgradeItem = {
  id: "item-1" as PlannerItemId,
  candidateId: "candidate-1",
  targetLevel: 3,
  lane: { lane: "normal-builders", builderIndex: 1 },
  order: 0,
  createdAtMs: 100,
  updatedAtMs: 100,
};
const laterItem: PlannedUpgradeItem = {
  ...item,
  id: "item-2" as PlannerItemId,
  candidateId: "candidate-2",
  order: 1,
};
const candidate: ProgressionCandidate = {
  candidateId: "candidate-1",
  entityId: "entity-1",
  category: "building",
  village: "home",
  currentLevel: 1,
  targetLevel: 5,
  prerequisites: [],
  estimate: {
    cost: { status: "known", value: { gold: 1000 } },
    durationMs: { status: "known", value: 60_000 },
  },
};
const preview: UpgradeProjection = {
  status: "scheduled",
  plannedItemId: item.id,
  startsAtMs: 200,
  completesAtMs: 60_200,
  estimate: candidate.estimate,
};

function renderQueue(
  overrides: Partial<React.ComponentProps<typeof PlannerQueueList>> = {},
) {
  const callbacks = {
    onBeginEdit: jest.fn(),
    onRemove: jest.fn(),
    onAssignNextBuilder: jest.fn(),
    onMove: jest.fn(),
  };
  render(
    <PlannerQueueList
      items={[item]}
      projections={[preview]}
      candidates={[candidate]}
      itemNamesByCandidateId={{ "candidate-1": "Archer Tower" }}
      structureInstanceNumbersById={{}}
      builderCount={1}
      queueBusy={false}
      queueError={null}
      projectionError={null}
      isCalculating={false}
      {...callbacks}
      {...overrides}
    />,
  );
  return callbacks;
}

describe("PlannerQueueList", () => {
  it("shows compact level, lane, and schedule state", () => {
    renderQueue();

    expect(screen.getByText("Level 1 → 3 · Builder 1")).toBeTruthy();
    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(screen.getByText("Starts 1/1/1970")).toBeTruthy();
  });

  it("filters only unknown-duration projections for the duration warning", () => {
    const otherItem = { ...laterItem, id: "item-3" as PlannerItemId, candidateId: "candidate-3" };
    const callbacks = renderQueue({
      items: [item, laterItem, otherItem],
      projections: [
        {
          status: "unknown",
          plannedItemId: item.id,
          reasons: [{ code: "estimate-unknown", estimate: "duration", reason: "missing-game-data" }],
        },
        {
          status: "unknown",
          plannedItemId: laterItem.id,
          reasons: [{
            code: "prerequisite-unknown",
            prerequisite: { kind: "entity-level", entityId: "missing", minimumLevel: 1 },
          }],
        },
        {
          status: "blocked",
          plannedItemId: otherItem.id,
          reasons: [{ code: "candidate-unavailable", candidateId: otherItem.candidateId }],
        },
      ],
      statusFilter: "unknown-duration",
      candidates: [candidate],
    });

    expect(screen.getByText("1 / 3")).toBeTruthy();
    expect(screen.getByText("Unknown")).toBeTruthy();
    expect(screen.queryByText("Blocked")).toBeNull();
    expect(callbacks.onMove).not.toHaveBeenCalled();
  });

  it("preserves move-earlier and move-later callbacks for same-lane items", () => {
    const callbacks = renderQueue({
      items: [item, laterItem],
      projections: [preview, {
        ...preview,
        plannedItemId: laterItem.id,
        startsAtMs: 60_200,
        completesAtMs: 120_200,
      }],
    });

    fireEvent.press(screen.getAllByRole("button", { name: "Move upgrade later" })[0]);
    fireEvent.press(screen.getAllByRole("button", { name: "Move upgrade earlier" })[1]);

    expect(callbacks.onMove).toHaveBeenNthCalledWith(1, item.id, 1);
    expect(callbacks.onMove).toHaveBeenNthCalledWith(2, laterItem.id, -1);
  });

  it("disables all queue actions while a preview is pending", () => {
    renderQueue({ editBusy: true });

    for (const label of [
      "Edit planned upgrade",
      "Move upgrade earlier",
      "Move upgrade later",
      "Remove planned upgrade",
    ]) {
      expect(screen.getByRole("button", { name: label }).props.accessibilityState.disabled).toBe(true);
    }
  });

  it("requires confirmation before removing a queued item", () => {
    const callbacks = renderQueue();

    fireEvent.press(screen.getByRole("button", { name: "Remove planned upgrade" }));
    expect(callbacks.onRemove).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Remove"));
    expect(callbacks.onRemove).toHaveBeenCalledWith(item.id);
  });
});
