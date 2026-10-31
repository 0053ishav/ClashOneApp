import { getDB } from "@/db/database";
import type {
  PlannerItemId,
  PlannerLaneAssignment,
  PlannerPlan,
  PlannerPlanId,
  PlannedUpgradeItem,
} from "@/types/planner";

type PlanRow = {
  id: string;
  account_player_tag: string;
  village: "home";
  name: string;
  created_at_ms: number;
  updated_at_ms: number;
};

type PlanItemRow = {
  id: string;
  candidate_id: string;
  target_level: number;
  lane_json: string;
  user_order: number;
  created_at_ms: number;
  updated_at_ms: number;
  structure_instance_id?: string | null;
};

function requireAccountTag(accountTag: string): void {
  if (!accountTag.trim()) throw new Error("INVALID_ACCOUNT_TAG");
}

function requirePlanId(planId: string): void {
  if (!planId.trim()) throw new Error("INVALID_PLANNER_PLAN_ID");
}

function parseLaneAssignment(value: string): PlannerLaneAssignment {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("INVALID_STORED_PLANNER_LANE");
  }

  if (!parsed || typeof parsed !== "object" || !("lane" in parsed)) {
    throw new Error("INVALID_STORED_PLANNER_LANE");
  }

  const lane = (parsed as { lane?: unknown }).lane;
  if (lane === "normal-builders") {
    const builderIndex = (parsed as { builderIndex?: unknown }).builderIndex;
    if (typeof builderIndex !== "number" || !Number.isInteger(builderIndex) || builderIndex < 1) {
      throw new Error("INVALID_STORED_PLANNER_LANE");
    }
    return { lane, builderIndex };
  }

  if (
    lane === "laboratory" ||
    lane === "pets" ||
    lane === "goblin-builder" ||
    lane === "goblin-laboratory"
  ) {
    return { lane };
  }

  throw new Error("INVALID_STORED_PLANNER_LANE");
}

function mapPlanItem(row: PlanItemRow): PlannedUpgradeItem {
  return {
    id: row.id as PlannerItemId,
    candidateId: row.candidate_id,
    targetLevel: row.target_level,
    ...(row.structure_instance_id ? { structureInstanceId: row.structure_instance_id as PlannedUpgradeItem["structureInstanceId"] } : {}),
    lane: parseLaneAssignment(row.lane_json),
    order: row.user_order,
    createdAtMs: row.created_at_ms,
    updatedAtMs: row.updated_at_ms,
  };
}

async function mapPlan(
  accountTag: string,
  row: PlanRow,
): Promise<PlannerPlan> {
  const db = await getDB();
  const rows = await db.getAllAsync<PlanItemRow>(
    `SELECT id, candidate_id, target_level, structure_instance_id, lane_json, user_order, created_at_ms, updated_at_ms
     FROM planner_plan_items
     WHERE plan_id = ? AND account_player_tag = ?
     ORDER BY user_order ASC, created_at_ms ASC, id ASC`,
    [row.id, accountTag],
  );

  return {
    id: row.id as PlannerPlanId,
    accountTag: row.account_player_tag,
    village: row.village,
    items: rows.map(mapPlanItem),
    createdAtMs: row.created_at_ms,
    updatedAtMs: row.updated_at_ms,
  };
}

/** Creates a user-authored plan; live upgrade timers remain in the upgrades table. */
export async function createPlannerPlan(
  accountTag: string,
  planId: PlannerPlanId,
  now = Date.now(),
): Promise<PlannerPlan> {
  requireAccountTag(accountTag);
  requirePlanId(planId);
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("INVALID_PLANNER_TIMESTAMP");

  const db = await getDB();
  await db.runAsync(
    `INSERT INTO planner_plans
      (id, account_player_tag, village, name, created_at_ms, updated_at_ms)
     VALUES (?, ?, 'home', 'Upgrade Plan', ?, ?)`,
    [planId, accountTag, now, now],
  );

  const row = await db.getFirstAsync<PlanRow>(
    `SELECT id, account_player_tag, village, name, created_at_ms, updated_at_ms
     FROM planner_plans WHERE id = ? AND account_player_tag = ?`,
    [planId, accountTag],
  );
  if (!row) throw new Error("PLANNER_PLAN_NOT_FOUND");
  return mapPlan(accountTag, row);
}

/** Returns only plans owned by the requested account tag. */
export async function listPlannerPlans(accountTag: string): Promise<PlannerPlan[]> {
  requireAccountTag(accountTag);
  const db = await getDB();
  const rows = await db.getAllAsync<PlanRow>(
    `SELECT id, account_player_tag, village, name, created_at_ms, updated_at_ms
     FROM planner_plans WHERE account_player_tag = ?
     ORDER BY updated_at_ms DESC, id ASC`,
    [accountTag],
  );
  return Promise.all(rows.map((row) => mapPlan(accountTag, row)));
}

