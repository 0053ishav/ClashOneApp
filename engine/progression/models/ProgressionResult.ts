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
  /** Original stat values before live event effects. */
  baseCurrentStats: Record<string, number>;
  baseNextStats: Record<string, number>;
  /** Stat values after live event effects, such as resource production. */
  currentStats: Record<string, number>;
  nextStats: Record<string, number>;
  /** Live event modifiers applied to resource production stats. */
  appliedResourceModifierIds: string[];
  remainingCost: number;
  remainingUpgradeTime: number;
  currentHallLevel?: number;
  requiredHallLevel?: number;
  currentXp?: number;
  nextXp?: number;
  progressPercent: number;
  achievableLevel: number;
}
