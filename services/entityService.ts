import { getDB } from "@/db/database";
import { EntityRecord } from "@/types/upgrade";

export async function getEntities(tag: string): Promise<EntityRecord[]> {
  const db = await getDB();
// const rows = await db.getAllAsync(
//   `SELECT * FROM entities`
// );

// console.log("🗄 FULL ENTITY TABLE", rows);

  const rows = await db.getAllAsync(
    `SELECT * FROM entities WHERE account_player_tag=?`,
    [tag]
  );
  // console.log(
  //   "📖 getEntities RAW",
  //   tag,
  //   rows,
  // );
  return rows.map((r: any) => ({
    id: r.id,
    accountTag: r.account_player_tag,

    dataId: r.data_id,
    type: r.type,

    level: r.level,
    cooldown: r.cooldown ?? undefined,
  }));
}