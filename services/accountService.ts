import { getDB } from "@/db/database";
import { EntityRecord, Upgrade } from "@/types/upgrade";

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
    module_id
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
