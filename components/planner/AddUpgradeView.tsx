import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ResourceType } from "@/types/resource";
import type { PlannerEntityCategory, PlannerPlan, PlannedUpgradeItem } from "@/types/planner";
import type { StructureInstanceRecord } from "@/services/planner/structureInstanceService";
import type { PlannerCatalogResult } from "@/services/plannerCatalogService";
import { getResourceColor } from "@/components/ResourceCost";
import { PlannerCatalogState } from "@/components/planner/PlannerCatalogState";
import { useHomeColors } from "@/theme/useHomeColors";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import { resolveResourceIcon } from "@/utils/icons/resolveResourceIcon";
import type { usePlannerCatalog } from "@/hooks/planner/usePlannerCatalog";

type PlannerCatalogStateValue = ReturnType<typeof usePlannerCatalog>;
type CatalogItem = PlannerCatalogResult["items"][number];

interface AddUpgradeViewProps {
  catalog: PlannerCatalogStateValue;
  queuePlan: PlannerPlan | null;
  townHallLevel: number;
  queueBusy: boolean;
  hasPendingEdit: boolean;
  onAdd: (
    candidateId: string,
    targetLevel: number,
    structureInstanceId?: StructureInstanceRecord["id"],
  ) => Promise<boolean>;
}

const CATEGORIES: { label: string; value: PlannerEntityCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Heroes", value: "hero" },
  { label: "Troops", value: "troop" },
  { label: "Spells", value: "spell" },
  { label: "Siege", value: "siege" },
  { label: "Pets", value: "pet" },
  { label: "Traps", value: "trap" },
  { label: "Buildings", value: "building" },
  { label: "Walls", value: "wall" },
];

