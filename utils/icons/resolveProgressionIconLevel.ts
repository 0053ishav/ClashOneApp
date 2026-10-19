/**
 * Inclusive level ranges used by progression data to select the PNG level.
 */
export interface ProgressionImageRange {
  from: number;
  to: number;
  normal: number;
}

/**
 * Maps a progression level to the normal PNG level configured for its range.
 *
 * Returns undefined when no image range matches.
 */
export function resolveProgressionIconLevel(
  level: number,
  images?: ProgressionImageRange[],
): number | undefined {
  if (!images?.length) {
    return undefined;
  }

  const imageRange = images.find(
    ({ from, to }) => level >= from && level <= to,
  );

  return imageRange?.normal;
}
