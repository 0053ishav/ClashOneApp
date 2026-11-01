jest.mock("@/theme/useHomeColors", () => ({
  useHomeColors: () => ({
    background: "#000000",
    border: "#222222",
    gold: "#fbbf24",
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
import { PlannerHeader } from "@/components/planner/PlannerHeader";

describe("PlannerHeader", () => {
  it("shows the account and Home Village pill with selectable planner segments", () => {
    const onSegmentChange = jest.fn();
    render(
      <PlannerHeader
        accountName="Village account"
        activeTag="#PLAYER"
        segment="plan"
        onSegmentChange={onSegmentChange}
      />,
    );

    expect(screen.getByText("Home Village")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Plan" }).props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByRole("tab", { name: "Add" }));
    expect(onSegmentChange).toHaveBeenCalledWith("add");
  });
});
