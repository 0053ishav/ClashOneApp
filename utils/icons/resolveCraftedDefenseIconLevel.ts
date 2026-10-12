import type { CraftedDefenseImageRange } from "@/types/craftedDefenseProgression";

/**
 * Maps a crafted defense's progression level to the normal PNG level
 * defined by its inclusive image range.
 *
 * Returns undefined when no range matches. Crafted-defense icons must
 * never use the aggregate level as a PNG level because only the "normal"
 * value in the matching image range identifies a valid PNG.
 */
export function resolveCraftedDefenseIconLevel(
  level: number,
  images?: CraftedDefenseImageRange[],
): number | undefined {
  if (!images?.length) {
    return undefined;
  }

  const imageRange = images.find(
    ({ from, to }) => level >= from && level <= to,
  );

  return imageRange?.normal;
}
