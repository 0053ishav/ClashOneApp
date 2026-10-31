/**
 * Domain contracts for the Upgrade Planner.
 *
 * These types deliberately do not reuse the live `Upgrade` timer model:
 * candidates describe game data, observed upgrades describe timers already
 * running in the game, planned items describe user intent, and projections
 * are disposable scheduler output.
 */

export type PlannerPlanId = string & { readonly __brand: "PlannerPlanId" };
export type PlannerItemId = string & { readonly __brand: "PlannerItemId" };
export type PlannerStructureInstanceId = string & { readonly __brand: "PlannerStructureInstanceId" };

/** Confidence reflects what the grouped in-game export can actually prove. */
export type StructureIdentityConfidence = "stable" | "ambiguous";

/** App-owned identity for one structure copy; never a Clash API entity ID. */
export interface PlannerStructureInstance {
  id: PlannerStructureInstanceId;
  accountTag: string;
  village: PlannerVillage;
  dataId: number;
  /** Stable per-entity label ordinal; presentation only, never the primary key. */
  instanceNumber: number;
  currentLevel: number;
  superchargeLevel: number;
  identityConfidence: StructureIdentityConfidence;
}

export type PlannerVillage = "home";

export type PlannerLaneId =
  | "normal-builders"
  | "laboratory"
  | "pets"
  | "goblin-builder"
  | "goblin-laboratory";

/**
 * A lane assignment is discriminated so builder-specific data cannot be
 * accidentally attached to the serial Laboratory, Pets, or Goblin lanes.
 * Builder indexes are one-based.
 */
export type PlannerLaneAssignment =
  | { lane: "normal-builders"; builderIndex: number }
  | { lane: "laboratory" }
  | { lane: "pets" }
  | { lane: "goblin-builder" }
  | { lane: "goblin-laboratory" };

export type PlannerEntityCategory =
  | "building"
  | "hero"
  | "troop"
  | "spell"
  | "siege"
  | "pet"
  | "trap"
  | "wall";

export type EstimateUnknownReason =
  | "missing-game-data"
  | "invalid-game-data"
  | "unsupported-upgrade"
  | "not-calculated";

export type Estimate<T> =
  | { status: "known"; value: T }
  | { status: "unknown"; reason: EstimateUnknownReason };

/** Zero is a valid known value; it is never a substitute for unknown data. */
export interface UpgradeCost {
  gold?: number;
  elixir?: number;
  darkElixir?: number;
}

export interface UpgradeEstimate {
  cost: Estimate<UpgradeCost>;
  /** Duration in milliseconds. A known duration of zero represents instant work. */
  durationMs: Estimate<number>;
}

export type UpgradePrerequisite =
  | { kind: "town-hall-level"; minimumLevel: number }
  | { kind: "laboratory-level"; minimumLevel: number }
  | { kind: "pet-house-level"; minimumLevel: number }
  | { kind: "entity-level"; entityId: string; minimumLevel: number };

export interface ProgressionCandidate {
  /** Stable ID from Clash One's progression dataset, not a display name. */
  candidateId: string;
  entityId: string;
  category: PlannerEntityCategory;
  village: PlannerVillage;
  currentLevel: number;
  targetLevel: number;
  prerequisites: readonly UpgradePrerequisite[];
  estimate: UpgradeEstimate;
}

export type ObservedUpgradeSource = "village-import" | "manual" | "restored-local-state";

export interface ObservedActiveUpgrade {
  /** Identifier of the live timer in the app's active-upgrade store. */
  observedUpgradeId: string;
  accountTag: string;
  village: PlannerVillage;
  lane: PlannerLaneAssignment;
  startsAtMs: number;
  completesAtMs: number;
  source: ObservedUpgradeSource;
}

export interface PlannedUpgradeItem {
  id: PlannerItemId;
  candidateId: ProgressionCandidate["candidateId"];
  targetLevel: number;
  /** Optional for backward compatibility and shared-level/batch entities. */
  structureInstanceId?: PlannerStructureInstanceId;
  lane: PlannerLaneAssignment;
  /** User-defined ordering within the assigned lane; lower values run first. */
  order: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface PlannerPlan {
  id: PlannerPlanId;
  accountTag: string;
  village: PlannerVillage;
  items: readonly PlannedUpgradeItem[];
  createdAtMs: number;
  updatedAtMs: number;
}

export type PlannerBlockReason =
  | { code: "prerequisite-unmet"; prerequisite: UpgradePrerequisite }
  | { code: "lane-unavailable"; lane: PlannerLaneId }
  | { code: "lane-ineligible"; lane: "goblin-builder" | "goblin-laboratory"; detail: string }
  | { code: "estimate-unknown"; estimate: "cost" | "duration"; reason: EstimateUnknownReason }
  | { code: "invalid-target-level"; targetLevel: number }
  | { code: "candidate-unavailable"; candidateId: string }
  | { code: "dependency-cycle"; itemIds: readonly string[] };

export type UpgradeProjection =
  | {
      status: "scheduled";
      plannedItemId: PlannerItemId;
      startsAtMs: number;
      completesAtMs: number;
      estimate: UpgradeEstimate;
    }
  | {
      status: "blocked";
      plannedItemId: PlannerItemId;
      reasons: readonly PlannerBlockReason[];
    }
  | {
      status: "unknown";
      plannedItemId: PlannerItemId;
      reasons: readonly PlannerBlockReason[];
    };

export function isKnownEstimate<T>(estimate: Estimate<T>): estimate is { status: "known"; value: T } {
  return estimate.status === "known";
}
