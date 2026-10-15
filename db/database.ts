import * as SQLite from "expo-sqlite";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Return the process-local database connection only after connection setup
 * has completed. Cache the in-flight promise so concurrent callers cannot
 * open/configure multiple connections during startup.
 */
export function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (databasePromise) {
    return databasePromise;
  }

  const pending = (async (): Promise<SQLite.SQLiteDatabase> => {
    const database = await SQLite.openDatabaseAsync("coc_tracker.db");

    await database.execAsync(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
    `);

    return database;
  })();

  databasePromise = pending;

  // Permit a later call to retry if opening or configuring the database fails.
  void pending.catch(() => {
    if (databasePromise === pending) {
      databasePromise = null;
    }
  });

  return pending;
}
