jest.mock("@/theme/useHomeColors", () => ({
  useHomeColors: () => ({
    border: "#222222",
    gold: "#fbbf24",
    orangeLight: "#fb923c",
    surface: "#111111",
    surfaceRaised: "#222222",
    textDark: "#000000",
    textMuted: "#888888",
    textPrimary: "#ffffff",
    textSecondary: "#cccccc",
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

function renderQueue(overrides: Partial<React.ComponentProps<typeof PlannerQueueList>> = {}) {
  const callbacks = {
    onConfirmEdit: jest.fn(),
    onCancelPreview: jest.fn(),
    onTargetDraftChange: jest.fn(),
    onLaneDraftChange: jest.fn(),
    onSaveEdit: jest.fn(),
    onBeginEdit: jest.fn(),
    onCancelEdit: jest.fn(),
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
      builderCount={1}
      queueBusy={false}
      queueError={null}
      projectionError={null}
      isCalculating={false}
      editingItemId={item.id}
      targetDrafts={{}}
      laneDrafts={{}}
      editErrors={{}}
      pendingEdit={{ itemId: item.id, projections: [preview] }}
      hasEditConflict={false}
      {...callbacks}
      {...overrides}
    />,
  );
  return callbacks;
}

describe("PlannerQueueList schedule preview", () => {
  it("asks for explicit confirmation before the preview can be saved", () => {
    const callbacks = renderQueue();

    expect(screen.getByText("Schedule preview")).toBeTruthy();
    expect(screen.getByText("These are projected dates from the proposed queue. Nothing is saved until you confirm.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm and save" })).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Confirm and save" }));
    expect(callbacks.onConfirmEdit).toHaveBeenCalledTimes(1);
    expect(callbacks.onSaveEdit).not.toHaveBeenCalled();
  });

  it("allows the user to cancel a preview without confirming it", () => {
    const callbacks = renderQueue();

    fireEvent.press(screen.getByRole("button", { name: "Cancel preview" }));

    expect(callbacks.onCancelPreview).toHaveBeenCalledTimes(1);
    expect(callbacks.onConfirmEdit).not.toHaveBeenCalled();
  });

  it("disables preview actions while the queue is saving", () => {
    renderQueue({ queueBusy: true });

    expect(screen.getByRole("button", { name: "Confirm and save" }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Cancel preview" }).props.accessibilityState.disabled).toBe(true);
  });
});
