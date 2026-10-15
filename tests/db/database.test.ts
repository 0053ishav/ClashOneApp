jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpenDatabaseAsync(...args),
}));

const mockOpenDatabaseAsync = jest.fn();

type MockDatabase = {
  execAsync: jest.Mock;
};

describe("getDB", () => {
  beforeEach(() => {
    jest.resetModules();
    mockOpenDatabaseAsync.mockReset();
  });

  it("shares one in-flight open and waits for configuration before resolving", async () => {
    let resolveOpen!: (database: MockDatabase) => void;
    const database: MockDatabase = {
      execAsync: jest.fn().mockResolvedValue(undefined),
    };
    mockOpenDatabaseAsync.mockReturnValue(
      new Promise<MockDatabase>((resolve) => {
        resolveOpen = resolve;
      }),
    );

    let getDB!: () => Promise<MockDatabase>;
    jest.isolateModules(() => {
      ({ getDB } = require("@/db/database"));
    });

    const first = getDB();
    const second = getDB();

    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
    resolveOpen(database);

    await expect(Promise.all([first, second])).resolves.toEqual([
      database,
      database,
    ]);
    expect(database.execAsync).toHaveBeenCalledTimes(1);
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("PRAGMA journal_mode=WAL"),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("PRAGMA foreign_keys=ON"),
    );
  });

  it("retries opening the database after openDatabaseAsync rejects", async () => {
    const healthyDatabase: MockDatabase = {
      execAsync: jest.fn().mockResolvedValue(undefined),
    };
    mockOpenDatabaseAsync
      .mockRejectedValueOnce(new Error("database open failed"))
      .mockResolvedValueOnce(healthyDatabase);

    let getDB!: () => Promise<MockDatabase>;
    jest.isolateModules(() => {
      ({ getDB } = require("@/db/database"));
    });

    await expect(getDB()).rejects.toThrow("database open failed");
    await expect(getDB()).resolves.toBe(healthyDatabase);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
  });

  it("clears a rejected initialization so the next call can retry", async () => {
    const brokenDatabase: MockDatabase = {
      execAsync: jest.fn().mockRejectedValue(new Error("configuration failed")),
    };
    const healthyDatabase: MockDatabase = {
      execAsync: jest.fn().mockResolvedValue(undefined),
    };
    mockOpenDatabaseAsync
      .mockResolvedValueOnce(brokenDatabase)
      .mockResolvedValueOnce(healthyDatabase);

    let getDB!: () => Promise<MockDatabase>;
    jest.isolateModules(() => {
      ({ getDB } = require("@/db/database"));
    });

    await expect(getDB()).rejects.toThrow("configuration failed");
    await expect(getDB()).resolves.toBe(healthyDatabase);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
  });
});
