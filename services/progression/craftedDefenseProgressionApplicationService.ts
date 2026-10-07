import type { Upgrade } from "@/types/upgrade";

import {
  CraftedProgressionService,
} from "@/engine/crafted";

import type {
  CraftedProgressionInput,
  CraftedProgressionResult,
} from "@/engine/crafted";

import { useAccountStore } from "@/stores/accountStore";
import {
  CraftedDefenseQueries,
} from "./craftedDefenseQueries";

export interface CraftedProgressionContext {
  upgrade: Upgrade;

  defense: NonNullable<
    ReturnType<typeof CraftedDefenseQueries.getDefense>
  >;

  progression: NonNullable<
    ReturnType<typeof CraftedDefenseQueries.getProgression>
  >;

  module: NonNullable<
    NonNullable<
      ReturnType<typeof CraftedDefenseQueries.getProgression>
    >["modules"][number]
  >;

  currentHallLevel: number;
  currentLevel: number;
  nextLevel: number;
}

export function toCraftedProgressionInput(
  context: CraftedProgressionContext,
): CraftedProgressionInput {
  return {
    defense: context.defense,
    progression: context.progression,
    currentHallLevel: context.currentHallLevel,
    module: context.module,
    currentLevel: context.currentLevel,
    nextLevel: context.nextLevel,
  };
}

export class CraftedDefenseProgressionApplicationService {
  static resolve(
    upgrade: Upgrade,
  ): CraftedProgressionResult | null {
    const {
      dataId,
      moduleId,
      currentLevel,
      nextLevel,
      isCrafted,
    } = upgrade;

    /**
     * This service is only for crafted upgrades.
     */
    if (!isCrafted) {
      return null;
    }

    if (
      dataId == null ||
      moduleId == null
    ) {
      return null;
    }

    /**
     * 1. Check whether this defense
     *    is active in the current event.
     */
    if (
      !CraftedDefenseQueries.isKnown(
        dataId,
      )
    ) {
      return null;
    }

    /**
     * 2. Resolve static metadata.
     */
    const defense =
      CraftedDefenseQueries.getDefense(
        dataId,
      );

    if (!defense) {
      return null;
    }

    /**
     * 3. Resolve progression data.
     */
    const progression =
      CraftedDefenseQueries.getProgression(
        dataId,
      );

    if (!progression) {
      return null;
    }

    /**
     * 4. Resolve the requested module.
     */
    const module =
      progression.modules[moduleId];

    if (!module) {
      return null;
    }

    /**
     * 5. Resolve player levels.
     */
    const resolvedCurrentLevel =
      currentLevel ?? 0;

    const resolvedNextLevel =
      nextLevel ??
      resolvedCurrentLevel + 1;


    const profile =
      useAccountStore
        .getState()
        .getProfile(upgrade.accountTag);

    const currentHallLevel =
      upgrade.village === "builderBase"
        ? profile?.builderHallLevel
        : profile?.townHallLevel;

    if (currentHallLevel == null) {
      return null;
    }

    /**
     * 6. Build progression input.
     */

    const input: CraftedProgressionInput = {
      defense,
      progression,
      module,
      currentLevel: resolvedCurrentLevel,
      currentHallLevel,
      nextLevel: resolvedNextLevel,
    };

    /**
    * 7. Resolve final crafted progression.
    */

    return CraftedProgressionService.resolve(
      input,
    );
  }
}