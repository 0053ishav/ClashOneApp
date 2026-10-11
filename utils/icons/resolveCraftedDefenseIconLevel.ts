import type { CraftedDefenseImageRange } from "@/types/craftedDefenseProgression";

/**
 * Maps a crafted defense's progression level to the normal PNG level
 * defined by its inclusive image range.
 *
 * If no range matches, preserve the supplied level for compatibility
 * with older progression data that has no image ranges.
 */
export function resolveCraftedDefenseIconLevel(
  level: number,
  images?: CraftedDefenseImageRange[],
): number {
  const imageRange = images?.find(
    ({ from, to }) => level >= from && level <= to,
  );

  return imageRange?.normal ?? level;
}
