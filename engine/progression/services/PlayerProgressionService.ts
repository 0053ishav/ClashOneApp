
import type {
    ProgressionInput,
    ProgressionResult,
} from "../models";
import { ProgressionService } from "./ProgressionService";

export class PlayerProgressionService {
  /**
   * Resolve a single entity progression.
   */
  private static resolve(
    input: ProgressionInput,
  ): ProgressionResult {
    return ProgressionService.resolve(input);
  }

  /**
   * Resolve multiple entities.
   */
  static resolveMany(
    inputs: ProgressionInput[],
  ): ProgressionResult[] {
    return inputs.map(input =>
      this.resolve(input),
    );
  }

  /**
   * Resolve entities using a filter.
   */
  private static resolveWhere(
    inputs: ProgressionInput[],
    predicate: (
      input: ProgressionInput,
    ) => boolean,
  ): ProgressionResult[] {
    return inputs
      .filter(predicate)
      .map(input =>
        this.resolve(input),
      );
  }

  /**
   * Resolve by village.
   */
  static resolveVillage(
    inputs: ProgressionInput[],
    village: string,
  ): ProgressionResult[] {
    return this.resolveWhere(
      inputs,
      input =>
        input.entity.village ===
        village,
    );
  }

  /**
   * Resolve by category.
   */
  static resolveCategory(
    inputs: ProgressionInput[],
    category: string,
  ): ProgressionResult[] {
    return this.resolveWhere(
      inputs,
      input =>
        input.entity.category ===
        category,
    );
  }

  /**
   * Resolve by subtype.
   */
  static resolveSubType(
    inputs: ProgressionInput[],
    subType: string,
  ): ProgressionResult[] {
    return this.resolveWhere(
      inputs,
      input =>
        input.entity.subType ===
        subType,
    );
  }
}