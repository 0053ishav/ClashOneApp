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

import React, { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AddUpgradeView } from "@/components/planner/AddUpgradeView";
import type { PlannerCatalogResult } from "@/services/plannerCatalogService";
import type { PlannerPlan, PlannerPlanId, ProgressionCandidate } from "@/types/planner";
import type { usePlannerCatalog } from "@/hooks/planner/usePlannerCatalog";
import type { EntityData } from "@/types/entities";

const entity: EntityData = {
  id: 101,
  slug: "archer-tower",
  type: "building",
  village: "home",
  name: { en: "Archer Tower" },
};

const candidate: ProgressionCandidate = {
  candidateId: "archer-tower-level-2",
  entityId: "101",
  category: "building",
  village: "home",
  currentLevel: 1,
  targetLevel: 2,
  prerequisites: [],
  estimate: {
    cost: { status: "known", value: { gold: 1000 } },
    durationMs: { status: "known", value: 60_000 },
  },
};

function createCatalog(currentLevelStatus: "known" | "unknown") {
  const item: PlannerCatalogResult["items"][number] = currentLevelStatus === "known"
    ? {
        candidate,
        name: "Archer Tower",
        maxLevel: 5,
        currentLevel: 1,
        currentLevelStatus: "known",
        isNextLevel: true,
        canAdd: true,
        blockedBy: [],
        unknownPrerequisites: [],
      }
    : {
        candidate,
        name: "Archer Tower",
        maxLevel: 5,
        currentLevel: null,
        currentLevelStatus: "unknown",
        isNextLevel: false,
        canAdd: false,
        blockedBy: [],
        unknownPrerequisites: [],
      };
  const result: PlannerCatalogResult = {
    state: "ready",
    items: [item],
    diagnostics: [],
    unavailableCategories: [],
    diagnosticsSummary: {
      datasetCandidates: 1,
      homeVillageCandidates: 1,
      knownLevelCandidates: currentLevelStatus === "known" ? 1 : 0,
      nextLevelCandidates: currentLevelStatus === "known" ? 1 : 0,
      categoryCandidates: 1,
      metadataCandidates: 1,
      belowMaxLevelCandidates: 1,
      queryCandidates: 1,
      returnedItems: 1,
    },
  };
  const currentLevels: Record<string, number> = currentLevelStatus === "known" ? { "101": 1 } : {};
  const catalog = {
    activeTag: "#PLAYER",
    entitiesById: { 101: entity },
    query: "",
    setQuery: jest.fn(),
    category: "all" as const,
    setCategory: jest.fn(),
    currentLevels,
    structureInstances: [],
    activeUpgrades: [],
    showStructureInstances: false,
    setShowStructureInstances: jest.fn(),
    manualOverrides: {},
    levelDrafts: {},
    setLevelDrafts: jest.fn(),
    levelErrors: {},
    setLevelErrors: jest.fn(),
    result,
    isLoading: false,
    error: null,
    setError: jest.fn(),
    plannerCandidates: [candidate],
    structureLevels: { laboratoryLevel: 1, petHouseLevel: 1 },
    untrackedEntities: [],
    applyLevel: jest.fn(),
  } satisfies ReturnType<typeof usePlannerCatalog>;
  return catalog;
}

const plan: PlannerPlan = {
  id: "plan" as PlannerPlanId,
  accountTag: "#PLAYER",
  village: "home",
  items: [],
  createdAtMs: 1,
  updatedAtMs: 1,
  snapshotAtMs: 1,
};

describe("AddUpgradeView", () => {
  it("keeps an unknown-level entity visible with an inline level input", () => {
    render(
      <AddUpgradeView
        catalog={createCatalog("unknown")}
        queuePlan={null}
        townHallLevel={10}
        queueBusy={false}
        hasPendingEdit={false}
        onAdd={jest.fn().mockResolvedValue(true)}
      />,
    );

    expect(screen.getByText("Archer Tower")).toBeTruthy();
    expect(screen.getByText("Current level unknown. Set it to see the correct next upgrade.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Set current level for Archer Tower" })).toBeTruthy();
    expect(screen.getByLabelText("Current level for Archer Tower")).toBeTruthy();
  });

  it("shows Added feedback only after a successful queue write", async () => {
    const onAdd = jest.fn().mockResolvedValue(true);
    render(
      <AddUpgradeView
        catalog={createCatalog("known")}
        queuePlan={plan}
        townHallLevel={10}
        queueBusy={false}
        hasPendingEdit={false}
        onAdd={onAdd}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Add Archer Tower to plan" }));
    });

    expect(onAdd).toHaveBeenCalledWith(candidate.candidateId, candidate.targetLevel, undefined);
    expect(screen.getByText("Added")).toBeTruthy();
  });
});
