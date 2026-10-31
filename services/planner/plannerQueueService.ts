import type {
  PlannerEntityCategory,
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

/**
 * Chooses the default resource lane for a progression category.
 * This is a default assignment only; users can reassign items to another
 * eligible lane when planner lane editing is available.
 */
export function getDefaultPlannerLane(
  category: PlannerEntityCategory,
): PlannerLaneAssignment {
  switch (category) {
    case "troop":
    case "spell":
    case "siege":
      return { lane: "laboratory" };
    case "pet":
      return { lane: "pets" };
    case "building":
    case "hero":
    case "trap":
    case "wall":
      return { lane: "normal-builders", builderIndex: 1 };
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

function sortLane(items: readonly PlannedUpgradeItem[]): PlannedUpgradeItem[] {
  return [...items].sort(
    (a, b) =>
      a.order - b.order ||
      a.createdAtMs - b.createdAtMs ||
      String(a.id).localeCompare(String(b.id)),
  );
}

function compactLane(
  items: readonly PlannedUpgradeItem[],
  key: string,
): PlannedUpgradeItem[] {
  const laneItems = sortLane(items.filter((item) => laneKey(item.lane) === key));
  const orderById = new Map(laneItems.map((item, index) => [item.id, index]));
  return items.map((item) =>
    laneKey(item.lane) === key
      ? { ...item, order: orderById.get(item.id) ?? item.order }
      : item,
  );
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

/** Adds an item at the end of its lane; it does not mutate the input. */
export function addPlannerQueueItem(
  items: readonly PlannedUpgradeItem[],
  item: PlannedUpgradeItem,
): PlannedUpgradeItem[] {
  assertValidItem(item);
  if (items.some((existing) => existing.id === item.id)) {
    throw new PlannerQueueError("DUPLICATE_PLANNER_ITEM_ID");
  }

  const key = laneKey(item.lane);
  const laneItems = sortLane(items.filter((existing) => laneKey(existing.lane) === key));
  const normalized = compactLane(items, key);
  return sortPlannerQueue([...normalized, { ...item, order: laneItems.length }]);
}

/** Updates an item, preserving its position unless it moves to another lane. */
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

  const oldKey = laneKey(current.lane);
  const updated: PlannedUpgradeItem = {
    ...current,
    ...update,
    updatedAtMs: Math.max(now, current.createdAtMs),
  };
  assertValidItem(updated);
  const newKey = laneKey(updated.lane);

  if (oldKey === newKey) {
    const replaced = items.map((item) => item.id === itemId ? updated : item);
    return sortPlannerQueue(compactLane(replaced, newKey));
  }

  const withoutCurrent = items.filter((item) => item.id !== itemId);
  const oldLaneCompacted = compactLane(withoutCurrent, oldKey);
  const newLaneItems = sortLane(
    oldLaneCompacted.filter((item) => laneKey(item.lane) === newKey),
  );
  return sortPlannerQueue([
    ...compactLane(oldLaneCompacted, newKey),
    { ...updated, order: newLaneItems.length },
  ]);
}

/** Removes an item and compacts its lane. */
export function removePlannerQueueItem(
  items: readonly PlannedUpgradeItem[],
  itemId: PlannerItemId,
): PlannedUpgradeItem[] {
  const removed = items.find((item) => item.id === itemId);
  if (!removed) throw new PlannerQueueError("PLANNER_ITEM_NOT_FOUND");
  const remaining = items.filter((item) => item.id !== itemId);
  return sortPlannerQueue(compactLane(remaining, laneKey(removed.lane)));
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
  const laneItems = sortLane(items.filter((candidate) => laneKey(candidate.lane) === key));
  const from = laneItems.findIndex((candidate) => candidate.id === itemId);
  const [moving] = laneItems.splice(from, 1);
  laneItems.splice(Math.min(targetOrder, laneItems.length), 0, moving);

  const orderById = new Map(laneItems.map((candidate, index) => [candidate.id, index]));
  const updated = items.map((candidate) =>
    laneKey(candidate.lane) === key
      ? { ...candidate, order: orderById.get(candidate.id) ?? candidate.order }
      : candidate,
  );
  return sortPlannerQueue(updated);
}
