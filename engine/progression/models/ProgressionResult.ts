import { ResourceType } from "@/types/resource";

export interface ProgressionResult {
  dataId: number;
  currentLevel: number;
  nextLevel?: number;
  maxLevel: number;
  remainingLevels: number;
  isMaxLevel: boolean;
  nextCost?: number;
  resource: ResourceType;
  nextUpgradeTime?: number;
  remainingCost: number;
  remainingUpgradeTime: number;
  currentHallLevel?: number;
  requiredHallLevel?: number;
  currentXp?: number;
  nextXp?: number;
  currentStats: Record<string, number>;
  nextStats: Record<string, number>;
  progressPercent: number;
  achievableLevel: number;
}