jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpenDatabaseAsync(...args),
}));

const mockOpenDatabaseAsync = jest.fn();

type MockDatabase = {
  execAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  runAsync: jest.Mock;
};

function createDatabase(): MockDatabase {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue({ version: 0 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  };
}

function loadInitDatabase(): () => Promise<void> {
  let initDatabase!: () => Promise<void>;

  jest.isolateModules(() => {
    ({ initDatabase } = require("@/db/initDatabase"));
  });

  return initDatabase;
}

describe("initDatabase", () => {
  beforeEach(() => {
    jest.resetModules();
    mockOpenDatabaseAsync.mockReset();
  });

  it("runs all schema migrations once for concurrent callers", async () => {
    const database = createDatabase();
    mockOpenDatabaseAsync.mockResolvedValue(database);

    const initDatabase = loadInitDatabase();

    await Promise.all([
      initDatabase(),
      initDatabase(),
      initDatabase(),
    ]);

    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledWith("coc_tracker.db");

    const executedSql = database.execAsync.mock.calls
      .map(([sql]) => String(sql))
      .join("\n");

    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS accounts");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS upgrades");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS entities");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS magic_item_inventory");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS active_magic_effects");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS imported_boosts");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS gold_pass_settings");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS re_engagement_boost_settings");
    expect(executedSql).toContain("ADD COLUMN crafted_module_levels TEXT");
    expect(executedSql).toContain("ADD COLUMN upgrade_kind");
    expect(executedSql).toContain("ADD COLUMN current_supercharge_level INTEGER");
    expect(executedSql).toContain("ADD COLUMN next_supercharge_level INTEGER");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS building_progress");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS player_profile_cache");

    expect(database.runAsync).toHaveBeenCalledTimes(11);
    expect(database.getAllAsync).toHaveBeenCalledWith(
      "PRAGMA table_info(upgrades)",
    );
  });

  it("allows schema initialization to retry after a migration failure", async () => {
    const database = createDatabase();
    let shouldFail = true;

    database.execAsync.mockImplementation(async (sql: string) => {
      if (
        shouldFail &&
        String(sql).includes("CREATE TABLE IF NOT EXISTS schema_version")
      ) {
        shouldFail = false;
        throw new Error("schema migration failed");
      }

      return undefined;
    });
    mockOpenDatabaseAsync.mockResolvedValue(database);

    const initDatabase = loadInitDatabase();

    await expect(initDatabase()).rejects.toThrow("schema migration failed");
    await expect(initDatabase()).resolves.toBeUndefined();

    // The connection was opened once successfully; only schema setup retries.
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(database.getFirstAsync).toHaveBeenCalledTimes(1);
    expect(database.runAsync).toHaveBeenCalledTimes(11);
  });
});
