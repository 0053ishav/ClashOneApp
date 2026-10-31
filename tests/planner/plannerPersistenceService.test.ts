import { getDB } from "@/db/database";
import {
  deletePlannerItem,
  deletePlannerPlan,
  getPlannerPlan,
  listPlannerPlans,
  savePlannerItem,
  replacePlannerQueue,
} from "@/services/plannerPersistenceService";
import type { PlannerItemId, PlannerPlanId, PlannerStructureInstanceId, PlannedUpgradeItem } from "@/types/planner";

jest.mock("@/db/database", () => ({
  getDB: jest.fn(),
}));

const mockGetDB = jest.mocked(getDB);

function setupDatabase(overrides: {
  getFirstAsync?: jest.Mock;
  getAllAsync?: jest.Mock;
  runAsync?: jest.Mock;
  withTransactionAsync?: jest.Mock;
} = {}) {
  const db = {
    getFirstAsync: overrides.getFirstAsync ?? jest.fn().mockResolvedValue(null),
    getAllAsync: overrides.getAllAsync ?? jest.fn().mockResolvedValue([]),
    runAsync: overrides.runAsync ?? jest.fn().mockResolvedValue({ changes: 1 }),
    withTransactionAsync: overrides.withTransactionAsync ?? jest.fn(async (task: () => Promise<void>) => task()),
  };
  mockGetDB.mockResolvedValue(db as unknown as Awaited<ReturnType<typeof getDB>>);
  return db;
}

const planId = "plan-a" as PlannerPlanId;
const itemId = "item-a" as PlannerItemId;

const item: PlannedUpgradeItem = {
  id: itemId,
  candidateId: "building:1000001",
  targetLevel: 5,
  lane: { lane: "normal-builders", builderIndex: 1 },
  order: 2,
  createdAtMs: 100,
  updatedAtMs: 200,
};

