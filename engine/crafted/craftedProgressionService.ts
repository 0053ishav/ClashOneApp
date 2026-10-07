import {
    CraftedProgressionEngine,
} from "./craftedProgressionEngine";

import {
    CraftedProgressionResolver,
} from "./craftedProgressionResolver";

import type {
    CraftedProgressionInput,
    CraftedProgressionResult,
} from "./model";

export class CraftedProgressionService {
  static resolve(
    input: CraftedProgressionInput,
  ): CraftedProgressionResult {
    const resolved =
      CraftedProgressionResolver.resolve(
        input,
      );

    return CraftedProgressionEngine.resolve(
      resolved,
    );
  }
}