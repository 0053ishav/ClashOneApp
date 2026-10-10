import { log } from "@/utils/logger";
import * as SQLite from "expo-sqlite";
import { getDB } from "./database";

async function getSchemaVersion(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    `SELECT version FROM schema_version LIMIT 1`
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

export async function initDatabase() {
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

  // log("✅ Database ready. Version:", version);

  // Debug only
  const cols = await db.getAllAsync(
    `PRAGMA table_info(upgrades)`
  );

  // log("📋 upgrades columns:", cols);
}