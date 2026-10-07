import type { ResolvedProgression } from "../models";

export function getMaxLevel(
  progression: ResolvedProgression,
): number {
  return progression.maxLevel;
}