/** An unknown or other-account plan is indistinguishable from a missing plan. */
export async function getPlannerPlan(
  accountTag: string,
  planId: PlannerPlanId,
): Promise<PlannerPlan | null> {
  requireAccountTag(accountTag);
  requirePlanId(planId);
  const db = await getDB();
  const row = await db.getFirstAsync<PlanRow>(
    `SELECT id, account_player_tag, village, name, created_at_ms, updated_at_ms
     FROM planner_plans WHERE id = ? AND account_player_tag = ?`,
    [planId, accountTag],
  );
  return row ? mapPlan(accountTag, row) : null;
}

/** Upserts only when the parent plan belongs to the supplied account. */
export async function savePlannerItem(
  accountTag: string,
  planId: PlannerPlanId,
  item: PlannedUpgradeItem,
): Promise<void> {
  requireAccountTag(accountTag);
  requirePlanId(planId);
  if (!item.id.trim() || !item.candidateId.trim()) throw new Error("INVALID_PLANNER_ITEM");
  if (!Number.isSafeInteger(item.targetLevel) || item.targetLevel < 1) throw new Error("INVALID_PLANNER_TARGET_LEVEL");
  if (!Number.isSafeInteger(item.order)) throw new Error("INVALID_PLANNER_ORDER");
  if (
    !Number.isSafeInteger(item.createdAtMs) || item.createdAtMs < 0 ||
    !Number.isSafeInteger(item.updatedAtMs) || item.updatedAtMs < item.createdAtMs
  ) throw new Error("INVALID_PLANNER_TIMESTAMP");

  const db = await getDB();
  const owner = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM planner_plans WHERE id = ? AND account_player_tag = ?",
    [planId, accountTag],
  );
  if (!owner) throw new Error("PLANNER_PLAN_NOT_FOUND");

  if (item.structureInstanceId) {
    const instance = await db.getFirstAsync<{ id: string; identity_confidence: "stable" | "ambiguous" }>(
      "SELECT id, identity_confidence FROM structure_instances WHERE id = ? AND account_player_tag = ?",
      [item.structureInstanceId, accountTag],
    );
    if (!instance) throw new Error("STRUCTURE_INSTANCE_NOT_FOUND");
    if (instance.identity_confidence !== "stable") throw new Error("STRUCTURE_INSTANCE_IDENTITY_AMBIGUOUS");
  }

  await db.runAsync(
    `INSERT INTO planner_plan_items
      (id, plan_id, account_player_tag, candidate_id, target_level, structure_instance_id, lane_json, user_order, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(plan_id, id) DO UPDATE SET
       candidate_id = excluded.candidate_id,
       target_level = excluded.target_level,
       structure_instance_id = excluded.structure_instance_id,
       lane_json = excluded.lane_json,
       user_order = excluded.user_order,
       updated_at_ms = excluded.updated_at_ms
     WHERE planner_plan_items.account_player_tag = excluded.account_player_tag`,
    [
      item.id,
      planId,
      accountTag,
      item.candidateId,
      item.targetLevel,
      item.structureInstanceId ?? null,
      JSON.stringify(item.lane),
      item.order,
      item.createdAtMs,
      item.updatedAtMs,
    ],
  );
  await db.runAsync(
    "UPDATE planner_plans SET updated_at_ms = ? WHERE id = ? AND account_player_tag = ?",
    [item.updatedAtMs, planId, accountTag],
  );
}

/** Deletes an item only through its account-owned plan. */
export async function deletePlannerItem(
  accountTag: string,
  planId: PlannerPlanId,
  itemId: PlannerItemId,
): Promise<void> {
  requireAccountTag(accountTag);
  requirePlanId(planId);
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM planner_plan_items
     WHERE id = ? AND plan_id = ? AND account_player_tag = ?
       AND EXISTS (
         SELECT 1 FROM planner_plans
         WHERE planner_plans.id = planner_plan_items.plan_id
           AND planner_plans.account_player_tag = ?
       )`,
    [itemId, planId, accountTag, accountTag],
  );
}

/** Deletes a plan only when owned by the supplied account; SQLite cascades its items. */
export async function deletePlannerPlan(
  accountTag: string,
  planId: PlannerPlanId,
): Promise<void> {
  requireAccountTag(accountTag);
  requirePlanId(planId);
  const db = await getDB();
  await db.runAsync(
    "DELETE FROM planner_plans WHERE id = ? AND account_player_tag = ?",
    [planId, accountTag],
  );
}
