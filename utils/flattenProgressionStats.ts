import { formatStatName } from "@/utils/formatStatName";

export interface FlattenedProgressionStat {
  /** Stable dotted path used to match current and next level values. */
  path: string;
  /** Human-readable label, including a mode name when the stat is mode-specific. */
  label: string;
  value: number;
}

/**
 * Converts nested progression stats into scalar rows suitable for UI display.
 *
 * Example: { modes: { normal: { dps: 12 } } } becomes a "Normal · Damage per
 * second" row. Non-numeric leaves are intentionally ignored because they are
 * not comparable numeric progression stats.
 */
export function flattenProgressionStats(stats: unknown): FlattenedProgressionStat[] {
  const flattened: FlattenedProgressionStat[] = [];

  const visit = (value: unknown, path: string[]): void => {
    if (typeof value === "number" && Number.isFinite(value)) {
      const labelPath = path[0] === "modes" ? path.slice(1) : path;
      flattened.push({
        path: path.join("."),
        label: labelPath.map(formatStatName).join(" · "),
        value,
      });
      return;
    }

    if (value == null || typeof value !== "object" || Array.isArray(value)) {
      return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      visit(nestedValue, [...path, key]);
    }
  };

  visit(stats, []);
  return flattened;
}
