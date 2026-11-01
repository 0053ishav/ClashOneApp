import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlannerQueueEditController } from "@/components/planner/PlannerQueueEditController";
import { PlannerDetailsView } from "@/components/planner/PlannerDetailsView";
import { AddUpgradeView } from "@/components/planner/AddUpgradeView";
import { PlannerHeader } from "@/components/planner/PlannerHeader";
import { PlannerPlanView } from "@/components/planner/PlannerPlanView";
import { PlannerWarnings } from "@/components/planner/PlannerWarnings";
import { usePlannerCatalog } from "@/hooks/planner/usePlannerCatalog";
import { usePlannerProjection } from "@/hooks/planner/usePlannerProjection";
import { usePlannerQueue } from "@/hooks/planner/usePlannerQueue";
import { usePlannerSegment } from "@/hooks/planner/usePlannerSegment";
import { useHomeColors } from "@/theme/useHomeColors";
import { useAccountStore } from "@/stores/accountStore";
import type { ObservedActiveUpgrade } from "@/types/planner";
import type { PlannerSnapshotReviewProps } from "@/components/planner/PlannerSnapshotReview";
import type { PlannerLaneAvailability, PlannerPrerequisiteState } from "@/utils/planner/schedulePlanner";
import { getPlannerViewModel } from "@/utils/planner/plannerViewModel";
import type { PlannerQueueFilter } from "@/components/planner/PlannerQueueList";

