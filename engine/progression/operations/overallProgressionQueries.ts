import type { ResourceType } from "@/types/resource";

import { ProgressionQueries } from "@/services/progression";
import { ProgressionApplicationResult } from "../models";
import type {
  OverallProgressionResult,
  ProgressionTypeSummary,
} from "../models/OverallProgressionResult";

export class OverallProgressionQueries {
  static getTypeSummary(
    result: OverallProgressionResult,
    type: string,
  ): ProgressionTypeSummary | undefined {
    return result.types.find(
      (summary) => summary.type === type,
    );
  }

  static getResourceCost(
    result: OverallProgressionResult,
    resource: ResourceType,
  ): number {
    return result.totalCost[resource] ?? 0;
  }

  static getRemainingUpgradeCount(
    result: OverallProgressionResult,
  ): number {
    return result.remainingEntityCount;
  }

  static getRemainingLevels(
    result: OverallProgressionResult,
  ): number {
    return result.remainingLevels;
  }

  static getProgressionBreakdown(
    result: OverallProgressionResult,
  ): ProgressionTypeSummary[] {
    return [...result.types].sort(
      (a, b) =>
        b.remainingLevels -
        a.remainingLevels,
    );
  }

  static getTypeNames(
    result: OverallProgressionResult,
  ): string[] {
    return result.types.map(
      (summary) => summary.type,
    );
  }

  static hasRemainingProgression(
    result: OverallProgressionResult,
  ): boolean {
    return result.remainingEntityCount > 0;
  }

  static isComplete(
    result: OverallProgressionResult,
  ): boolean {
    return result.remainingEntityCount === 0;
  }

  static getEntitiesByType(
    entities: ProgressionApplicationResult[],
    type: string,
  ): ProgressionApplicationResult[] {
    return entities.filter((result) => {
      if ("moduleId" in result) {
        return type === "crafted";
      }

      return (
        ProgressionQueries
          .getEntity(result.dataId)
          ?.type === type
      );
    });
  }

}