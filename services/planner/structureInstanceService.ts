import type { BuildingProgressRecord } from "@/types/upgrade";

export type StructureInstanceId = string & { readonly __brand: "StructureInstanceId" };
export type StructureIdentityConfidence = "stable" | "ambiguous";

/**
 * App-owned identity for one physical copy represented by an aggregated game
 * export record. Clash of Clans exports quantities, not durable copy IDs.
 */
export interface StructureInstanceRecord {
  id: StructureInstanceId;
  accountTag: string;
  village: "home";
  dataId: number;
  /** Stable, account-scoped presentation ordinal; not used as identity. */
  instanceNumber: number;
  currentLevel: number;
  superchargeLevel: number;
  identityConfidence: StructureIdentityConfidence;
}

export interface StructureInstanceReconciliation {
  instances: readonly StructureInstanceRecord[];
  ambiguousEntityIds: readonly number[];
}

type StructureBucket = Pick<
  BuildingProgressRecord,
  "dataId" | "village" | "normalLevel" | "superchargeLevel" | "count"
>;

function bucketKey(bucket: StructureBucket): string {
  return [bucket.village, bucket.dataId, bucket.normalLevel, bucket.superchargeLevel].join(":");
}

function assertValidBucket(bucket: StructureBucket): void {
  if (!Number.isSafeInteger(bucket.dataId) || bucket.dataId <= 0) {
    throw new Error("INVALID_STRUCTURE_DATA_ID");
  }
  if (!Number.isSafeInteger(bucket.normalLevel) || bucket.normalLevel < 0) {
    throw new Error("INVALID_STRUCTURE_LEVEL");
  }
  if (!Number.isSafeInteger(bucket.superchargeLevel) || bucket.superchargeLevel < 0) {
    throw new Error("INVALID_SUPERCHARGE_LEVEL");
  }
  if (!Number.isSafeInteger(bucket.count) || bucket.count < 1) {
    throw new Error("INVALID_STRUCTURE_COUNT");
  }
}

/**
 * Reconcile grouped export buckets with previously persisted app-owned IDs.
 *
 * IDs are preserved as stable only when the complete bucket (entity, village,
 * normal level, supercharge level, count) is unchanged. If the count or level
 * distribution changes, the export cannot tell which identical physical copy
 * moved or disappeared; affected copies are marked ambiguous instead of
 * silently claiming a physical identity.
 */
