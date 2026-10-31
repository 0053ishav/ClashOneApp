jest.mock("@/theme/useHomeColors", () => ({
  useHomeColors: () => ({
    border: "#222222",
    gold: "#fbbf24",
    surface: "#111111",
    textPrimary: "#ffffff",
    textSecondary: "#cccccc",
    textMuted: "#888888",
  }),
}));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { PlannerCatalogState } from "@/components/planner/PlannerCatalogState";
import type { PlannerCatalogResult } from "@/services/plannerCatalogService";

const diagnosticsSummary = {
  datasetCandidates: 10,
  homeVillageCandidates: 8,
  knownLevelCandidates: 6,
  nextLevelCandidates: 4,
  categoryCandidates: 3,
  metadataCandidates: 2,
  belowMaxLevelCandidates: 2,
  queryCandidates: 0,
  returnedItems: 0,
};

function makeResult(state: PlannerCatalogResult["state"]): PlannerCatalogResult {
  return {
    state,
    items: [],
    diagnostics: [],
    unavailableCategories: state === "partial" ? ["pets"] : [],
    diagnosticsSummary,
  };
}

describe("PlannerCatalogState", () => {
  it("shows loading without displaying stale empty-result messaging", () => {
    render(React.createElement(PlannerCatalogState, {
      isLoading: true,
      error: null,
      result: makeResult("ready"),
      entityCount: 0,
      untrackedEntityCount: 0,
      query: "",
    }));

    expect(screen.getByText("Loading catalog…")).toBeTruthy();
    expect(screen.queryByText("No eligible upgrades yet")).toBeNull();
  });

  it("shows the catalog error only once for an error result", () => {
    render(React.createElement(PlannerCatalogState, {
      isLoading: false,
      error: null,
      result: makeResult("error"),
      entityCount: 10,
      untrackedEntityCount: 0,
      query: "",
    }));

    expect(screen.getByText("Game data unavailable")).toBeTruthy();
    expect(screen.queryByText("No eligible upgrades yet")).toBeNull();
  });

  it("distinguishes a search miss from an empty eligible-upgrade catalog", () => {
    render(React.createElement(PlannerCatalogState, {
      isLoading: false,
      error: null,
      result: makeResult("ready"),
      entityCount: 10,
      untrackedEntityCount: 0,
      query: "dragon",
    }));

    expect(screen.getByText("No matching entity metadata")).toBeTruthy();
    expect(screen.getByText(/No Home Village entity name matches/)).toBeTruthy();
  });

  it("explains partial data when no eligible candidates are returned", () => {
    render(React.createElement(PlannerCatalogState, {
      isLoading: false,
      error: null,
      result: makeResult("partial"),
      entityCount: 10,
      untrackedEntityCount: 2,
      query: "",
    }));

    expect(screen.getByText("No eligible upgrades yet")).toBeTruthy();
    expect(screen.getByText(/Some progression categories are unavailable: pets/)).toBeTruthy();
  });

  it("renders nothing when results are present", () => {
    const result = { ...makeResult("ready"), items: [{}] } as unknown as PlannerCatalogResult;
    const { toJSON } = render(React.createElement(PlannerCatalogState, {
      isLoading: false,
      error: null,
      result,
      entityCount: 10,
      untrackedEntityCount: 0,
      query: "",
    }));

    expect(toJSON()).toBeNull();
  });
});
