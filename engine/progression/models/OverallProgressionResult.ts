import type { ResourceType } from "@/types/resource";
import { ProgressionApplicationResult } from "./ProgressionApplicationResult";

export type ProgressionCostSummary =
  Partial<Record<ResourceType, number>>;

export interface ProgressionTypeSummary {
  type: string;

  entityCount: number;
  maxedCount: number;
  remainingEntityCount: number;

  remainingLevels: number;

  totalCost: ProgressionCostSummary;
  totalUpgradeTime: number;

  progressPercent: number;
}

export interface OverallProgressionResult {
  entityCount: number;
  maxedCount: number;
  remainingEntityCount: number;

  remainingLevels: number;

  totalCost: ProgressionCostSummary;
  totalUpgradeTime: number;

  progressPercent: number;

  types: ProgressionTypeSummary[];

  longestUpgradeTime: number;
  mostExpensiveUpgradeCost: number;

  entities: ProgressionApplicationResult[];
}