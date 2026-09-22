import type {
  CraftedProgressionInput,
  CraftedResolvedProgression,
} from "./model";

export class CraftedProgressionResolver {
  static resolve(
    input: CraftedProgressionInput,
  ): CraftedResolvedProgression {
    const current =
      input.module.levels[
      input.currentLevel
      ];

    const next =
      input.module.levels[
      input.currentLevel + 1
      ];

    return {
      defense: input.defense,

      progression: input.progression,

      module: input.module,

      currentLevel:
        input.currentLevel,

      currentHallLevel: input.currentHallLevel,
      current,

      next,

      maxLevel:
        input.module.maxLevel,

    };
  }
}