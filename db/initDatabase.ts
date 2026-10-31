import { log } from "@/utils/logger";
import * as SQLite from "expo-sqlite";
import { getDB } from "./database";

async function getSchemaVersion(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const row = await db.getFirstAsync<{ version: number | null }>(
    `SELECT MAX(version) AS version FROM schema_version`
  );

  return row?.version ?? 0;
}

async function setSchemaVersion(
  db: SQLite.SQLiteDatabase,
  version: number,
) {
  await db.runAsync(
    `INSERT OR REPLACE INTO schema_version(version) VALUES (?)`,
    [version],
  );
}

async function migrateDatabase() {
  const db = await getDB();

  let version = await getSchemaVersion(db);

  // log("📦 Current DB Version:", version);

  //
  // V1 - Initial schema
  //
  if (version < 1) {
    // log("🚀 Running migration V1");

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        player_tag TEXT PRIMARY KEY,
        account_name TEXT NOT NULL,
        display_color TEXT NOT NULL,
        townhall_level INTEGER,
        builder_count INTEGER DEFAULT 1,
        last_updated INTEGER,
        notifications_enabled INTEGER DEFAULT 1
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS upgrades (
        id TEXT PRIMARY KEY,

        account_player_tag TEXT NOT NULL,

        data_id INTEGER,
        entity TEXT,
        type TEXT,
        sub_type TEXT,

        upgrade_type TEXT,

        builder_type TEXT,
        builder_slot TEXT,
        lab_slot TEXT,

        current_level INTEGER,
        next_level INTEGER,

        start_time INTEGER,
        duration_minutes INTEGER,
        finish_timestamp INTEGER,

        is_completed INTEGER DEFAULT 0,
        source TEXT,

        is_crafted INTEGER DEFAULT 0,
        module_id INTEGER,

        FOREIGN KEY(account_player_tag)
        REFERENCES accounts(player_tag)
        ON DELETE CASCADE,

        UNIQUE(account_player_tag, id)
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,

        account_player_tag TEXT NOT NULL,

        data_id INTEGER,
        type TEXT,

        level INTEGER,
        cooldown INTEGER,

        is_active INTEGER DEFAULT 1,

        FOREIGN KEY(account_player_tag)
        REFERENCES accounts(player_tag)
        ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_upgrades_account_finish
      ON upgrades(account_player_tag, finish_timestamp);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_upgrades_finish
      ON upgrades(finish_timestamp);
    `);

    await setSchemaVersion(db, 1);

    version = 1;
  }

  //
  // V2 - Builder Helper Support
  //
  if (version < 2) {
    // log("🚀 Running migration V2");

    try {
      await db.execAsync(`
        ALTER TABLE upgrades
        ADD COLUMN has_helper INTEGER DEFAULT 0;
      `);

      // log("✅ has_helper added");
    } catch (e) {
      log("⏭️ has_helper already exists ", e);
    }

    try {
      await db.execAsync(`
        ALTER TABLE upgrades
        ADD COLUMN recurrent_helper INTEGER DEFAULT 0;
      `);

      // log("✅ recurrent_helper added");
    } catch (e) {
      log("⏭️ recurrent_helper already exists ", e);
    }

    try {
      await db.execAsync(`
        ALTER TABLE upgrades
        ADD COLUMN helper_applied_seconds INTEGER DEFAULT 0;
      `);

      // log("✅ helper_applied_seconds added");
    } catch (e) {
      log("⏭️ helper_applied_seconds already exists ", e);
    }

    await setSchemaVersion(db, 2);

    version = 2;
  }

  if (version < 3) {

    try {
      await db.execAsync(`
        ALTER TABLE upgrades
        ADD COLUMN village TEXT DEFAULT 'home'`);
    } catch (e) {
      log("⏭️ village already exist ", e)
    }

    try {
      await db.execAsync(`
        ALTER TABLE accounts
        ADD COLUMN builder_base_builder_count INTEGER DEFAULT 1`);
    } catch (e) {
      log("⏭️ builder_base_builder_count already exist", e)
    }
    await setSchemaVersion(db, 3);
    version = 3;
  }

  //
  // V4 - Magic Items
  //
  if (version < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS magic_item_inventory (
        account_player_tag TEXT NOT NULL,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(account_player_tag, item_id),
        FOREIGN KEY(account_player_tag)
        REFERENCES accounts(player_tag)
        ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS active_magic_effects (
        id TEXT PRIMARY KEY,
        account_player_tag TEXT NOT NULL,
        item_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        expires_at INTEGER,
        village TEXT,
        FOREIGN KEY(account_player_tag)
        REFERENCES accounts(player_tag)
        ON DELETE CASCADE,
        UNIQUE(account_player_tag, id)
      );

      CREATE INDEX IF NOT EXISTS idx_magic_effects_account_expiry
      ON active_magic_effects(account_player_tag, expires_at);
    `);

    await setSchemaVersion(db, 4);
    version = 4;
  }

  // V5 - imported in-game boost snapshot, separate from simulated Magic Items
  if (version < 5) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS imported_boosts (
        account_player_tag TEXT PRIMARY KEY,
        builder_boost_seconds INTEGER NOT NULL DEFAULT 0,
        lab_boost_seconds INTEGER NOT NULL DEFAULT 0,
        clocktower_boost_seconds INTEGER NOT NULL DEFAULT 0,
        exported_at INTEGER NOT NULL,
        FOREIGN KEY(account_player_tag) REFERENCES accounts(player_tag) ON DELETE CASCADE
      );
    `);
    await setSchemaVersion(db, 5);
    version = 5;
  }

  // V6 - Manually configured Gold Pass boost settings.
  if (version < 6) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS gold_pass_settings (
        account_player_tag TEXT PRIMARY KEY,
        builder_boost_percent INTEGER NOT NULL DEFAULT 0
          CHECK (builder_boost_percent IN (0, 10, 15, 20)),
        research_boost_percent INTEGER NOT NULL DEFAULT 0
          CHECK (research_boost_percent IN (0, 10, 15, 20)),
        FOREIGN KEY(account_player_tag)
        REFERENCES accounts(player_tag)
        ON DELETE CASCADE
      );
    `);
    await setSchemaVersion(db, 6);
    version = 6;
  }

  // V7 - Per-account return-to-game boost percentages and expiry timestamps.
  if (version < 7) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS re_engagement_boost_settings (
        account_player_tag TEXT PRIMARY KEY,
        builder_boost_percent INTEGER NOT NULL DEFAULT 0
          CHECK (builder_boost_percent BETWEEN 0 AND 100),
        builder_boost_expires_at INTEGER,
        research_boost_percent INTEGER NOT NULL DEFAULT 0
          CHECK (research_boost_percent BETWEEN 0 AND 100),
        research_boost_expires_at INTEGER,
        FOREIGN KEY(account_player_tag)
        REFERENCES accounts(player_tag)
        ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_re_engagement_boost_expiry
      ON re_engagement_boost_settings(
        account_player_tag,
        builder_boost_expires_at,
        research_boost_expires_at
      );
    `);
    await setSchemaVersion(db, 7);
    version = 7;
  }

  // V8 - Persist crafted-defense module levels for aggregate icon resolution.
  if (version < 8) {
    try {
      await db.execAsync(`
        ALTER TABLE upgrades
        ADD COLUMN crafted_module_levels TEXT;
      `);
    } catch (e) {
      log("⏭️ crafted_module_levels already exists", e);
    }
    await setSchemaVersion(db, 8);
    version = 8;
  }

  // V9 - Supercharge state is stored separately from normal building levels.
  if (version < 9) {
    for (const [column, definition] of [
      ["upgrade_kind", "TEXT DEFAULT 'NORMAL'"],
      ["current_supercharge_level", "INTEGER"],
      ["next_supercharge_level", "INTEGER"],
    ] as const) {
      try {
        await db.execAsync(`ALTER TABLE upgrades ADD COLUMN ${column} ${definition};`);
      } catch (error) {
        log(`⏭️ ${column} already exists`, error);
      }
    }
    await setSchemaVersion(db, 9);
    version = 9;
  }

  // V10 - Preserve imported building levels and completed Supercharge state.
  if (version < 10) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS building_progress (
        id TEXT PRIMARY KEY,
        account_player_tag TEXT NOT NULL,
        village TEXT NOT NULL DEFAULT 'home',
        data_id INTEGER NOT NULL,
        normal_level INTEGER NOT NULL,
        building_count INTEGER NOT NULL DEFAULT 1,
        supercharge_level INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(account_player_tag) REFERENCES accounts(player_tag) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_building_progress_account
      ON building_progress(account_player_tag, data_id);
    `);
    await setSchemaVersion(db, 10);
    version = 10;
  }

  // V11 - Cache the latest fetched player profile locally per player tag.
  if (version < 11) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS player_profile_cache (
        player_tag TEXT PRIMARY KEY,
        profile_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    await setSchemaVersion(db, 11);
    version = 11;
  }

  // V12 - Persist user-authored Upgrade Planner plans separately from live timers.
  if (version < 12) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS planner_plans (
        id TEXT PRIMARY KEY,
        account_player_tag TEXT NOT NULL,
        village TEXT NOT NULL DEFAULT 'home' CHECK (village = 'home'),
        name TEXT NOT NULL DEFAULT 'Upgrade Plan',
        created_at_ms INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL,
        FOREIGN KEY(account_player_tag) REFERENCES accounts(player_tag) ON DELETE CASCADE,
        UNIQUE(id, account_player_tag)
      );

      CREATE INDEX IF NOT EXISTS idx_planner_plans_account_updated
      ON planner_plans(account_player_tag, updated_at_ms DESC);

      CREATE TABLE IF NOT EXISTS planner_plan_items (
        id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        account_player_tag TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        target_level INTEGER NOT NULL CHECK (target_level > 0),
        lane_json TEXT NOT NULL,
        user_order INTEGER NOT NULL,
        created_at_ms INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL,
        PRIMARY KEY(plan_id, id),
        FOREIGN KEY(plan_id, account_player_tag)
          REFERENCES planner_plans(id, account_player_tag) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_planner_items_plan_order
      ON planner_plan_items(plan_id, user_order, created_at_ms);
    `);
    await setSchemaVersion(db, 12);
    version = 12;
  }

  // V13 - Persist app-owned physical structure identities and optional plan references.
  if (version < 13) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS structure_instances (
        id TEXT PRIMARY KEY,
        account_player_tag TEXT NOT NULL,
        village TEXT NOT NULL DEFAULT 'home' CHECK (village = 'home'),
        data_id INTEGER NOT NULL,
        instance_number INTEGER NOT NULL,
        current_level INTEGER NOT NULL,
        supercharge_level INTEGER NOT NULL DEFAULT 0,
        identity_confidence TEXT NOT NULL DEFAULT 'stable'
          CHECK (identity_confidence IN ('stable', 'ambiguous')),
        FOREIGN KEY(account_player_tag) REFERENCES accounts(player_tag) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_structure_instances_account_entity
      ON structure_instances(account_player_tag, data_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_structure_instances_account_number
      ON structure_instances(account_player_tag, data_id, instance_number);
    `);
    for (const statement of [
      "ALTER TABLE planner_plan_items ADD COLUMN structure_instance_id TEXT;",
      "ALTER TABLE upgrades ADD COLUMN structure_instance_id TEXT;",
    ]) {
      try {
        await db.execAsync(statement);
      } catch (error) {
        // An interrupted migration may have added a column before the schema version was saved.
        log("⏭️ structure instance column already exists", error);
      }
    }
    await setSchemaVersion(db, 13);
    version = 13;
  }

  // log("✅ Database ready. Version:", version);

  // Debug only
  const cols = await db.getAllAsync(
    `PRAGMA table_info(upgrades)`
  );

  // log("📋 upgrades columns:", cols);
}

let initializationPromise: Promise<void> | null = null;

/**
 * Serialize schema initialization within this JavaScript runtime.
 * A failed migration clears the in-flight promise so the caller can retry.
 */
export function initDatabase(): Promise<void> {
  if (initializationPromise) {
    return initializationPromise;
  }

  const pending = migrateDatabase();
  initializationPromise = pending;

  void pending.catch(() => {
    if (initializationPromise === pending) {
      initializationPromise = null;
    }
  });

  return pending;
}
