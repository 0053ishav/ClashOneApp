import type {
  ProgressionLevel as BackendProgressionLevel
} from "@/types/progression";

import type {
  ProgressionInput,
  ProgressionLevel,
  ResolvedProgression
} from "./models";

export class ProgressionResolver {
  static resolve(
    input: ProgressionInput
  ): ResolvedProgression {
    const current =
      input.progression.levels[
      input.currentLevel
      ];

    const next =
      input.progression.levels[
      input.currentLevel + 1
      ];

    return {
      entity: input.entity,
      progression: input.progression,
      currentLevel: input.currentLevel,
      current: this.mapLevel(
        input.currentLevel,
        current,
      ),
      next: this.mapLevel(
        input.currentLevel + 1,
        next,
      ),
      maxLevel:
        input.progression.maxLevel,
    };
  }

  private static mapLevel(
    level: number,
    data?: BackendProgressionLevel,
  ): ProgressionLevel | undefined {
    if (!data) return undefined;

    return {
      level,
      ...data,
      requiredHallLevel: data.hallLevel,
      laboratoryLevel:
        data.laboratoryLevel ??
        data.labLevel,
    };
  };

}