export function reconcileStructureInstances(
  accountTag: string,
  incomingBuckets: readonly BuildingProgressRecord[],
  previousInstances: readonly StructureInstanceRecord[],
  createId: () => string,
): StructureInstanceReconciliation {
  if (!accountTag.trim()) throw new Error("INVALID_ACCOUNT_TAG");

  const incomingByKey = new Map<string, StructureBucket>();
  for (const bucket of incomingBuckets) {
    assertValidBucket(bucket);
    const key = bucketKey(bucket);
    if (incomingByKey.has(key)) throw new Error("DUPLICATE_STRUCTURE_BUCKET");
    incomingByKey.set(key, bucket);
  }

  const previousForAccount = previousInstances.filter(
    (instance) => instance.accountTag === accountTag && instance.village === "home",
  );
  const previousByKey = new Map<string, StructureInstanceRecord[]>();
  for (const instance of previousForAccount) {
    const key = bucketKey({
      dataId: instance.dataId,
      village: instance.village,
      normalLevel: instance.currentLevel,
      superchargeLevel: instance.superchargeLevel,
      count: 1,
    });
    const records = previousByKey.get(key) ?? [];
    records.push(instance);
    previousByKey.set(key, records);
  }

  const previousCountsByEntity = new Map<number, number>();
  const incomingCountsByEntity = new Map<number, number>();
  for (const instance of previousForAccount) {
    previousCountsByEntity.set(instance.dataId, (previousCountsByEntity.get(instance.dataId) ?? 0) + 1);
  }
  for (const bucket of incomingBuckets) {
    incomingCountsByEntity.set(bucket.dataId, (incomingCountsByEntity.get(bucket.dataId) ?? 0) + bucket.count);
  }

  const changedEntityIds = new Set<number>();
  const entityIds = new Set([...previousCountsByEntity.keys(), ...incomingCountsByEntity.keys()]);
  for (const dataId of entityIds) {
    const previousCount = previousCountsByEntity.get(dataId) ?? 0;
    const incomingCount = incomingCountsByEntity.get(dataId) ?? 0;
    const priorBucketCounts = new Map<string, number>();
    for (const item of previousForAccount.filter((candidate) => candidate.dataId === dataId)) {
      const key = bucketKey({
        dataId: item.dataId,
        village: item.village,
        normalLevel: item.currentLevel,
        superchargeLevel: item.superchargeLevel,
        count: 1,
      });
      priorBucketCounts.set(key, (priorBucketCounts.get(key) ?? 0) + 1);
    }
    const nextBucketCounts = new Map<string, number>();
    for (const bucket of incomingBuckets.filter((candidate) => candidate.dataId === dataId)) {
      nextBucketCounts.set(bucketKey(bucket), bucket.count);
    }
    const bucketKeys = new Set([...priorBucketCounts.keys(), ...nextBucketCounts.keys()]);
    const levelDistributionChanged = [...bucketKeys].some(
      (key) => (priorBucketCounts.get(key) ?? 0) !== (nextBucketCounts.get(key) ?? 0),
    );
    if (previousCount > 0 && (previousCount !== incomingCount || levelDistributionChanged)) {
      changedEntityIds.add(dataId);
    }
  }

  const instances: StructureInstanceRecord[] = [];
  const ambiguousEntityIds = [...changedEntityIds].sort((a, b) => a - b);
  const nextInstanceNumberByEntity = new Map<number, number>();
  for (const instance of previousForAccount) {
    nextInstanceNumberByEntity.set(
      instance.dataId,
      Math.max(nextInstanceNumberByEntity.get(instance.dataId) ?? 0, instance.instanceNumber),
    );
  }

  for (const bucket of incomingBuckets) {
    const key = bucketKey(bucket);
    const prior = (previousByKey.get(key) ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));
    const sameBucketCount =
      (prior.length === bucket.count || (
        prior.length === 0 && !previousCountsByEntity.has(bucket.dataId)
      )) &&
      !changedEntityIds.has(bucket.dataId);

    for (let index = 0; index < bucket.count; index += 1) {
      const existing = prior[index];
      const nextNumber = (nextInstanceNumberByEntity.get(bucket.dataId) ?? 0) + 1;
      const instanceNumber = existing?.instanceNumber ?? nextNumber;
      if (!existing) nextInstanceNumberByEntity.set(bucket.dataId, nextNumber);
      instances.push({
        id: (existing?.id ?? createId()) as StructureInstanceId,
        accountTag,
        village: bucket.village,
        dataId: bucket.dataId,
        instanceNumber,
        currentLevel: bucket.normalLevel,
        superchargeLevel: bucket.superchargeLevel,
        identityConfidence: sameBucketCount ? "stable" : "ambiguous",
      });
    }
  }

  return { instances, ambiguousEntityIds };
}


export interface ActiveStructureTimerIdentity {
  dataId?: number;
  currentLevel?: number;
  upgradeKind?: "NORMAL" | "SUPERCHARGE";
  currentSuperchargeLevel?: number;
}

/**
 * Return an instance ID only when an active timer matches exactly one stable
 * instance. Repeated copies at the same level intentionally remain unresolved.
 */
export function resolveActiveStructureTimerInstanceId(
  timer: ActiveStructureTimerIdentity,
  instances: readonly StructureInstanceRecord[],
  claimedInstanceIds: ReadonlySet<string> = new Set(),
): StructureInstanceId | undefined {
  if (
    timer.dataId === undefined ||
    timer.currentLevel === undefined ||
    !Number.isSafeInteger(timer.dataId) ||
    !Number.isSafeInteger(timer.currentLevel)
  ) return undefined;

  const matches = instances.filter((instance) => {
    if (instance.dataId !== timer.dataId || instance.currentLevel !== timer.currentLevel) return false;
    if (instance.identityConfidence !== "stable" || claimedInstanceIds.has(instance.id)) return false;
    if (
      timer.upgradeKind === "SUPERCHARGE" &&
      timer.currentSuperchargeLevel !== undefined &&
      instance.superchargeLevel !== timer.currentSuperchargeLevel
    ) return false;
    if (
      timer.upgradeKind !== "SUPERCHARGE" &&
      timer.currentSuperchargeLevel !== undefined &&
      instance.superchargeLevel !== timer.currentSuperchargeLevel
    ) return false;
    return true;
  });

  return matches.length === 1 ? matches[0].id : undefined;
}
