import type {
  PlannerItemId,
  PlannerLaneAssignment,
  PlannedUpgradeItem,
} from "@/types/planner";

export type PlannerQueueErrorCode =
  | "DUPLICATE_PLANNER_ITEM_ID"
  | "PLANNER_ITEM_NOT_FOUND"
  | "INVALID_PLANNER_ORDER"
  | "INVALID_PLANNER_ITEM";

export class PlannerQueueError extends Error {
  constructor(readonly code: PlannerQueueErrorCode) {
    super(code);
    this.name = "PlannerQueueError";
  }
}

function laneKey(lane: PlannerLaneAssignment): string {
  return lane.lane === "normal-builders"
    ? `${lane.lane}:${lane.builderIndex}`
    : lane.lane;
}

function assertValidItem(item: PlannedUpgradeItem): void {
  if (
    !item.id.trim() ||
    !item.candidateId.trim() ||
    !Number.isSafeInteger(item.targetLevel) ||
    item.targetLevel < 1 ||
    !Number.isSafeInteger(item.order) ||
    !Number.isSafeInteger(item.createdAtMs) ||
    item.createdAtMs < 0 ||
    !Number.isSafeInteger(item.updatedAtMs) ||
    item.updatedAtMs < item.createdAtMs
  ) {
    throw new PlannerQueueError("INVALID_PLANNER_ITEM");
  }
}

/** Sorts deterministically without mutating the caller's array. */
export function sortPlannerQueue(
  items: readonly PlannedUpgradeItem[],
): PlannedUpgradeItem[] {
  return [...items].sort(
    (a, b) =>
      laneKey(a.lane).localeCompare(laneKey(b.lane)) ||
      a.order - b.order ||
      a.createdAtMs - b.createdAtMs ||
      String(a.id).localeCompare(String(b.id)),
  );
}

/**
 * Adds a planned item while preserving stable IDs and compact ordering inside
 * its lane. Live timers are deliberately not accepted by this domain service.
 */
export function addPlannerQueueItem(
  items: readonly PlannedUpgradeItem[],
  item: PlannedUpgradeItem,
): PlannedUpgradeItem[] {
  assertValidItem(item);
  if (items.some((existing) => existing.id === item.id)) {
    throw new PlannerQueueError("DUPLICATE_PLANNER_ITEM_ID");
  }

  const laneItems = items
    .filter((existing) => laneKey(existing.lane) === laneKey(item.lane))
    .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)));
  const nextItem = { ...item, order: laneItems.length };
  return sortPlannerQueue([...items, nextItem]);
}

/** Replaces editable fields but never permits an item ID change. */
export function updatePlannerQueueItem(
  items: readonly PlannedUpgradeItem[],
  itemId: PlannerItemId,
  update: Pick<PlannedUpgradeItem, "candidateId" | "targetLevel" | "lane"> &
    Partial<Pick<PlannedUpgradeItem, "structureInstanceId">>,
  now = Date.now(),
): PlannedUpgradeItem[] {
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new PlannerQueueError("INVALID_PLANNER_ITEM");
  }
  const current = items.find((item) => item.id === itemId);
  if (!current) throw new PlannerQueueError("PLANNER_ITEM_NOT_FOUND");

  const updated: PlannedUpgradeItem = {
    ...current,
    ...update,
    updatedAtMs: Math.max(now, current.createdAtMs),
  };
  assertValidItem(updated);

  const withoutCurrent = items.filter((item) => item.id !== itemId);
  const nextLaneItems = withoutCurrent
    .filter((item) => laneKey(item.lane) === laneKey(updated.lane))
    .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)));
  const normalized = withoutCurrent.map((item) => {
    if (laneKey(item.lane) !== laneKey(updated.lane)) return item;
    const index = nextLaneItems.findIndex((laneItem) => laneItem.id === item.id);
    return index < 0 ? item : { ...item, order: index };
  });
  updated.order = nextLaneItems.length;
  return sortPlannerQueue([...normalized, updated]);
}

/** Removes an item and compacts only the lane it belonged to. */
export function removePlannerQueueItem(
  items: readonly PlannedUpgradeItem[],
  itemId: PlannerItemId,
): PlannedUpgradeItem[] {
  const removed = items.find((item) => item.id === itemId);
  if (!removed) throw new PlannerQueueError("PLANNER_ITEM_NOT_FOUND");
  const remaining = items.filter((item) => item.id !== itemId);
  const removedLane = laneKey(removed.lane);
  const laneItems = remaining
    .filter((item) => laneKey(item.lane) === removedLane)
    .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)));
  const orderById = new Map(laneItems.map((item, index) => [item.id, index]));
  return sortPlannerQueue(
    remaining.map((item) =>
      laneKey(item.lane) === removedLane
        ? { ...item, order: orderById.get(item.id) ?? item.order }
        : item,
    ),
  );
}

/** Moves an item to a zero-based position in its current lane. */
export function movePlannerQueueItem(
  items: readonly PlannedUpgradeItem[],
  itemId: PlannerItemId,
  targetOrder: number,
): PlannedUpgradeItem[] {
  if (!Number.isSafeInteger(targetOrder) || targetOrder < 0) {
    throw new PlannerQueueError("INVALID_PLANNER_ORDER");
  }
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) throw new PlannerQueueError("PLANNER_ITEM_NOT_FOUND");

  const key = laneKey(item.lane);
  const laneItems = items
    .filter((candidate) => laneKey(candidate.lane) === key)
    .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)));
  const from = laneItems.findIndex((candidate) => candidate.id === itemId);
  const [moving] = laneItems.splice(from, 1);
  laneItems.splice(Math.min(targetOrder, laneItems.length), 0, moving);

  const orderById = new Map(laneItems.map((candidate, index) => [candidate.id, index]));
  return sortPlannerQueue(
    items.map((candidate) =>
      laneKey(candidate.lane) === key
        ? { ...candidate, order: orderById.get(candidate.id) ?? candidate.order }
        : candidate,
    ),
  );
}
