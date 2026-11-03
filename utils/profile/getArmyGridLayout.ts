export interface ArmyGridLayout {
  columns: number;
  cardWidth: number;
}

const MIN_CARD_WIDTH = 44;
const GRID_GAP = 5;
const MAX_COLUMNS = 8;
const DEFAULT_COLUMNS = 5;

/**
 * Derives a compact Army grid from its measured content width.
 * The same result drives both row grouping and card sizing.
 */
export function getArmyGridLayout(containerWidth: number): ArmyGridLayout {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return { columns: DEFAULT_COLUMNS, cardWidth: 0 };
  }

  const columns = Math.min(
    MAX_COLUMNS,
    Math.max(
      1,
      Math.floor((containerWidth + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP)),
    ),
  );
  const cardWidth =
    (containerWidth - GRID_GAP * (columns - 1)) / columns;

  return { columns, cardWidth };
}
