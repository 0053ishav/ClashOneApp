import type {
    ProgressionResult,
} from "../models";

import type {
    AccountProgressionResult,
} from "./AccountProgressionResult";

export class AccountProgressionEngine {
  static resolve(
    entities: ProgressionResult[],
  ): AccountProgressionResult {
    const totalRemainingCost =
      entities.reduce(
        (sum, entity) =>
          sum + entity.remainingCost,
        0,
      );

    const totalRemainingTime =
      entities.reduce(
        (sum, entity) =>
          sum +
          entity.remainingUpgradeTime,
        0,
      );

    const totalRemainingLevels =
      entities.reduce(
        (sum, entity) =>
          sum +
          entity.remainingLevels,
        0,
      );

    const maxedEntities =
      entities.filter(
        entity => entity.isMaxLevel,
      ).length;

    const completedEntities =
      entities.length;

    return {
      entities,

      totalRemainingCost,

      totalRemainingTime,

      totalRemainingLevels,

      completedEntities,

      maxedEntities,

      completionPercentage:
        completedEntities === 0
          ? 0
          : Math.round(
              (maxedEntities /
                completedEntities) *
                100,
            ),
    };
  }
}