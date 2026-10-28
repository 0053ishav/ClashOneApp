import type { ProgressionImageRange } from "@/types/progression";

export type { ProgressionImageRange } from "@/types/progression";

/**
 * Maps a progression level to the normal PNG level configured for its range.
 *
 * Returns undefined when no valid image range matches.
 */
export function resolveProgressionIconLevel(
  level: number,
  images?: ProgressionImageRange[],
): number | undefined {
  if (!Number.isFinite(level) || level <= 0 || !images?.length) {
    return undefined;
  }

  const imageRange = images.find(
    ({ from, to, normal }) =>
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      Number.isInteger(normal) &&
      normal > 0 &&
      from > 0 &&
      to >= from &&
      level >= from &&
      level <= to,
  );

  return imageRange?.normal;
}

/**
 * Resolves a level to its matching icon, or the first valid configured icon
 * when the level is outside the available image ranges.
 */
export function resolveProgressionIconLevelOrFirst(
  level: number,
  images?: ProgressionImageRange[],
): number | undefined {
  const matchingLevel = resolveProgressionIconLevel(level, images);
  if (matchingLevel != null) {
    return matchingLevel;
  }

  return images?.find(
    ({ from, to, normal }) =>
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      from > 0 &&
      to >= from &&
      Number.isInteger(normal) &&
      normal > 0,
  )?.normal;
}