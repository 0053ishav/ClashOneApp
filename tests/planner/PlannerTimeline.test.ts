jest.mock("@/theme/useHomeColors", () => ({
  useHomeColors: () => ({
    background: "#000000",
    border: "#222222",
    borderStrong: "#333333",
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
import { getBlockPosition, PlannerTimeline } from "@/components/planner/PlannerTimeline";
import type { PlannerItemId, PlannedUpgradeItem } from "@/types/planner";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("PlannerTimeline positioning", () => {
  const nowMs = Date.UTC(2026, 9, 31);

  it("clips a live or planned block that started before today to the visible window", () => {
    expect(getBlockPosition(
      nowMs - 2 * DAY_MS,
      nowMs + 3 * DAY_MS,
      nowMs,
      30,
      10,
    )).toEqual({ left: 0, width: 30 });
  });

  it("does not render a block that finishes before the timeline begins", () => {
    expect(getBlockPosition(
      nowMs - 5 * DAY_MS,
      nowMs - DAY_MS,
      nowMs,
      30,
      10,
    )).toBeNull();
  });

  it("does not render a block outside the selected horizon", () => {
    expect(getBlockPosition(
      nowMs + 31 * DAY_MS,
      nowMs + 34 * DAY_MS,
      nowMs,
      30,
      10,
    )).toBeNull();
  });

  it("clips work at the far edge of the selected 365-day horizon", () => {
    expect(getBlockPosition(
      nowMs + 364 * DAY_MS,
      nowMs + 366 * DAY_MS,
      nowMs,
      365,
      3,
    )).toEqual({ left: 1092, width: 8 });
  });

  it("keeps an instant or very short task visible without inventing a longer duration", () => {
    expect(getBlockPosition(
      nowMs,
      nowMs,
      nowMs,
      30,
      10,
    )).toEqual({ left: 0, width: 8 });
  });

  it("renders a useful empty state and accessible scale controls", () => {
    render(React.createElement(PlannerTimeline, {
      items: [],
      projections: [],
      candidates: [],
      entityNamesById: {},
      liveUpgrades: [],
      builderCount: 0,
      nowMs,
    }));

    expect(screen.getByText("Your timeline starts here")).toBeTruthy();
    expect(screen.getByText("No plan yet")).toBeTruthy();
    expect(screen.getByLabelText("Timeline scale")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Weeks" })).props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(screen.getByRole("button", { name: "Months" }));
    expect(screen.getByRole("button", { name: "Months" })).toHaveAccessibilityState({ selected: true });
  });

  it("marks missing scheduler output as incomplete instead of inventing a finish date", () => {
    const item: PlannedUpgradeItem = {
      id: "item-1" as PlannerItemId,
      candidateId: "candidate-1",
      targetLevel: 2,
      lane: { lane: "normal-builders", builderIndex: 1 },
      order: 0,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    };

    render(React.createElement(PlannerTimeline, {
      items: [item],
      projections: [],
      candidates: [],
      entityNamesById: {},
      liveUpgrades: [],
      builderCount: 1,
      nowMs,
    }));

    expect(screen.getByText("Estimate incomplete")).toBeTruthy();
    expect(screen.getByText("Blocked · candidate-1")).toBeTruthy();
    expect(screen.getByText("Finish estimates include scheduled work only. Blocked or unknown upgrades do not receive invented dates.")).toBeTruthy();
  });

});