export default function PlannerCatalogScreen() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const activeTag = useAccountStore((state) => state.activeTag);
  const accounts = useAccountStore((state) => state.accounts);
  const profilesByTag = useAccountStore((state) => state.profilesByTag);
  const townHallLevel = getTownHallLevel(activeTag, accounts, profilesByTag);
  const catalog = usePlannerCatalog(townHallLevel);
  const activeAccount = accounts.find((account) => account.tag === activeTag);
  const { segment, setSegment } = usePlannerSegment(activeTag);
  const [queueFilter, setQueueFilter] = useState<PlannerQueueFilter>("all");
  const scrollRef = useRef<ScrollView>(null);
  const queueOffset = useRef(0);

  const observedUpgrades = useMemo<readonly ObservedActiveUpgrade[] | null>(() => {
    if (!activeTag) return [];
    const observed: ObservedActiveUpgrade[] = [];
    for (const upgrade of catalog.activeUpgrades) {
      if (upgrade.village !== "home") continue;
      let lane: ObservedActiveUpgrade["lane"] | null = null;
      if (upgrade.upgradeType === "PET") {
        lane = { lane: "pets" };
      } else if (upgrade.upgradeType === "LAB") {
        if (upgrade.labSlot === "GOBLIN") lane = { lane: "goblin-laboratory" };
        else if (upgrade.labSlot === "NORMAL") lane = { lane: "laboratory" };
      } else if (upgrade.upgradeType === "BUILDER") {
        if (upgrade.builderType === "GOBLIN" || upgrade.builderSlot === "G") {
          lane = { lane: "goblin-builder" };
        } else if (
          typeof upgrade.builderSlot === "number" &&
          Number.isSafeInteger(upgrade.builderSlot) &&
          upgrade.builderSlot > 0
        ) {
          lane = { lane: "normal-builders", builderIndex: upgrade.builderSlot };
        }
      }
      if (!lane) return null;
      observed.push({
        observedUpgradeId: upgrade.id,
        accountTag: upgrade.accountTag,
        village: "home",
        lane,
        startsAtMs: upgrade.startTime,
        completesAtMs: upgrade.endTime,
        source: upgrade.source === "JSON"
          ? "village-import"
          : upgrade.source === "MANUAL"
            ? "manual"
            : "restored-local-state",
      });
    }
    return observed;
  }, [activeTag, catalog.activeUpgrades]);

  const laneAvailability = useMemo<PlannerLaneAvailability>(() => ({
    normalBuilderCount: activeTag ? profilesByTag[activeTag]?.normalBuilderCount ?? 0 : 0,
    goblinBuilderEligible: false,
    goblinLaboratoryEligible: false,
  }), [activeTag, profilesByTag]);

  const prerequisiteState = useMemo<PlannerPrerequisiteState>(() => ({
    townHallLevel,
    laboratoryLevel: catalog.structureLevels.laboratoryLevel,
    petHouseLevel: catalog.structureLevels.petHouseLevel,
    entityLevels: catalog.currentLevels,
  }), [catalog.currentLevels, catalog.structureLevels, townHallLevel]);

  const queue = usePlannerQueue({
    activeTag,
    plannerCandidates: catalog.plannerCandidates,
    observedUpgrades,
    prerequisiteState,
    laneAvailability,
  });
  const projection = usePlannerProjection({
    activeTag,
    queuePlan: queue.queuePlan,
    snapshotReviewRequired: queue.snapshotReviewRequired,
    observedUpgrades,
    plannerCandidates: catalog.plannerCandidates,
    prerequisiteState,
    laneAvailability,
  });

  const queueItems = queue.queuePlan?.items ?? [];
  const currentProjections = projection.projections ?? [];
  const entityNamesById = useMemo(
    () => Object.fromEntries(
      Object.values(catalog.entitiesById).map((entity) => [String(entity.id), entity.name.en]),
    ),
    [catalog.entitiesById],
  );
  const itemNamesByCandidateId = useMemo(
    () => Object.fromEntries(
      (catalog.result?.items ?? []).map((item) => [item.candidate.candidateId, item.name]),
    ),
    [catalog.result],
  );
  const structureInstanceNumbersById = useMemo(
    () => Object.fromEntries(
      catalog.structureInstances.map((instance) => [instance.id, instance.instanceNumber]),
    ),
    [catalog.structureInstances],
  );
  const builderCount = activeTag ? profilesByTag[activeTag]?.normalBuilderCount ?? 0 : 0;
  const snapshotReview: PlannerSnapshotReviewProps = {
    visible: queue.snapshotReviewRequired,
    lastJsonSyncAtMs: queue.lastJsonSyncAtMs,
    snapshotAtMs: queue.queuePlan?.snapshotAtMs,
    busy: queue.snapshotReviewBusy,
    onReviewAndRecalculate: () => {
      void queue.reviewSnapshotAndRecalculate(projection.setProjectionError);
    },
  };

  const timelineProps = {
    items: queueItems,
    projections: currentProjections,
    candidates: catalog.plannerCandidates,
    entityNamesById,
    liveUpgrades: observedUpgrades ?? [],
    builderCount,
    nowMs: Date.now(),
    queueBusy: queue.queueBusy || queue.pendingQueueEdit !== null,
    onEditPlannedItem: queue.beginQueueItemEdit,
    onRemovePlannedItem: queue.removeFromQueue,
  };

  const queueListProps = {
    items: queueItems,
    projections: currentProjections,
    candidates: catalog.plannerCandidates,
    itemNamesByCandidateId,
    structureInstanceNumbersById,
    builderCount,
    queueBusy: queue.queueBusy,
    queueError: queue.queueError,
    projectionError: projection.projectionError,
    isCalculating: Boolean(
      !projection.projectionError &&
      queue.queuePlan &&
      queueItems.length > 0 &&
      projection.projections === null,
    ),
    statusFilter: queueFilter,
    editBusy: queue.pendingQueueEdit !== null,
    onBeginEdit: queue.beginQueueItemEdit,
    onRemove: queue.removeFromQueue,
    onAssignNextBuilder: queue.assignNextBuilder,
    onMove: queue.moveQueueItem,
    onLayout: (layoutY: number) => {
      queueOffset.current = layoutY;
    },
  };
  const summary = getPlannerViewModel(currentProjections, queueItems.length);
  const missingLevels = useMemo(() => {
    if (catalog.isLoading) return 0;
    return new Set(catalog.plannerCandidates
      .filter((candidate) => {
        if (!Object.prototype.hasOwnProperty.call(catalog.currentLevels, candidate.entityId)) return true;
        const currentLevel = catalog.currentLevels[candidate.entityId];
        return !Number.isSafeInteger(currentLevel) || currentLevel < 0;
      })
      .map((candidate) => candidate.entityId)).size;
  }, [catalog.currentLevels, catalog.isLoading, catalog.plannerCandidates]);
  const plannerHeader = (
    <PlannerHeader
      accountName={activeAccount?.name ?? null}
      activeTag={activeTag}
      segment={segment}
      onSegmentChange={setSegment}
    />
  );
  const conflictWarning = (
    <PlannerWarnings
      unknownDurations={0}
      blocked={0}
      missingLevels={0}
      staleSnapshot={false}
      accountEditConflict={queue.hasQueueEditConflict}
      editingAccountTag={queue.editingQueueOwner?.accountTag ?? null}
      queueError={queue.queueError}
      projectionError={projection.projectionError}
      onUnknownDurationsPress={() => undefined}
      onBlockedPress={() => undefined}
      onMissingLevelsPress={() => undefined}
      onStaleSnapshotPress={() => undefined}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {segment === "add" && activeTag ? (
        <View style={styles.addPage}>
          {plannerHeader}
          {conflictWarning}
          <AddUpgradeView
            catalog={catalog}
            queuePlan={queue.queuePlan}
            townHallLevel={townHallLevel}
            queueBusy={queue.queueBusy}
            hasPendingEdit={queue.pendingQueueEdit !== null}
            onAdd={queue.addToQueue}
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {plannerHeader}
          {!activeTag ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>No active village</Text>
              <Text style={styles.body}>
                Add or select an account before browsing account-specific upgrade candidates.
              </Text>
            </View>
          ) : (
            <>
              {segment === "plan" ? (
                <PlannerWarnings
                  unknownDurations={summary.unknownDurationCount}
                  blocked={summary.blockedCount}
                  missingLevels={missingLevels}
                  staleSnapshot={queue.snapshotReviewRequired}
                  accountEditConflict={queue.hasQueueEditConflict}
                  editingAccountTag={queue.editingQueueOwner?.accountTag ?? null}
                  queueError={queue.queueError}
                  projectionError={projection.projectionError}
                  onUnknownDurationsPress={() => {
                    setQueueFilter("unknown-duration");
                    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: queueOffset.current, animated: true }));
                  }}
                  onBlockedPress={() => {
                    setQueueFilter("blocked");
                    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: queueOffset.current, animated: true }));
                  }}
                  onMissingLevelsPress={() => setSegment("add")}
                  onStaleSnapshotPress={() => setSegment("details")}
                />
              ) : (
                conflictWarning
              )}
              {segment === "plan" && (
                <>
                  <PlannerPlanView timelineProps={timelineProps} queueProps={queueListProps} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSegment("add")}
                    style={styles.primaryAction}
                  >
                    <Text style={styles.primaryActionText}>Add upgrade</Text>
                  </Pressable>
                </>
              )}
              {segment === "details" && (
                <PlannerDetailsView
                  items={queueItems}
                  projections={currentProjections}
                  candidates={catalog.plannerCandidates}
                  entityNamesById={entityNamesById}
                  liveUpgrades={observedUpgrades ?? []}
                  builderCount={builderCount}
                  snapshotReview={snapshotReview}
                />
              )}
            </>
          )}
        </ScrollView>
      )}
      <PlannerQueueEditController
        queue={queue}
        candidates={catalog.plannerCandidates}
        entitiesById={catalog.entitiesById}
        itemNamesByCandidateId={itemNamesByCandidateId}
        currentProjections={currentProjections}
        builderCount={builderCount}
        setProjectionError={projection.setProjectionError}
      />
    </SafeAreaView>
  );
}

function getTownHallLevel(
  activeTag: string | null,
  accounts: ReturnType<typeof useAccountStore.getState>["accounts"],
  profilesByTag: ReturnType<typeof useAccountStore.getState>["profilesByTag"],
): number {
  const activeAccount = accounts.find((account) => account.tag === activeTag);
  return (activeTag ? profilesByTag[activeTag]?.townHallLevel : undefined) ??
    activeAccount?.townhall ??
    0;
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    addPage: { flex: 1, minHeight: 0, padding: 18, paddingBottom: 8, gap: 12 },
    content: { flexGrow: 1, padding: 18, paddingBottom: 32, gap: 12 },
    stateCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
    },
    stateTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
    body: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
    primaryAction: {
      backgroundColor: colors.gold,
      borderRadius: 12,
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    primaryActionText: { color: colors.textDark, fontSize: 14, fontWeight: "800" },
  });
}