export function AddUpgradeView({
  catalog,
  queuePlan,
  townHallLevel,
  queueBusy,
  hasPendingEdit,
  onAdd,
}: AddUpgradeViewProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [lastAddedCandidateId, setLastAddedCandidateId] = useState<string | null>(null);
  const data = catalog.isLoading ? [] : catalog.result?.items ?? [];
  const setLevelDrafts = catalog.setLevelDrafts;
  const setLevelErrors = catalog.setLevelErrors;
  useEffect(() => {
    if (lastAddedCandidateId === null) return;
    const timeout = setTimeout(() => setLastAddedCandidateId(null), 1800);
    return () => clearTimeout(timeout);
  }, [lastAddedCandidateId]);
  const updateLevelDraft = useCallback((key: string, value: string) => {
    setLevelDrafts((previous) => ({
      ...previous,
      [key]: value.replace(/[^0-9]/g, ""),
    }));
    setLevelErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, [setLevelDrafts, setLevelErrors]);
  const addItem = useCallback(async (
    candidateId: string,
    targetLevel: number,
    structureInstanceId?: StructureInstanceRecord["id"],
  ) => {
    const added = await onAdd(candidateId, targetLevel, structureInstanceId);
    if (added) setLastAddedCandidateId(candidateId);
  }, [onAdd]);

  const listHeader = (
    <View style={styles.listHeader}>
      <Text style={styles.subtitle}>
        Search validated game progression data and see the next upgrade only when the account level is known.
      </Text>
      {catalog.structureInstances.length > 0 && (
        <View style={styles.stateCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: catalog.showStructureInstances }}
            onPress={() => catalog.setShowStructureInstances((visible) => !visible)}
            style={styles.structureHeader}
          >
            <Text style={styles.stateTitle}>Tracked structure copies ({catalog.structureInstances.length})</Text>
            <Text style={styles.muted}>{catalog.showStructureInstances ? "Hide" : "Show"}</Text>
          </Pressable>
          {catalog.showStructureInstances && (
            <>
              <Text style={styles.body}>
                Numbered labels are presentation only; the saved instance ID is the identity. Copies can be uncertain when an import cannot prove which physical copy changed.
              </Text>
              {catalog.structureInstances.slice(0, 100).map((instance) => {
                const entity = catalog.entitiesById[instance.dataId];
                const activeUpgrade = catalog.activeUpgrades.find(
                  (upgrade) => upgrade.structureInstanceId === instance.id,
                );
                const hasUnresolvedTimer = catalog.activeUpgrades.some(
                  (upgrade) =>
                    !upgrade.structureInstanceId &&
                    upgrade.dataId === instance.dataId &&
                    upgrade.currentLevel === instance.currentLevel,
                );
                return (
                  <View key={instance.id} style={styles.levelEditor}>
                    <View style={styles.itemTitleWrap}>
                      <Text style={styles.itemName}>{entity?.name.en ?? `Entity ${instance.dataId}`} #{instance.instanceNumber}</Text>
                      <Text style={styles.muted}>Level {instance.currentLevel}</Text>
                    </View>
                    {activeUpgrade && (
                      <Text style={styles.body}>
                        {activeUpgrade.upgradeKind === "SUPERCHARGE"
                          ? `Supercharging to level ${activeUpgrade.nextSuperchargeLevel ?? "unknown"}`
                          : `Upgrading to level ${activeUpgrade.nextLevel ?? "unknown"}`} · finishes {new Date(activeUpgrade.endTime).toLocaleString()}
                      </Text>
                    )}
                    {!activeUpgrade && hasUnresolvedTimer && (
                      <Text style={styles.warning}>An active timer exists, but the export cannot identify this exact copy.</Text>
                    )}
                    {instance.identityConfidence === "ambiguous" && (
                      <Text style={styles.warning}>Identity is ambiguous after import changes; timer mapping is withheld.</Text>
                    )}
                  </View>
                );
              })}
              {catalog.structureInstances.length > 100 && (
                <Text style={styles.muted}>Showing the first 100 non-wall copies.</Text>
              )}
            </>
          )}
        </View>
      )}
      {catalog.untrackedEntities.length > 0 && (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Set or edit levels</Text>
          <Text style={styles.body}>
            Levels absent from the imported snapshot need manual entry. Level 0 means not built or unlocked; imported levels take precedence over manual values.
          </Text>
          {catalog.untrackedEntities.map(({ entity, maxLevel }) => {
            const key = String(entity.id);
            return (
              <View key={key} style={styles.levelEditor}>
                <View style={styles.itemTitleWrap}>
                  <Text style={styles.itemName}>{entity.name.en}</Text>
                  <Text style={styles.muted}>Max level {maxLevel}</Text>
                </View>
                <TextInput
                  accessibilityLabel={`Current level for ${entity.name.en}`}
                  keyboardType="number-pad"
                  value={catalog.levelDrafts[key] ?? (catalog.manualOverrides[key] !== undefined ? String(catalog.manualOverrides[key]) : "")}
                  onChangeText={(value) => updateLevelDraft(key, value)}
                  placeholder="Level"
                  placeholderTextColor={colors.textMuted}
                  style={styles.levelInput}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => catalog.applyLevel(entity.id, maxLevel)}
                  style={styles.applyButton}
                >
                  <Text style={styles.applyButtonText}>Use level</Text>
                </Pressable>
                {!!catalog.levelErrors[key] && (
                  <Text accessibilityRole="alert" style={styles.warning}>{catalog.levelErrors[key]}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
      <PlannerCatalogState
        isLoading={catalog.isLoading}
        error={catalog.error}
        result={catalog.result}
        entityCount={Object.keys(catalog.entitiesById).length}
        untrackedEntityCount={catalog.untrackedEntities.length}
        query={catalog.query}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.stickyControls}>
        <View style={styles.accountCard}>
          <Text style={styles.accountName}>
            Home Village · Town Hall {townHallLevel || "unknown"} · {Object.keys(catalog.currentLevels).length} known entity levels
          </Text>
        </View>
        <TextInput
          accessibilityLabel="Search upgrades"
          value={catalog.query}
          onChangeText={catalog.setQuery}
          placeholder="Search upgrades by name"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          style={styles.search}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {CATEGORIES.map((item) => {
            const selected = item.value === catalog.category;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => catalog.setCategory(item.value)}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
              >
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.candidate.candidateId}
        renderItem={({ item }) => (
          <CatalogUpgradeRow
            item={item}
            entity={catalog.entitiesById[Number(item.candidate.entityId)]}
            structureInstances={catalog.structureInstances}
            queuedItems={queuePlan?.items ?? []}
            busy={queueBusy || hasPendingEdit || !queuePlan}
            wasAdded={lastAddedCandidateId === item.candidate.candidateId}
            levelDraft={catalog.levelDrafts[String(item.candidate.entityId)] ?? ""}
            levelError={catalog.levelErrors[String(item.candidate.entityId)]}
            onLevelDraftChange={updateLevelDraft}
            onSetLevel={catalog.applyLevel}
            onAdd={addItem}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={!catalog.isLoading && !catalog.error ? (
          <Text style={styles.muted}>No upgrades match these filters.</Text>
        ) : null}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </View>
  );
}

interface CatalogUpgradeRowProps {
  item: CatalogItem;
  entity: PlannerCatalogStateValue["entitiesById"][number] | undefined;
  structureInstances: readonly StructureInstanceRecord[];
  queuedItems: readonly PlannedUpgradeItem[];
  busy: boolean;
  wasAdded: boolean;
  levelDraft: string;
  levelError: string | undefined;
  onLevelDraftChange: (key: string, value: string) => void;
  onSetLevel: (entityId: number, maxLevel: number) => void;
  onAdd: (
    candidateId: string,
    targetLevel: number,
    structureInstanceId?: StructureInstanceRecord["id"],
  ) => Promise<void>;
}

const CatalogUpgradeRow = memo(function CatalogUpgradeRow({
  item,
  entity,
  structureInstances,
  queuedItems,
  busy,
  wasAdded,
  levelDraft,
  levelError,
  onLevelDraftChange,
  onSetLevel,
  onAdd,
}: CatalogUpgradeRowProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const entityId = Number(item.candidate.entityId);
  const iconUri = entity
    ? resolveEntityIcon(entityId, {
        village: entity.village,
        type: entity.type,
        subType: entity.subType,
        level: Math.max(1, item.currentLevel ?? 1),
        useTroopIcon: entity.type === "troop",
      })
    : undefined;
  const instanceCandidates = (item.candidate.category === "building" || item.candidate.category === "trap")
    ? structureInstances.filter((instance) =>
        instance.dataId === entityId && instance.currentLevel === item.currentLevel)
    : [];
  const queued = (instanceId?: StructureInstanceRecord["id"]) => queuedItems.some((entry) =>
    entry.candidateId === item.candidate.candidateId &&
    entry.targetLevel === item.candidate.targetLevel &&
    (entry.structureInstanceId ?? null) === (instanceId ?? null));
  const unavailable = !entity;
  const alreadyQueued = instanceCandidates.length > 0
    ? instanceCandidates.every((instance) => queued(instance.id))
    : queued();
  const stateLabel = unavailable
    ? "Data unavailable"
    : item.currentLevelStatus === "unknown" || item.unknownPrerequisites.length > 0
      ? "Level unknown"
      : item.blockedBy.length > 0
        ? "Blocked"
        : alreadyQueued
          ? "Already queued"
          : "Addable";
  const costResources = item.currentLevelStatus === "known"
    ? getCostResources(item.candidate.estimate.cost)
    : [];

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.catalogIdentity}>
          {iconUri
            ? <Image source={{ uri: iconUri }} style={styles.entityIcon} contentFit="contain" cachePolicy="memory-disk" />
            : <View style={styles.entityIconFallback}><Text style={styles.muted}>{item.candidate.category.slice(0, 1).toUpperCase()}</Text></View>}
          <View style={styles.itemTitleWrap}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.muted}>{item.candidate.category}</Text>
          </View>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>
            {item.currentLevelStatus === "known"
              ? `Level ${item.currentLevel} → ${item.candidate.targetLevel}`
              : "Level unknown"}
          </Text>
        </View>
      </View>
      <View style={styles.stateRow}>
        <Text style={[
          styles.stateChip,
          stateLabel === "Blocked" && styles.blockedState,
          stateLabel === "Level unknown" && styles.unknownState,
          stateLabel === "Already queued" && styles.queuedState,
          stateLabel === "Addable" && styles.addableState,
        ]}>{stateLabel}</Text>
        <Text style={styles.muted}>
          {item.candidate.estimate.cost.status === "known"
            ? `Cost: ${formatCostEstimate(item.candidate.estimate.cost)}`
            : "Cost unknown"}
        </Text>
        <Text style={styles.muted}>
          {item.candidate.estimate.durationMs.status === "known"
            ? `Duration: ${formatDurationEstimate(item.candidate.estimate.durationMs)}`
            : "Duration unknown"}
        </Text>
      </View>
      {item.currentLevelStatus === "unknown" && (
        <View style={styles.levelEditor}>
          <Text style={styles.warning}>Current level unknown. Set it to see the correct next upgrade.</Text>
          <TextInput
            accessibilityLabel={`Current level for ${item.name}`}
            keyboardType="number-pad"
            value={levelDraft}
            onChangeText={(value) => onLevelDraftChange(String(entityId), value)}
            placeholder={`Level 0-${item.maxLevel}`}
            placeholderTextColor={colors.textMuted}
            style={styles.levelInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Set current level for ${item.name}`}
            onPress={() => onSetLevel(entityId, item.maxLevel)}
            style={styles.applyButton}
          >
            <Text style={styles.applyButtonText}>Set current level</Text>
          </Pressable>
          {!!levelError && <Text accessibilityRole="alert" style={styles.warning}>{levelError}</Text>}
        </View>
      )}
      {costResources.length > 0 && (
        <View style={styles.resourceCostRow}>
          {costResources.map(({ resource, amount }) => {
            const icon = resolveResourceIcon(resource);
            const resourceColor = getResourceColor(resource, colors);
            return (
              <View key={resource} style={[styles.resourceCostChip, { backgroundColor: resourceColor + "18" }]}>
                {icon ? <Image source={{ uri: icon }} style={styles.resourceIcon} contentFit="contain" /> : null}
                <Text style={[styles.resourceCostText, { color: resourceColor }]}>{amount.toLocaleString("en-US")}</Text>
              </View>
            );
          })}
        </View>
      )}
      {item.blockedBy.length > 0 && (
        <Text style={styles.warning}>
          Blocked: {item.blockedBy.map((prerequisite) =>
            prerequisite.kind === "entity-level"
              ? `requires level ${prerequisite.minimumLevel}`
              : `${prerequisite.kind} ${prerequisite.minimumLevel}`,
          ).join(", ")}
        </Text>
      )}
      {item.unknownPrerequisites.length > 0 && (
        <Text style={styles.warning}>
          Level unknown for prerequisite: {item.unknownPrerequisites.map((prerequisite) =>
            prerequisite.kind === "entity-level" ? prerequisite.entityId : prerequisite.kind,
          ).join(", ")}.
        </Text>
      )}
      {item.currentLevelStatus === "known" && item.canAdd && !unavailable && (
        <View style={styles.instanceAddList}>
          {instanceCandidates.length > 0 && <Text style={styles.muted}>Choose structure copy</Text>}
          {(instanceCandidates.length > 0 ? instanceCandidates : [undefined]).map((instance) => {
            const alreadyQueued = queued(instance?.id);
            const added = wasAdded && !alreadyQueued;
            return (
              <Pressable
                key={instance?.id ?? "default"}
                accessibilityRole="button"
                accessibilityLabel={alreadyQueued
                  ? `Already queued: ${item.name}${instance ? ` number ${instance.instanceNumber}` : ""}`
                  : `Add ${item.name}${instance ? ` number ${instance.instanceNumber}` : ""} to plan`}
                disabled={busy || alreadyQueued || unavailable}
                onPress={() => void onAdd(
                  item.candidate.candidateId,
                  item.candidate.targetLevel,
                  instance?.id,
                )}
                style={[styles.applyButton, (busy || alreadyQueued || unavailable) && styles.disabledButton]}
              >
                <Text style={styles.applyButtonText}>
                  {alreadyQueued ? "Already queued" : added ? "Added" : "Add to plan"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {unavailable && <Text style={styles.warning}>Progression entity data is unavailable; this candidate remains visible but cannot be added.</Text>}
    </View>
  );
});

type PlannerCostEstimate = CatalogItem["candidate"]["estimate"]["cost"];
type PlannerDurationEstimate = CatalogItem["candidate"]["estimate"]["durationMs"];

function getCostResources(estimate: PlannerCostEstimate): { resource: ResourceType; amount: number }[] {
  if (estimate.status !== "known") return [];
  const resources: { resource: ResourceType; amount: number | undefined }[] = [
    { resource: ResourceType.GOLD, amount: estimate.value.gold },
    { resource: ResourceType.ELIXIR, amount: estimate.value.elixir },
    { resource: ResourceType.DARK_ELIXIR, amount: estimate.value.darkElixir },
  ];
  return resources.filter(
    (entry): entry is { resource: ResourceType; amount: number } =>
      entry.amount !== undefined && Number.isFinite(entry.amount) && entry.amount >= 0,
  );
}

function formatCostEstimate(estimate: PlannerCostEstimate): string {
  if (estimate.status === "unknown") return "Cost unknown";
  const resources: readonly (readonly [string, number | undefined])[] = [
    ["gold", estimate.value.gold],
    ["elixir", estimate.value.elixir],
    ["dark elixir", estimate.value.darkElixir],
  ];
  const parts: string[] = [];
  for (const [resource, amount] of resources) {
    if (amount !== undefined && Number.isFinite(amount) && amount >= 0) {
      parts.push(`${amount.toLocaleString("en-US")} ${resource}`);
    }
  }
  return parts.length > 0 ? parts.join(" + ") : "not listed";
}

function formatDurationEstimate(estimate: PlannerDurationEstimate): string {
  if (estimate.status === "unknown") return "Duration unknown";
  let remaining = estimate.value;
  if (!Number.isSafeInteger(remaining) || remaining < 0) return "invalid";
  if (remaining === 0) return "instant";
  const units: readonly (readonly [number, string])[] = [
    [86400000, "d"], [3600000, "h"], [60000, "m"], [1000, "s"],
  ];
  const parts: string[] = [];
  for (const [unit, suffix] of units) {
    const amount = Math.floor(remaining / unit);
    if (amount > 0) {
      parts.push(`${amount}${suffix}`);
      remaining -= amount * unit;
    }
    if (parts.length === 2) break;
  }
  return parts.join(" ") || "<1s";
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    container: { flex: 1, minHeight: 0, gap: 8 },
    stickyControls: { gap: 8, paddingBottom: 8, backgroundColor: colors.background },
    accountCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 10 },
    accountName: { color: colors.textPrimary, fontSize: 12, fontWeight: "700" },
    muted: { color: colors.textMuted, fontSize: 11 },
    body: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    search: { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
    filters: { gap: 7, paddingVertical: 2 },
    filterChip: { minHeight: 38, justifyContent: "center", paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    filterChipSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
    filterText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700" },
    filterTextSelected: { color: colors.textDark },
    listContent: { flexGrow: 1, gap: 9, paddingBottom: 18 },
    listHeader: { gap: 10, paddingBottom: 6 },
    stateCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
    stateTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    structureHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    itemCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
    instanceAddList: { gap: 7 },
    itemHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
    catalogIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
    entityIcon: { width: 42, height: 42 },
    entityIconFallback: { width: 42, height: 42, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, borderRadius: 8 },
    itemTitleWrap: { flex: 1 },
    itemName: { color: colors.textPrimary, fontSize: 14, fontWeight: "800" },
    levelBadge: { backgroundColor: colors.surfaceRaised, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
    levelText: { color: colors.gold, fontSize: 11, fontWeight: "800" },
    stateRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    stateChip: { overflow: "hidden", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
    blockedState: { borderColor: colors.danger, color: colors.danger },
    unknownState: { borderColor: colors.textMuted, color: colors.textMuted },
    queuedState: { borderColor: colors.orangeLight, color: colors.orangeLight },
    addableState: { borderColor: colors.success, color: colors.success },
    warning: { color: colors.orangeLight, fontSize: 11, lineHeight: 16 },
    levelEditor: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
    levelInput: { width: 68, color: colors.textPrimary, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, textAlign: "center" },
    applyButton: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, alignSelf: "flex-start" },
    disabledButton: { opacity: 0.55 },
    applyButtonText: { color: colors.textDark, fontSize: 11, fontWeight: "800" },
    resourceCostRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
    resourceCostChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
    resourceIcon: { width: 16, height: 16 },
    resourceCostText: { fontSize: 11, fontWeight: "800" },
  });
}
