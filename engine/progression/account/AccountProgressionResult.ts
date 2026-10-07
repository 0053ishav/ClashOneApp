import { ProgressionResult } from "../models";

export interface AccountProgressionResult {
  entities: ProgressionResult[];

  totalRemainingCost: number;

  totalRemainingTime: number;

  totalRemainingLevels: number;

  completedEntities: number;

  maxedEntities: number;

  completionPercentage: number;
}