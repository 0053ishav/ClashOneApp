import type { CraftedProgressionResult } from "@/engine/crafted/model";
import { ProgressionQueries } from "@/services/progression/progressionQueries";
import type {
  OverallProgressionResult,
  ProgressionCostSummary,
  ProgressionTypeSummary,
} from "../models/OverallProgressionResult";
import type { ProgressionResult } from "../models/ProgressionResult";

export type ProgressionAggregationResult =
  | ProgressionResult
  | CraftedProgressionResult;

function isCraftedResult(
  result: ProgressionAggregationResult,
): result is CraftedProgressionResult {
  return "moduleId" in result;
}

function resolveType(
  result: ProgressionAggregationResult,
): string {
  if (isCraftedResult(result)) {
    return "crafted";
  }

  return (
    ProgressionQueries.getEntity(result.dataId)?.type ??
    "unknown"
  );
}

function addCost(
  total: ProgressionCostSummary,
  result: ProgressionAggregationResult,
) {
  const resource = result.resource;
  const cost = result.remainingCost;

  total[resource] = (total[resource] ?? 0) + cost;
}

function sumRemainingLevels(
  results: ProgressionAggregationResult[],
): number {
  return results.reduce(
    (total, result) => total + result.remainingLevels,
    0,
  );
}

function sumRemainingTime(
  results: ProgressionAggregationResult[],
): number {
  return results.reduce(
    (total, result) => total + result.remainingUpgradeTime,
    0,
  );
}

function sumRemainingCost(
  results: ProgressionAggregationResult[],
): ProgressionCostSummary {
  const total: ProgressionCostSummary = {};

  for (const result of results) {
    addCost(total, result);
  }

  return total;
}

function countMaxed(
  results: ProgressionAggregationResult[],
): number {
  return results.filter(
    (result) => result.isMaxLevel,
  ).length;
}

function calculateProgressPercent(
  results: ProgressionAggregationResult[],
): number {
  if (results.length === 0) {
    return 100;
  }

  const totalLevels = results.reduce(
    (total, result) => total + result.maxLevel,
    0,
  );

  if (totalLevels <= 0) {
    return 100;
  }

  const currentLevels = results.reduce(
    (total, result) =>
      total + Math.min(result.currentLevel, result.maxLevel),
    0,
  );

  return Math.min(
    100,
    Math.max(
      0,
      (currentLevels / totalLevels) * 100,
    ),
  );
}

function findLongestUpgradeTime(
  results: ProgressionAggregationResult[],
): number {
  return results.reduce(
    (longest, result) =>
      Math.max(longest, result.remainingUpgradeTime),
    0,
  );
}

function findMostExpensiveUpgradeCost(
  results: ProgressionAggregationResult[],
): number {
  return results.reduce(
    (highest, result) =>
      Math.max(highest, result.remainingCost),
    0,
  );
}


// static findLongestUpgrade(
//   results: ProgressionAggregationResult[],
// ): ProgressionAggregationResult | undefined {
//   if (results.length === 0) {
//     return undefined;
//   }

//   return results.reduce(
//     (longest, current) =>
//       current.remainingUpgradeTime >
//       longest.remainingUpgradeTime
//         ? current
//         : longest,
//   );
// }

// static findMostExpensiveUpgrade(
//   results: ProgressionAggregationResult[],
// ): ProgressionAggregationResult | undefined {
//   if (results.length === 0) {
//     return undefined;
//   }

//   return results.reduce(
//     (mostExpensive, current) =>
//       current.remainingCost >
//       mostExpensive.remainingCost
//         ? current
//         : mostExpensive,
//   );
// }

function buildTypeSummary(
  type: string,
  results: ProgressionAggregationResult[],
): ProgressionTypeSummary {
  const maxedCount = countMaxed(results);

  return {
    type,

    entityCount: results.length,

    maxedCount,

    remainingEntityCount:
      results.length - maxedCount,

    remainingLevels:
      sumRemainingLevels(results),

    totalCost:
      sumRemainingCost(results),

    totalUpgradeTime:
      sumRemainingTime(results),

    progressPercent:
      calculateProgressPercent(results),
  };
}

export class ProgressionAggregation {
  static aggregate(
    results: ProgressionAggregationResult[],
  ): OverallProgressionResult {
    const maxedCount = countMaxed(results);

    const groups = new Map<
      string,
      ProgressionAggregationResult[]
    >();

    for (const result of results) {
      const type = resolveType(result);

      const group =
        groups.get(type) ?? [];

      group.push(result);

      groups.set(type, group);
    }

    const types = Array.from(
      groups.entries(),
    ).map(([type, group]) =>
      buildTypeSummary(type, group),
    );

    return {
      entities: results,
      entityCount: results.length,

      maxedCount,

      remainingEntityCount:
        results.length - maxedCount,

      remainingLevels:
        sumRemainingLevels(results),

      totalCost:
        sumRemainingCost(results),

      totalUpgradeTime:
        sumRemainingTime(results),

      progressPercent:
        calculateProgressPercent(results),

      types,

      longestUpgradeTime:
        findLongestUpgradeTime(results),

      mostExpensiveUpgradeCost:
        findMostExpensiveUpgradeCost(results),
    };
  }
}