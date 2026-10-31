import {
  reconcileStructureInstances,
  resolveActiveStructureTimerInstanceId,
  type StructureInstanceRecord,
} from "@/services/planner/structureInstanceService";
import type { BuildingProgressRecord } from "@/types/upgrade";

const accountTag = "#TEST123";

function bucket(
  dataId: number,
  normalLevel: number,
  count: number,
  superchargeLevel = 0,
): BuildingProgressRecord {
  return {
    id: `bucket-${dataId}-${normalLevel}-${superchargeLevel}`,
    dataId,
    village: "home",
    normalLevel,
    count,
    superchargeLevel,
  };
}

function instance(
  id: string,
  dataId: number,
  currentLevel: number,
  superchargeLevel = 0,
  tag = accountTag,
): StructureInstanceRecord {
  return {
    id: id as StructureInstanceRecord["id"],
    accountTag: tag,
    village: "home",
    dataId,
    currentLevel,
    superchargeLevel,
    identityConfidence: "stable",
  };
}

describe("reconcileStructureInstances", () => {
  it("expands cnt into one app-owned identity per structure on first import", () => {
    const result = reconcileStructureInstances(
      accountTag,
      [bucket(1000002, 16, 2), bucket(1000002, 17, 1, 1)],
      [],
      (() => {
        let next = 0;
        return () => `instance-${++next}`;
      })(),
    );

    expect(result.instances).toHaveLength(3);
    expect(result.instances.map(({ id }) => id)).toEqual([
      "instance-1", "instance-2", "instance-3",
    ]);
    expect(result.instances.every(({ identityConfidence }) => identityConfidence === "stable")).toBe(true);
    expect(result.ambiguousEntityIds).toEqual([]);
  });

  it("preserves IDs when the complete bucket distribution is unchanged", () => {
    const previous = [
      instance("cannon-a", 1000002, 16),
      instance("cannon-b", 1000002, 16),
    ];

    const result = reconcileStructureInstances(
      accountTag,
      [bucket(1000002, 16, 2)],
      previous,
      () => "should-not-be-used",
    );

    expect(result.instances.map(({ id }) => id)).toEqual(["cannon-a", "cannon-b"]);
    expect(result.instances.every(({ identityConfidence }) => identityConfidence === "stable")).toBe(true);
  });

  it("marks identities ambiguous when the quantity changes instead of guessing which copy disappeared", () => {
    const previous = [
      instance("cannon-a", 1000002, 16),
      instance("cannon-b", 1000002, 16),
      instance("cannon-c", 1000002, 16),
    ];

    const result = reconcileStructureInstances(
      accountTag,
      [bucket(1000002, 16, 2)],
      previous,
      () => "unused",
    );

    expect(result.instances.map(({ id }) => id)).toEqual(["cannon-a", "cannon-b"]);
    expect(result.instances.every(({ identityConfidence }) => identityConfidence === "ambiguous")).toBe(true);
    expect(result.ambiguousEntityIds).toEqual([1000002]);
  });

  it("marks identities ambiguous when a level/state distribution changes", () => {
    const previous = [
      instance("cannon-a", 1000002, 16),
      instance("cannon-b", 1000002, 16),
    ];

    const result = reconcileStructureInstances(
      accountTag,
      [bucket(1000002, 16, 1), bucket(1000002, 17, 1)],
      previous,
      (() => {
        let next = 0;
        return () => `new-${++next}`;
      })(),
    );

    expect(result.ambiguousEntityIds).toEqual([1000002]);
    expect(result.instances.every(({ identityConfidence }) => identityConfidence === "ambiguous")).toBe(true);
  });

  it("does not leak or reuse another account's instance IDs", () => {
    const previous = [instance("other-account-cannon", 1000002, 16, 0, "#OTHER")];

    const result = reconcileStructureInstances(
      accountTag,
      [bucket(1000002, 16, 1)],
      previous,
      () => "local-cannon",
    );

    expect(result.instances[0].id).toBe("local-cannon");
    expect(result.instances[0].accountTag).toBe(accountTag);
  });

  it.each([
    { dataId: 0, level: 1, error: "INVALID_STRUCTURE_DATA_ID" },
    { dataId: 1000002, level: -1, error: "INVALID_STRUCTURE_LEVEL" },
  ])("rejects malformed dataId/level ($dataId, $level)", ({ dataId, level, error }) => {
    expect(() => reconcileStructureInstances(
      accountTag,
      [bucket(dataId, level, 1)],
      [],
      () => "id",
    )).toThrow(error);
  });

  it("associates a live timer only when one stable structure instance matches", () => {
    const instances = [instance("cannon-a", 1000002, 16)];

    expect(resolveActiveStructureTimerInstanceId(
      { dataId: 1000002, currentLevel: 16, upgradeKind: "NORMAL" },
      instances,
    )).toBe("cannon-a");
  });

  it("leaves live timer identity unresolved when multiple identical copies match", () => {
    const instances = [
      instance("cannon-a", 1000002, 16),
      instance("cannon-b", 1000002, 16),
    ];

    expect(resolveActiveStructureTimerInstanceId(
      { dataId: 1000002, currentLevel: 16, upgradeKind: "NORMAL" },
      instances,
    )).toBeUndefined();
  });

  it("does not associate a timer with ambiguous or already claimed instances", () => {
    const ambiguous = {
      ...instance("cannon-a", 1000002, 16),
      identityConfidence: "ambiguous" as const,
    };

    expect(resolveActiveStructureTimerInstanceId(
      { dataId: 1000002, currentLevel: 16 },
      [ambiguous],
    )).toBeUndefined();
    expect(resolveActiveStructureTimerInstanceId(
      { dataId: 1000002, currentLevel: 16 },
      [instance("cannon-a", 1000002, 16)],
      new Set(["cannon-a"]),
    )).toBeUndefined();
  });

  it("rejects invalid counts and duplicate grouped buckets", () => {
    expect(() => reconcileStructureInstances(
      accountTag,
      [bucket(1000002, 16, 0)],
      [],
      () => "id",
    )).toThrow("INVALID_STRUCTURE_COUNT");

    expect(() => reconcileStructureInstances(
      accountTag,
      [bucket(1000002, 16, 1), bucket(1000002, 16, 2)],
      [],
      () => "id",
    )).toThrow("DUPLICATE_STRUCTURE_BUCKET");
  });
});
