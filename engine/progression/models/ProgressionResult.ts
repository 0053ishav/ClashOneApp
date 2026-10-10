import { ResourceType } from "@/types/resource";

export interface ProgressionResult {
  dataId: number;
  currentLevel: number;
  nextLevel?: number;
  maxLevel: number;
  remainingLevels: number;
  isMaxLevel: boolean;
  /** Base values from the progression dataset before event modifiers. */
  baseNextCost?: number;
  baseNextUpgradeTime?: number;
  /** Effective values for the supplied upgrade start context. */
  nextCost?: number;
  resource: ResourceType;
  nextUpgradeTime?: number;
  /** Event modifiers applied to the prospective next-level upgrade. */
  appliedModifierIds: string[];
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