describe("planner persistence account isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("scopes plan lookup by both plan id and account tag", async () => {
    const db = setupDatabase();

    await expect(getPlannerPlan("#ACCOUNT_B", planId)).resolves.toBeNull();

    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ? AND account_player_tag = ?"),
      [planId, "#ACCOUNT_B"],
    );
  });

  it("scopes list queries to the requested account", async () => {
    const db = setupDatabase();

    await listPlannerPlans("#ACCOUNT_B");

    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("FROM planner_plans WHERE account_player_tag = ?"),
      ["#ACCOUNT_B"],
    );
  });

  it("rejects saving an item when the plan is not owned by the account", async () => {
    const db = setupDatabase({
      getFirstAsync: jest.fn().mockResolvedValue(null),
    });

    await expect(savePlannerItem("#ACCOUNT_B", planId, item)).rejects.toThrow(
      "PLANNER_PLAN_NOT_FOUND",
    );
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("writes item intent and order only after ownership is verified", async () => {
    const db = setupDatabase({
      getFirstAsync: jest.fn().mockResolvedValue({ id: planId }),
    });

    await savePlannerItem("#ACCOUNT_A", planId, item);

    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ? AND account_player_tag = ?"),
      [planId, "#ACCOUNT_A"],
    );
    expect(db.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO planner_plan_items"),
      [
        itemId,
        planId,
        "#ACCOUNT_A",
        item.candidateId,
        item.targetLevel,
        null,
        JSON.stringify(item.lane),
        item.order,
        item.createdAtMs,
        item.updatedAtMs,
      ],
    );
    expect(db.runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE planner_plans SET updated_at_ms"),
      [item.updatedAtMs, planId, "#ACCOUNT_A"],
    );
  });

  it("requires a stable instance owned by the same account before saving an instance-specific upgrade", async () => {
    const db = setupDatabase({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({ id: planId })
        .mockResolvedValueOnce({ id: "cannon-a", identity_confidence: "stable" }),
    });
    const itemWithInstance: PlannedUpgradeItem = {
      ...item,
      structureInstanceId: "cannon-a" as PlannerStructureInstanceId,
    };

    await savePlannerItem("#ACCOUNT_A", planId, itemWithInstance);

    expect(db.getFirstAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FROM structure_instances WHERE id = ? AND account_player_tag = ?"),
      ["cannon-a", "#ACCOUNT_A"],
    );
    expect(db.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("structure_instance_id"),
      [
        itemId,
        planId,
        "#ACCOUNT_A",
        item.candidateId,
        item.targetLevel,
        "cannon-a",
        JSON.stringify(item.lane),
        item.order,
        item.createdAtMs,
        item.updatedAtMs,
      ],
    );
  });

  it("rejects ambiguous structure identity instead of attaching a plan item to a guess", async () => {
    setupDatabase({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({ id: planId })
        .mockResolvedValueOnce({ id: "cannon-a", identity_confidence: "ambiguous" }),
    });
    const itemWithInstance: PlannedUpgradeItem = {
      ...item,
      structureInstanceId: "cannon-a" as PlannerStructureInstanceId,
    };

    await expect(savePlannerItem("#ACCOUNT_A", planId, itemWithInstance)).rejects.toThrow(
      "STRUCTURE_INSTANCE_IDENTITY_AMBIGUOUS",
    );
  });

  it("scopes item and plan deletion to the owning account", async () => {
    const db = setupDatabase();

    await deletePlannerItem("#ACCOUNT_B", planId, itemId);
    await deletePlannerPlan("#ACCOUNT_B", planId);

    expect(db.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("account_player_tag = ?"),
      [itemId, planId, "#ACCOUNT_B", "#ACCOUNT_B"],
    );
    expect(db.runAsync).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM planner_plans WHERE id = ? AND account_player_tag = ?",
      [planId, "#ACCOUNT_B"],
    );
  });

  it("reopens a stored plan with typed lane intent and stable user order", async () => {
    const db = setupDatabase({
      getFirstAsync: jest.fn().mockResolvedValue({
        id: planId,
        account_player_tag: "#ACCOUNT_A",
        village: "home",
        name: "Upgrade Plan",
        created_at_ms: 50,
        updated_at_ms: 200,
      }),
      getAllAsync: jest.fn().mockResolvedValue([
        {
          id: itemId,
          candidate_id: item.candidateId,
          target_level: item.targetLevel,
          lane_json: JSON.stringify(item.lane),
          user_order: item.order,
          created_at_ms: item.createdAtMs,
          updated_at_ms: item.updatedAtMs,
        },
      ]),
    });

    await expect(getPlannerPlan("#ACCOUNT_A", planId)).resolves.toEqual({
      id: planId,
      accountTag: "#ACCOUNT_A",
      village: "home",
      items: [item],
      createdAtMs: 50,
      updatedAtMs: 200,
    });
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE plan_id = ? AND account_player_tag = ?"),
      [planId, "#ACCOUNT_A"],
    );
  });

  it("rejects blank account tags before opening the database", async () => {
    await expect(listPlannerPlans(" ")).rejects.toThrow("INVALID_ACCOUNT_TAG");
    expect(mockGetDB).not.toHaveBeenCalled();
  });

  it("replaces queue items atomically after verifying plan ownership", async () => {
    const db = setupDatabase({
      getFirstAsync: jest.fn().mockResolvedValue({ id: planId }),
    });

    await replacePlannerQueue("#ACCOUNT_A", planId, [{ ...item, order: 0 }], 300);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ? AND account_player_tag = ?"),
      [planId, "#ACCOUNT_A"],
    );
    expect(db.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("DELETE FROM planner_plan_items"),
      [planId, "#ACCOUNT_A"],
    );
    expect(db.runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO planner_plan_items"),
      [
        itemId, planId, "#ACCOUNT_A", item.candidateId, item.targetLevel,
        null, JSON.stringify(item.lane), 0, item.createdAtMs, item.updatedAtMs,
      ],
    );
    expect(db.runAsync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("UPDATE planner_plans SET updated_at_ms"),
      [300, planId, "#ACCOUNT_A"],
    );
  });

  it("does not delete the existing queue if the plan is not owned by the account", async () => {
    const db = setupDatabase();

    await expect(replacePlannerQueue("#ACCOUNT_B", planId, [item], 300)).rejects.toThrow(
      "PLANNER_PLAN_NOT_FOUND",
    );

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("rejects duplicate queue IDs before opening a transaction", async () => {
    const db = setupDatabase();

    await expect(replacePlannerQueue("#ACCOUNT_A", planId, [item, item], 300)).rejects.toThrow(
      "DUPLICATE_PLANNER_ITEM_ID",
    );

    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });
});
