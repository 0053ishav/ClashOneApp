
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { ScrollView, View } = require("react-native");
  return {
    BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    BottomSheetModal: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    BottomSheetScrollView: ({ children, contentContainerStyle }: { children: React.ReactNode; contentContainerStyle?: unknown }) =>
      React.createElement(ScrollView, { contentContainerStyle }, children),
    BottomSheetBackdrop: () => null,
  };
});

jest.mock("@/theme/useHomeColors", () => ({
  useHomeColors: () => ({
    background: "#000000", border: "#222222", borderStrong: "#333333",
    gold: "#fbbf24", orangeLight: "#fb923c", surface: "#111111",
    surfaceRaised: "#222222", textDark: "#000000", textMuted: "#888888",
    textPrimary: "#ffffff", textSecondary: "#cccccc",
  }),
}));

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { UpgradeDetailSheet } from "@/components/planner/UpgradeDetailSheet";
import type { PlannerItemId, PlannedUpgradeItem, ProgressionCandidate } from "@/types/planner";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>;
}

function renderWithProvider(element: React.ReactElement) {
  return render(element, { wrapper: TestWrapper });
}

const item: PlannedUpgradeItem = {
  id: "detail-item" as PlannerItemId, candidateId: "archer-tower",
  targetLevel: 3, lane: { lane: "normal-builders", builderIndex: 2 },
  order: 0, createdAtMs: Date.UTC(2026, 9, 31), updatedAtMs: Date.UTC(2026, 9, 31),
};
const candidate: ProgressionCandidate = {
  candidateId: "archer-tower", entityId: "archer-tower", category: "building", village: "home",
  currentLevel: 2, targetLevel: 3, prerequisites: [],
  estimate: { cost: { status: "known", value: { gold: 10000 } }, durationMs: { status: "known", value: 3600000 } },
};

describe("UpgradeDetailSheet", () => {
  it("shows levels, lane, known cost and a scheduler blocker; actions use supplied handlers", () => {
    const onEdit = jest.fn();
    const onRemove = jest.fn();
    renderWithProvider(<UpgradeDetailSheet
      visible item={item} candidate={candidate}
      projection={{ status: "blocked", plannedItemId: item.id, reasons: [{ code: "candidate-unavailable", candidateId: item.candidateId }] }}
      name="Archer Tower" queueBusy={false} onClose={jest.fn()} onEdit={onEdit} onRemove={onRemove}
    />);
    expect(screen.getByText("Archer Tower")).toBeTruthy();
    expect(screen.getByText("Level 2 → 3")).toBeTruthy();
    expect(screen.getByText("Builder 2")).toBeTruthy();
    expect(screen.getByText("10,000 Gold")).toBeTruthy();
    expect(screen.getByText("This upgrade is missing from the current progression catalog.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Edit upgrade" }));
    fireEvent.press(screen.getByRole("button", { name: "Remove from plan" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("keeps actions disabled while the queue is saving", () => {
    renderWithProvider(<UpgradeDetailSheet visible item={item} candidate={candidate} projection={undefined}
      name="Archer Tower" queueBusy onClose={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Edit upgrade" }).props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Remove from plan" }).props.accessibilityState?.disabled).toBe(true);
  });
});
