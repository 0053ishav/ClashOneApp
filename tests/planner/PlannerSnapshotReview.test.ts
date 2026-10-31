jest.mock("@/theme/useHomeColors", () => ({
  useHomeColors: () => ({
    background: "#000000",
    border: "#222222",
    gold: "#fbbf24",
    surface: "#111111",
    textDark: "#000000",
    textPrimary: "#ffffff",
    textSecondary: "#cccccc",
  }),
}));

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { PlannerSnapshotReview } from "@/components/planner/PlannerSnapshotReview";

describe("PlannerSnapshotReview", () => {
  it("renders an explicit review action when the snapshot is stale", () => {
    const onReviewAndRecalculate = jest.fn();
    render(React.createElement(PlannerSnapshotReview, {
      visible: true,
      lastJsonSyncAtMs: Date.UTC(2026, 9, 31),
      snapshotAtMs: Date.UTC(2026, 9, 30),
      busy: false,
      onReviewAndRecalculate,
    }));

    expect(screen.getByText("Village snapshot needs review")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Review snapshot and recalculate plan" }));
    expect(onReviewAndRecalculate).toHaveBeenCalledTimes(1);
  });

  it("disables recalculation when there is no recorded account sync", () => {
    render(React.createElement(PlannerSnapshotReview, {
      visible: true,
      lastJsonSyncAtMs: undefined,
      snapshotAtMs: null,
      busy: false,
      onReviewAndRecalculate: jest.fn(),
    }));

    expect(screen.getByRole("button", { name: "Review snapshot and recalculate plan" }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText("The latest village snapshot has no recorded sync time. Sync account data before recalculating. Your saved queue has not been changed.")).toBeTruthy();
  });

  it("does not render when the snapshot does not need review", () => {
    render(React.createElement(PlannerSnapshotReview, {
      visible: false,
      lastJsonSyncAtMs: Date.UTC(2026, 9, 31),
      snapshotAtMs: Date.UTC(2026, 9, 31),
      busy: false,
      onReviewAndRecalculate: jest.fn(),
    }));

    expect(screen.queryByText("Village snapshot needs review")).toBeNull();
  });
});
