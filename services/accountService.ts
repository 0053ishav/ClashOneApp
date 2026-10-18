import { getDB } from "@/db/database";
import { BuildingProgressRecord, EntityRecord, Upgrade } from "@/types/upgrade";

export type Account = {
  tag: string;
  name: string;
  color: string;
  townhall: number;
  builderCount: number;
  builderBaseBuilderCount: number;
  lastUpdated?: number;
};

export const addAccount = async (
  tag: string,
  name: string,
  color: string,
  townhall: number,
  builderCount: number,
  builderBasebuilderCount: number,
) => {
  const db = await getDB();

  await db.runAsync(
    `INSERT OR REPLACE INTO accounts
     (player_tag, account_name, display_color, townhall_level, builder_count, builder_base_builder_count, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tag, name, color, townhall, builderCount, builderBasebuilderCount, Date.now()]
  );
};

export const getAccounts = async (): Promise<Account[]> => {
  const db = await getDB();

  return await db.getAllAsync<Account>(`
    SELECT
      player_tag AS tag,
      account_name AS name,
      display_color AS color,
      townhall_level AS townhall,
      builder_count AS builderCount,
      builder_base_builder_count AS builderBaseBuilderCount
      FROM accounts
      ORDER BY last_updated DESC
      `);
};

export async function getAccountByTag(
  tag: string
): Promise<Account | null> {
  const db = await getDB();

  const result = await db.getFirstAsync<Account>(
    `
      SELECT
      player_tag AS tag,
      account_name AS name,
      display_color AS color,
      townhall_level AS townhall,
      builder_count AS builderCount,
      builder_base_builder_count AS builderBaseBuilderCount
    FROM accounts
    WHERE player_tag = ?
    `,
    [tag]
  );

  return result ?? null;
}

export const updateAccount = async (
  tag: string,
  name: string,
  color: string,
  townhall: number,
  builderCount: number,
  builderBaseBuilderCount: number,
) => {
  const db = await getDB();

  await db.runAsync(
    `UPDATE accounts
     SET
       account_name = ?,
       display_color = ?,
       townhall_level = ?,
       builder_count = ?,
       builder_base_builder_count = ?,
       last_updated = ?
     WHERE player_tag = ?`,
    [
      name,
      color,
      townhall,
      builderCount,
      builderBaseBuilderCount,
      Date.now(),
      tag,
    ]
  );
};
export const deleteAccount = async (tag: string) => {
  const db = await getDB();

  await db.runAsync(
    `DELETE FROM accounts WHERE player_tag=?`,
    [tag]
  );
};

/** Remove progression data while keeping the village/account itself. */
export async function clearTrackedUpgrades(tag: string): Promise<void> {
  if (!tag.trim()) throw new Error("INVALID_ACCOUNT_TAG");

  const db = await getDB();
  await db.runAsync(
    "DELETE FROM upgrades WHERE account_player_tag = ?",
    [tag],
  );
}

/**
 * Reset imported village state without deleting the saved account.
 * User-configured per-account boost preferences are intentionally preserved.
 */
export async function resetVillageData(tag: string): Promise<void> {
  if (!tag.trim()) throw new Error("INVALID_ACCOUNT_TAG");

  const db = await getDB();
  await db.execAsync("BEGIN TRANSACTION");

  try {
    await db.runAsync("DELETE FROM upgrades WHERE account_player_tag = ?", [tag]);
    await db.runAsync("DELETE FROM entities WHERE account_player_tag = ?", [tag]);
    await db.runAsync("DELETE FROM magic_item_inventory WHERE account_player_tag = ?", [tag]);
    await db.runAsync("DELETE FROM active_magic_effects WHERE account_player_tag = ?", [tag]);
    await db.runAsync("DELETE FROM imported_boosts WHERE account_player_tag = ?", [tag]);
    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}

export const updateAccountColor = async (tag: string, color: string) => {
  const db = await getDB();

  await db.runAsync(
    `UPDATE accounts
      SET display_color = ?
      WHERE player_tag = ?`,
    [color, tag]
  );
};

// export const updateBuilderCount = async (
//   tag: string, 
//   homeCount: number,
//   builderBaseCount: number,
// ) => {
//   const db = await getDB();
//   if (!tag) return;
//   await db.runAsync(
//     `UPDATE accounts
//       SET 
//         builder_count = ?,
//         builder_base_builder_count= ?
//       WHERE player_tag = ?`,
//     [homeCount, builderBaseCount, tag]
//   );
// };

export const updateBuilderCount = async (
  tag: string,
  homeCount: number,
) => {
  const db = await getDB();
  if (!tag) return;
  await db.runAsync(
    `UPDATE accounts
      SET 
        builder_count = ?
      WHERE player_tag = ?`,
    [homeCount, tag]
  );
};

export async function replaceUpgrades(tag: string, upgrades: Upgrade[]) {
  const db = await getDB();
  if (!tag) return;
  try {
    await db.execAsync("BEGIN TRANSACTION");

    await db.runAsync(
      `DELETE FROM upgrades WHERE account_player_tag=?`,
      [tag]
    );

    for (const u of upgrades) {
      await db.runAsync(
        `INSERT INTO upgrades
  (
    id,
    account_player_tag,
    village,
    data_id,
    entity,
    type,
    sub_type,
    upgrade_type,
    builder_slot,
    builder_type,
    lab_slot,
    current_level,
    next_level,
    start_time,
    duration_minutes,
    finish_timestamp,
    has_helper,
    recurrent_helper,
    helper_applied_seconds,
    is_completed,
    source,
    is_crafted,
    module_id,
    crafted_module_levels,
    upgrade_kind,
    current_supercharge_level,
    next_supercharge_level
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.id,
          tag,
          u.village ?? "home",
          u.dataId ?? null,
          u.entity,

          u.type,
          u.subType ?? null,
          u.upgradeType,

          u.builderSlot != null ? String(u.builderSlot) : null,
          u.builderType ?? null,

          u.labSlot ?? null,

          u.currentLevel ?? null,
          u.nextLevel ?? null,

          u.startTime,
          u.durationMinutes,
          u.endTime,
          u.hasHelper ? 1 : 0,
          u.recurrentHelper ? 1 : 0,
          u.helperAppliedSeconds ?? 0,
          u.isCompleted ? 1 : 0,
          u.source ?? null,

          u.isCrafted ? 1 : 0,
          u.moduleId ?? null,
          u.craftedModuleLevels ? JSON.stringify(u.craftedModuleLevels) : null,
          u.upgradeKind ?? "NORMAL",
          u.currentSuperchargeLevel ?? null,
          u.nextSuperchargeLevel ?? null,
        ]
      );
    }

    await db.execAsync("COMMIT");
  } catch (e) {
    console.error("replaceUpgrades failed:", e);
    await db.execAsync("ROLLBACK");
    throw e;
  }
};

export async function replaceEntities(
  tag: string,
  entities: Omit<EntityRecord, "accountTag">[]
) {
  const db = await getDB();
  if (!tag) return;
  // console.log(
  //   "📝 replaceEntities START",
  //   tag,
  //   entities.length,
  // );
  try {
    await db.execAsync("BEGIN TRANSACTION");

    await db.runAsync(
      `DELETE FROM entities WHERE account_player_tag=?`,
      [tag]
    );

    for (const e of entities) {
      //       console.log(
      //   "📝 INSERT ENTITY",
      //   tag,
      //   e.type,
      //   e.dataId,
      // );
      await db.runAsync(
        `INSERT INTO entities
        (id, account_player_tag, data_id, type, level, cooldown)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          e.id,
          tag,
          e.dataId,
          e.type,
          e.level,
          e.cooldown ?? null,
        ]
      );
    }


    await db.execAsync("COMMIT");
    //     console.log(
    //   "✅ replaceEntities COMMIT",
    //   tag,
    // );
  } catch (e) {
    console.error("replaceEntities failed:", e);
    await db.execAsync("ROLLBACK");
    throw e;
  }
}


/**
 * Atomically replace the imported village snapshot.
 *
 * Upgrades and entity inventory are two parts of one import. Keeping both
 * replacements in the same transaction prevents a failed second write from
 * leaving the account with a mixed old/new snapshot.
 */
export async function replaceImportedVillageSnapshot(
  tag: string,
  upgrades: Upgrade[],
  entities: Omit<EntityRecord, "accountTag">[],
  buildingProgress: BuildingProgressRecord[] = [],
): Promise<void> {
  if (!tag.trim()) throw new Error("INVALID_ACCOUNT_TAG");

  const db = await getDB();

  await db.execAsync("BEGIN TRANSACTION");
  try {
    await db.runAsync("DELETE FROM upgrades WHERE account_player_tag = ?", [tag]);
    await db.runAsync("DELETE FROM entities WHERE account_player_tag = ?", [tag]);
    await db.runAsync("DELETE FROM building_progress WHERE account_player_tag = ?", [tag]);

    for (const u of upgrades) {
      await db.runAsync(
        `INSERT INTO upgrades (
          id, account_player_tag, village, data_id, entity, type, sub_type,
          upgrade_type, builder_slot, builder_type, lab_slot, current_level,
          next_level, start_time, duration_minutes, finish_timestamp,
          has_helper, recurrent_helper, helper_applied_seconds, is_completed,
          source, is_crafted, module_id, crafted_module_levels, upgrade_kind,
          current_supercharge_level, next_supercharge_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.id, tag, u.village ?? "home", u.dataId ?? null, u.entity, u.type,
          u.subType ?? null, u.upgradeType,
          u.builderSlot != null ? String(u.builderSlot) : null,
          u.builderType ?? null, u.labSlot ?? null, u.currentLevel ?? null,
          u.nextLevel ?? null, u.startTime, u.durationMinutes, u.endTime,
          u.hasHelper ? 1 : 0, u.recurrentHelper ? 1 : 0,
          u.helperAppliedSeconds ?? 0, u.isCompleted ? 1 : 0,
          u.source ?? null, u.isCrafted ? 1 : 0, u.moduleId ?? null,
          u.craftedModuleLevels ? JSON.stringify(u.craftedModuleLevels) : null,
          u.upgradeKind ?? "NORMAL",
          u.currentSuperchargeLevel ?? null,
          u.nextSuperchargeLevel ?? null,
        ],
      );
    }

    for (const entity of entities) {
      await db.runAsync(
        `INSERT INTO entities
          (id, account_player_tag, data_id, type, level, cooldown)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [entity.id, tag, entity.dataId, entity.type, entity.level, entity.cooldown ?? null],
      );
    }

    for (const building of buildingProgress) {
      await db.runAsync(
        `INSERT INTO building_progress
          (id, account_player_tag, village, data_id, normal_level, building_count, supercharge_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [building.id, tag, building.village, building.dataId, building.normalLevel, building.count, building.superchargeLevel],
      );
    }
    await db.execAsync("COMMIT");
  } catch (error) {
    try {
      await db.execAsync("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to roll back imported village snapshot:", rollbackError);
    }
    console.error("replaceImportedVillageSnapshot failed:", error);
    throw error;
  }
}

/** Read the most recently imported building progression snapshot for an account. */
export async function getBuildingProgress(tag: string): Promise<BuildingProgressRecord[]> {
  if (!tag.trim()) throw new Error("INVALID_ACCOUNT_TAG");
  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: string;
    data_id: number;
    village: "home";
    normal_level: number;
    building_count: number;
    supercharge_level: number;
  }>(
    "SELECT id, data_id, village, normal_level, building_count, supercharge_level " +
      "FROM building_progress WHERE account_player_tag = ? " +
      "ORDER BY data_id, normal_level, supercharge_level",
    [tag],
  );
  return rows.map((row) => ({
    id: row.id,
    dataId: row.data_id,
    village: row.village,
    normalLevel: row.normal_level,
    count: row.building_count,
    superchargeLevel: row.supercharge_level,
  }));
}
