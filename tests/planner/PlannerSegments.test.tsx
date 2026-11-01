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
import { PlannerDetailsView } from "@/components/planner/PlannerDetailsView";
import { PlannerResourceSummary } from "@/components/planner/PlannerResourceSummary";
import { PlannerSummaryCard } from "@/components/planner/PlannerSummaryCard";
import { PlannerWarnings } from "@/components/planner/PlannerWarnings";
import type {
  PlannerItemId,
  PlannedUpgradeItem,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";
import { getPlannerViewModel } from "@/utils/planner/plannerViewModel";

const item: PlannedUpgradeItem = {
  id: "item-1" as PlannerItemId,
  candidateId: "candidate-1",
  targetLevel: 3,
  lane: { lane: "normal-builders", builderIndex: 1 },
  order: 0,
  createdAtMs: 1,
  updatedAtMs: 1,
};
const candidate: ProgressionCandidate = {
  candidateId: "candidate-1",
  entityId: "entity-1",
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
const scheduled: UpgradeProjection = {
  status: "scheduled",
  plannedItemId: item.id,
  startsAtMs: 2,
  completesAtMs: 1002,
  estimate: candidate.estimate,
};
const unknownDuration: UpgradeProjection = {
  status: "unknown",
  plannedItemId: "item-unknown" as PlannerItemId,
  reasons: [{ code: "estimate-unknown", estimate: "duration", reason: "missing-game-data" }],
};
const snapshotReview = {
  visible: true,
  lastJsonSyncAtMs: 1,
  snapshotAtMs: null,
  busy: false,
  onReviewAndRecalculate: jest.fn(),
};

describe("Planner segment presentation", () => {
  it("labels the finish as an estimate that covers known work only", () => {
    render(
      <PlannerSummaryCard
        items={[item, { ...item, id: "item-unknown" as PlannerItemId }]}
        projections={[scheduled, unknownDuration]}
      />,
    );

    expect(screen.getByText("Projected finish estimate")).toBeTruthy();
    expect(screen.getByText("Finish covers known work only")).toBeTruthy();
    expect(screen.getByText("Queued actions")).toBeTruthy();
  });

  it("exposes warning counts as actionable controls", () => {
    const callbacks = {
      onUnknownDurationsPress: jest.fn(),
      onBlockedPress: jest.fn(),
      onMissingLevelsPress: jest.fn(),
      onStaleSnapshotPress: jest.fn(),
    };
    render(
      <PlannerWarnings
        unknownDurations={2}
        blocked={1}
        missingLevels={3}
        staleSnapshot
        accountEditConflict={false}
        editingAccountTag={null}
        queueError={null}
        projectionError={null}
        {...callbacks}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Unknown durations: 2" }));
    fireEvent.press(screen.getByRole("button", { name: "Blocked: 1" }));
    fireEvent.press(screen.getByRole("button", { name: "Missing levels: 3" }));
    fireEvent.press(screen.getByRole("button", { name: "Snapshot needs review" }));

    expect(callbacks.onUnknownDurationsPress).toHaveBeenCalledTimes(1);
    expect(callbacks.onBlockedPress).toHaveBeenCalledTimes(1);
    expect(callbacks.onMissingLevelsPress).toHaveBeenCalledTimes(1);
    expect(callbacks.onStaleSnapshotPress).toHaveBeenCalledTimes(1);
  });

  it("shows a separate unknown-cost bar segment and partial-total label", () => {
    const unknownCost: UpgradeProjection = {
      status: "scheduled",
      plannedItemId: "item-cost-unknown" as PlannerItemId,
      startsAtMs: 3,
      completesAtMs: 1003,
      estimate: {
        cost: { status: "unknown", reason: "missing-game-data" },
        durationMs: { status: "known", value: 1000 },
      },
    };
    const viewModel = getPlannerViewModel([scheduled, unknownCost], 2);
    render(<PlannerResourceSummary viewModel={viewModel} />);

    expect(screen.getByLabelText("Partial resource total, 1 unknown")).toBeTruthy();
    expect(screen.getByText("Partial total, 1 unknown")).toBeTruthy();
    expect(screen.getByText("Gold")).toBeTruthy();
  });

  it("shows dated sequence, assumptions, and an explicit snapshot recalculation action", () => {
    const onReviewAndRecalculate = jest.fn();
    render(
      <PlannerDetailsView
        items={[item]}
        projections={[scheduled]}
        candidates={[candidate]}
        entityNamesById={{ "entity-1": "Archer Tower" }}
        liveUpgrades={[]}
        builderCount={5}
        snapshotReview={{ ...snapshotReview, onReviewAndRecalculate }}
      />,
    );

    expect(screen.getByText(/Archer Tower.*level.*3/)).toBeTruthy();
    expect(screen.getByText(/Starts /)).toBeTruthy();
    expect(screen.getByText("No boosts are applied to upgrade durations.")).toBeTruthy();
    expect(screen.getByText(/Builder count:/)).toBeTruthy();
    expect(screen.getByText("Live timers occupy their lane until their recorded completion time.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Recalculate plan" }));
    expect(onReviewAndRecalculate).toHaveBeenCalledTimes(1);
  });
});
