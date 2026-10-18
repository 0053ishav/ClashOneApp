import { replaceImportedVillageSnapshot } from "@/services/accountService";
import type { BuildingProgressRecord, EntityRecord, Upgrade } from "@/types/upgrade";

const mockRunAsync = jest.fn();
const mockExecAsync = jest.fn();
const mockGetDB = jest.fn();

jest.mock("@/db/database", () => ({
  getDB: () => mockGetDB(),
}));

describe("replaceImportedVillageSnapshot", () => {
  const db = {
    runAsync: mockRunAsync,
    execAsync: mockExecAsync,
  };

  const upgrade = {
    id: "upgrade-1",
    accountTag: "#TEST",
    village: "home",
    dataId: 1000077,
    entity: "Archer Tower",
    type: "BUILDING",
    upgradeType: "BUILDER",
    startTime: 1,
    durationMinutes: 60,
    endTime: 3_600_001,
    isCompleted: false,
    currentLevel: 5,
    nextLevel: 5,
    source: "JSON",
  } as Upgrade;

  const entity = {
    id: "entity-1",
    dataId: 73000011,
    type: "pet",
    level: 1,
  } as EntityRecord;

  const buildingProgress: BuildingProgressRecord[] = [{
    id: "building-progress-1",
    dataId: 1000077,
    village: "home",
    normalLevel: 5,
    count: 1,
    superchargeLevel: 1,
  }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDB.mockResolvedValue(db);
    mockRunAsync.mockResolvedValue({ changes: 1 });
    mockExecAsync.mockResolvedValue(undefined);
  });

  it("replaces upgrades and entities in one transaction", async () => {
    await replaceImportedVillageSnapshot("#TEST", [upgrade], [entity], buildingProgress);

    expect(mockExecAsync.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN TRANSACTION",
      "COMMIT",
    ]);
    expect(mockRunAsync).toHaveBeenCalledWith(
      "DELETE FROM upgrades WHERE account_player_tag = ?",
      ["#TEST"],
    );
    expect(mockRunAsync).toHaveBeenCalledWith(
      "DELETE FROM entities WHERE account_player_tag = ?",
      ["#TEST"],
    );
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO upgrades"),
      expect.any(Array),
    );
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO entities"),
      expect.any(Array),
    );
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO building_progress"),
      expect.any(Array),
    );
  });

  it("rolls back both tables if any write fails", async () => {
    mockRunAsync.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO entities")) {
        throw new Error("simulated entity insert failure");
      }
      return { changes: 1 };
    });

    await expect(
      replaceImportedVillageSnapshot("#TEST", [upgrade], [entity]),
    ).rejects.toThrow("simulated entity insert failure");

    expect(mockExecAsync.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN TRANSACTION",
      "ROLLBACK",
    ]);
  });

  it("rejects an empty account tag before opening the database", async () => {
    await expect(
      replaceImportedVillageSnapshot("  ", [], []),
    ).rejects.toThrow("INVALID_ACCOUNT_TAG");
    expect(mockGetDB).not.toHaveBeenCalled();
  });
});
