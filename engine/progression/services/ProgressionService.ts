
import {
  ProgressionEngine,
} from "../ProgressionEngine";

import {
  ProgressionResolver,
} from "../ProgressionResolver";

import type {
  ProgressionInput,
  ProgressionResult
} from "../models";

export class ProgressionService {
   /**
   * Resolve a single progression input.
   */
  static resolve(
    input: ProgressionInput,
  ): ProgressionResult {
    const resolved =
      ProgressionResolver.resolve(
        input,
      );

    return ProgressionEngine.resolve(
      resolved,
    );
  }
}