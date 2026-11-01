jest.mock("@/theme/useHomeColors", () => ({
  useHomeColors: () => ({
    background: "#000000",
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
  }),
}));

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { PlannerQueueEditSheet } from "@/components/planner/PlannerQueueEditSheet";
import type {
  PlannerItemId,
  PlannedUpgradeItem,
  ProgressionCandidate,
} from "@/types/planner";

const item: PlannedUpgradeItem = {
  id: "edit-item" as PlannerItemId,
  candidateId: "candidate",
  targetLevel: 2,
  lane: { lane: "normal-builders", builderIndex: 1 },
  order: 0,
  createdAtMs: 1,
  updatedAtMs: 1,
};
const candidate: ProgressionCandidate = {
  candidateId: "candidate",
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

function renderSheet(overrides: Partial<React.ComponentProps<typeof PlannerQueueEditSheet>> = {}) {
  const callbacks = {
    onTargetChange: jest.fn(),
    onLaneChange: jest.fn(),
    onMove: jest.fn(),
    onSave: jest.fn(),
    onConfirmSave: jest.fn(),
    onCancel: jest.fn(),
    onRemove: jest.fn(),
  };
  render(
    <PlannerQueueEditSheet
      visible
      item={item}
      candidate={candidate}
      name="Archer Tower"
      itemsBefore={[item]}
      itemsAfter={[item]}
      projectionsBefore={[]}
      projectionsAfter={[]}
      targetDraft="2"
      laneDraft={item.lane}
      orderDraft={0}
      builderCount={2}
      maximumTargetLevel={4}
      editError={undefined}
      queueError={null}
      queueBusy={false}
      previewing={false}
      saving={false}
      {...callbacks}
      {...overrides}
    />,
  );
  return callbacks;
}

describe("PlannerQueueEditSheet", () => {
  it("bounds target level controls and exposes only eligible builder lanes", () => {
    const callbacks = renderSheet({ targetDraft: "4", maximumTargetLevel: 4 });

    expect(screen.getByRole("button", { name: "Increase target level" }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Decrease target level" }).props.accessibilityState.disabled).toBe(false);
    fireEvent.press(screen.getByRole("button", { name: "Decrease target level" }));
    fireEvent.press(screen.getByRole("button", { name: "Builder 2" }));

    expect(callbacks.onTargetChange).toHaveBeenCalledWith("3");
    expect(callbacks.onLaneChange).toHaveBeenCalledWith({ lane: "normal-builders", builderIndex: 2 });
  });

  it("requires explicit confirmation before removing the edited item", () => {
    const callbacks = renderSheet();

    fireEvent.press(screen.getByText("Remove"));
    expect(screen.getByText("Remove upgrade?")).toBeTruthy();
    expect(callbacks.onRemove).not.toHaveBeenCalled();
    fireEvent.press(screen.getAllByText("Remove")[1]);

    expect(callbacks.onRemove).toHaveBeenCalledTimes(1);
  });
});
