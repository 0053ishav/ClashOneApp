import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useHomeColors } from "@/theme/useHomeColors";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import { resolveResourceIcon } from "@/utils/icons/resolveResourceIcon";
import { ResourceType } from "@/types/resource";
import { getResourceColor } from "@/components/ResourceCost";
import { useAccountStore } from "@/stores/accountStore";
import { useEntityStore } from "@/stores/entityStore";
import { getBuildingProgress, getStructureInstances } from "@/services/accountService";
import { getActiveUpgrades } from "@/services/upgradeService";
import type { Upgrade } from "@/types/upgrade";
import type { StructureInstanceRecord } from "@/services/planner/structureInstanceService";
import {
  loadPlannerCatalogLevelOverrides,
  savePlannerCatalogLevelOverrides,
} from "@/services/plannerCatalogLevelStorage";
import {
  loadProgressionCategory,
  loadProgressionManifest,
} from "@/storage/progressionStorage";
import { buildPlannerDatasetFromCache } from "@/services/plannerCatalogSourceService";
import {
  createPlannerCatalogRequestCoordinator,
  loadPlannerCatalog,
} from "@/services/plannerCatalogRequestService";
import type {
  PlannerCatalogFilters,
  PlannerCatalogResult,
} from "@/services/plannerCatalogService";
import type { ObservedActiveUpgrade, PlannerEntityCategory, PlannerItemId, PlannerPlan, PlannerPlanId, PlannedUpgradeItem, ProgressionCandidate, UpgradeProjection } from "@/types/planner";
import { recalculatePlannerProjection } from "@/services/plannerApplicationService";
import { schedulePlanner, type PlannerLaneAvailability, type PlannerPrerequisiteState } from "@/utils/planner/schedulePlanner";
import type { PlannerLaneAssignment } from "@/types/planner";
import { acknowledgePlannerSnapshot, createPlannerPlan, listPlannerPlans, replacePlannerQueue } from "@/services/plannerPersistenceService";
import { addPlannerQueueItem, getDefaultPlannerLane, movePlannerQueueItem, removePlannerQueueItem, updatePlannerQueueItem } from "@/services/planner/plannerQueueService";
import { resolvePlannerStructureLevels } from "@/services/plannerStructureLevelService";
import { resolvePlannerCatalogLevelState } from "@/services/plannerCatalogLevelState";
import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { PlannerSnapshotReview } from "@/components/planner/PlannerSnapshotReview";
import { PlannerQueueList } from "@/components/planner/PlannerQueueList";
import { PlannerCatalogState } from "@/components/planner/PlannerCatalogState";

const CATEGORIES: { label: string; value: PlannerEntityCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Buildings", value: "building" },
  { label: "Heroes", value: "hero" },
  { label: "Troops", value: "troop" },
  { label: "Spells", value: "spell" },
  { label: "Siege", value: "siege" },
  { label: "Pets", value: "pet" },
  { label: "Traps", value: "trap" },
  { label: "Walls", value: "wall" },
];

const CATEGORY_BY_ENTITY_TYPE: Readonly<Record<string, PlannerEntityCategory | undefined>> = {
  building: "building",
  hero: "hero",
  troop: "troop",
  spell: "spell",
  siege: "siege",
  pet: "pet",
  trap: "trap",
  wall: "wall",
};

export default function PlannerCatalogScreen() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const activeTag = useAccountStore((state) => state.activeTag);
  const accounts = useAccountStore((state) => state.accounts);
  const profilesByTag = useAccountStore((state) => state.profilesByTag);
  const lastJsonSyncMap = useAccountStore((state) => state.lastJsonSyncMap);
  const entitiesById = useEntityStore((state) => state.entitiesById);
  const coordinator = useRef(createPlannerCatalogRequestCoordinator()).current;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlannerEntityCategory | "all">("all");
  const [currentLevels, setCurrentLevels] = useState<Record<string, number>>({});
  const [structureInstances, setStructureInstances] = useState<StructureInstanceRecord[]>([]);
  const [activeUpgrades, setActiveUpgrades] = useState<Upgrade[]>([]);
  const [showStructureInstances, setShowStructureInstances] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [levelDrafts, setLevelDrafts] = useState<Record<string, string>>({});
  const [levelErrors, setLevelErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PlannerCatalogResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuePlan, setQueuePlan] = useState<PlannerPlan | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);
  const [snapshotReviewBusy, setSnapshotReviewBusy] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [editingQueueItemId, setEditingQueueItemId] = useState<PlannerItemId | null>(null);
  const [editingQueueOwner, setEditingQueueOwner] = useState<{ accountTag: string; planId: PlannerPlanId } | null>(null);
  const [queueTargetDrafts, setQueueTargetDrafts] = useState<Record<string, string>>({});
  const [queueLaneDrafts, setQueueLaneDrafts] = useState<Record<string, PlannerLaneAssignment>>({});
  const [queueEditErrors, setQueueEditErrors] = useState<Record<string, string>>({});
  const [pendingQueueEdit, setPendingQueueEdit] = useState<{ accountTag: string; planId: PlannerPlanId; itemId: PlannerItemId; items: PlannedUpgradeItem[]; projections: readonly UpgradeProjection[] } | null>(null);
  const [projections, setProjections] = useState<readonly UpgradeProjection[] | null>(null);
  const [projectionError, setProjectionError] = useState<string | null>(null);
  const nextItemId = useRef(0);
  const queueWriteInFlight = useRef(false);

  const activeAccount = accounts.find((account) => account.tag === activeTag);
  const lastJsonSyncAtMs = activeTag ? lastJsonSyncMap[activeTag] : undefined;
  const townHallLevel =
    (activeTag ? profilesByTag[activeTag]?.townHallLevel : undefined) ??
    activeAccount?.townhall ??
    0;

  const hasQueueEditConflict = Boolean(editingQueueOwner && (editingQueueOwner.accountTag !== activeTag || editingQueueOwner.planId !== queuePlan?.id));

  const snapshotReviewRequired = Boolean(
    queuePlan && queuePlan.accountTag === activeTag &&
    (queuePlan.snapshotAtMs === null || lastJsonSyncAtMs === undefined || lastJsonSyncAtMs > queuePlan.snapshotAtMs),
  );


  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setError(null);

    if (!activeTag) {
      setCurrentLevels({});
      setStructureInstances([]);
      setActiveUpgrades([]);
      setShowStructureInstances(false);
      setManualOverrides({});
      setIsLoading(false);
      return () => {
        cancelled = true;
        coordinator.invalidate();
      };
    }

    setCurrentLevels({});
    setStructureInstances([]);
    setActiveUpgrades([]);
    setShowStructureInstances(false);
    setManualOverrides({});
    setLevelDrafts({});
    setIsLoading(true);
    const savedOverrides = loadPlannerCatalogLevelOverrides(activeTag);
    void Promise.all([
      getBuildingProgress(activeTag),
      getStructureInstances(activeTag),
      getActiveUpgrades(activeTag),
    ])
      .then(([records, instances, upgrades]) => {
        if (cancelled) return;
        const levels: Record<string, number> = {};
        for (const record of records) {
          const key = String(record.dataId);
          levels[key] = Math.max(levels[key] ?? 0, record.normalLevel);
        }
        const resolvedLevels = resolvePlannerCatalogLevelState(savedOverrides, levels);
        setCurrentLevels(resolvedLevels.currentLevels);
        setManualOverrides(resolvedLevels.manualOverrides);
        setStructureInstances(instances);
        setActiveUpgrades(upgrades);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load village levels.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      coordinator.invalidate();
    };
  }, [activeTag, coordinator]);

  useEffect(() => {
    let cancelled = false;
    if (!activeTag) return;

    const structureLevels = resolvePlannerStructureLevels(
      Object.values(entitiesById),
      currentLevels,
    );
    const filters: PlannerCatalogFilters = {
      query,
      category,
      currentLevels,
      townHallLevel,
      ...structureLevels,
    };
    const identity = {
      accountTag: activeTag,
      categoryKey: category,
      village: "home" as const,
    };

    setIsLoading(true);
    setError(null);
    void loadPlannerCatalog({
      identity,
      filters,
      coordinator,
      activeIdentity: () => ({
        accountTag: useAccountStore.getState().activeTag ?? "",
        categoryKey: category,
        village: "home",
      }),
      loadSource: async () => {
        const entities = Object.values(useEntityStore.getState().entitiesById);
        const manifest = loadProgressionManifest();
        const dataset = buildPlannerDatasetFromCache({
          entities,
          manifest,
          loadCategory: loadProgressionCategory,
        });
        const namesByEntityId: Record<string, string> = {};
        const maxLevelsByEntityId: Record<string, number> = {};
        for (const entity of entities) {
          if (entity.village !== "home") continue;
          namesByEntityId[String(entity.id)] = entity.name.en;
          const levels = Object.keys(entity.levels ?? {})
            .map(Number)
            .filter((level) => Number.isSafeInteger(level) && level > 0);
          if (levels.length > 0) {
            maxLevelsByEntityId[String(entity.id)] = Math.max(...levels);
          }
        }
        return { dataset, metadata: { namesByEntityId, maxLevelsByEntityId } };
      },
    }).then((nextResult) => {
      if (cancelled || !nextResult) return;
      setResult(nextResult);
      setIsLoading(false);
    }).catch((loadError: unknown) => {
      if (cancelled) return;
      setError(loadError instanceof Error ? loadError.message : "Could not load the upgrade catalog.");
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      coordinator.invalidate();
    };
  }, [activeTag, category, coordinator, currentLevels, entitiesById, query, townHallLevel]);


  useEffect(() => {
    setPendingQueueEdit(null);
  }, [activeTag, queuePlan?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!activeTag) {
      setQueuePlan(null);
      setQueueError(null);
      return;
    }
    setQueuePlan(null);
    setQueueError(null);
    void listPlannerPlans(activeTag)
      .then(async (plans) => {
        if (cancelled) return;
        const plan = plans[0] ?? await createPlannerPlan(activeTag, `planner-${Date.now()}-${nextItemId.current++}` as PlannerPlanId, Date.now(), useAccountStore.getState().lastJsonSyncMap[activeTag] ?? null);
        if (!cancelled) setQueuePlan(plan);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setQueueError(loadError instanceof Error ? loadError.message : "Could not load the upgrade queue.");
      });
    return () => { cancelled = true; };
  }, [activeTag]);

  const persistQueue = async (items: readonly PlannedUpgradeItem[]): Promise<boolean> => {
    if (!activeTag || !queuePlan || queueWriteInFlight.current) return false;
    queueWriteInFlight.current = true;
    setQueueBusy(true);
    setQueueError(null);
    const now = Date.now();
    const timestampedItems = items.map((item) => ({ ...item, updatedAtMs: Math.max(now, item.createdAtMs) }));
    try {
      await replacePlannerQueue(activeTag, queuePlan.id, timestampedItems, now);
      setQueuePlan((previous) =>
        previous && previous.accountTag === activeTag && previous.id === queuePlan.id
          ? { ...previous, items: timestampedItems, updatedAtMs: now }
          : previous,
      );
      return true;
    } catch (saveError: unknown) {
      setQueueError(saveError instanceof Error ? saveError.message : "Could not save the upgrade queue.");
      return false;
    } finally {
      queueWriteInFlight.current = false;
      setQueueBusy(false);
    }
  };


  const beginQueueItemEdit = (item: PlannedUpgradeItem) => {
    if (!activeTag || !queuePlan || queuePlan.accountTag !== activeTag || hasQueueEditConflict) return;
    setPendingQueueEdit(null);
    setEditingQueueOwner({ accountTag: activeTag, planId: queuePlan.id });
    setEditingQueueItemId(item.id);
    setQueueTargetDrafts((previous) => ({ ...previous, [item.id]: String(item.targetLevel) }));
    setQueueLaneDrafts((previous) => ({ ...previous, [item.id]: item.lane }));
    setQueueEditErrors((previous) => {
      const next = { ...previous };
      delete next[item.id];
      return next;
    });
  };

  const saveQueueItemEdit = async (item: PlannedUpgradeItem) => {
    if (!activeTag || !queuePlan || queuePlan.accountTag !== activeTag || queueBusy ||
      editingQueueOwner?.accountTag !== activeTag || editingQueueOwner.planId !== queuePlan.id) return;
    const candidate = plannerCandidates.find((entry) => entry.candidateId === item.candidateId);
    if (!candidate) {
      setQueueEditErrors((previous) => ({ ...previous, [item.id]: "This upgrade is missing from the current catalog. Sync game data before editing it." }));
      return;
    }

    const targetText = queueTargetDrafts[item.id] ?? String(item.targetLevel);
    const targetLevel = Number(targetText);
    if (!/^\d+$/.test(targetText) || !Number.isSafeInteger(targetLevel) ||
      targetLevel <= candidate.currentLevel || targetLevel > candidate.targetLevel) {
      setQueueEditErrors((previous) => ({ ...previous, [item.id]: `Target level must be a whole number above level ${candidate.currentLevel} and no higher than ${candidate.targetLevel}.` }));
      return;
    }

    const lane = queueLaneDrafts[item.id] ?? item.lane;
    const defaultLane = getDefaultPlannerLane(candidate.category);
    const laneCompatible = defaultLane.lane === "normal-builders"
      ? lane.lane === "normal-builders" &&
        Number.isSafeInteger(lane.builderIndex) &&
        lane.builderIndex >= 1 &&
        lane.builderIndex <= (profilesByTag[activeTag]?.normalBuilderCount ?? 0)
      : lane.lane === defaultLane.lane;
    if (!laneCompatible) {
      setQueueEditErrors((previous) => ({ ...previous, [item.id]: "Choose a lane compatible with this upgrade and available on this account." }));
      return;
    }

    let updatedItems: PlannedUpgradeItem[];
    try {
      updatedItems = updatePlannerQueueItem(queuePlan.items, item.id, {
        candidateId: item.candidateId,
        targetLevel,
        lane,
        ...(item.structureInstanceId ? { structureInstanceId: item.structureInstanceId } : {}),
      });
    } catch (mutationError: unknown) {
      setQueueEditErrors((previous) => ({ ...previous, [item.id]: mutationError instanceof Error ? mutationError.message : "Could not update this queue item." }));
      return;
    }

    if (snapshotReviewRequired || observedUpgrades === null) {
      setQueueEditErrors((previous) => ({
        ...previous,
        [item.id]: snapshotReviewRequired
          ? "Review the latest village snapshot before previewing schedule changes."
          : "A live timer has no confirmed lane; the edited schedule cannot be previewed safely.",
      }));
      return;
    }

    const previewProjections = schedulePlanner({
      nowMs: Date.now(),
      candidates: plannerCandidates,
      items: updatedItems,
      observedActiveUpgrades: observedUpgrades,
      prerequisiteState,
      laneAvailability,
    });
    setPendingQueueEdit({ accountTag: activeTag, planId: queuePlan.id, itemId: item.id, items: updatedItems, projections: previewProjections });
  };

  const addToQueue = (candidateId: string, targetLevel: number) => {
    if (!queuePlan || queueBusy || pendingQueueEdit) return;
    if (queuePlan.items.some((item) => item.candidateId === candidateId && item.targetLevel === targetLevel)) return;

    const candidate = plannerCandidates.find((item) => item.candidateId === candidateId);
    if (!candidate) {
      setQueueError("This upgrade is not available in the current progression catalog. Refresh the catalog and try again.");
      return;
    }

    const lane = getDefaultPlannerLane(candidate.category);
    const now = Date.now();
    const laneItems = queuePlan.items.filter((item) =>
      item.lane.lane === lane.lane &&
      (lane.lane !== "normal-builders" ||
        (item.lane.lane === "normal-builders" && item.lane.builderIndex === lane.builderIndex)),
    );
    const item: PlannedUpgradeItem = {
      id: `planner-item-${now}-${nextItemId.current++}` as PlannerItemId,
      candidateId, targetLevel, lane, order: laneItems.length, createdAtMs: now, updatedAtMs: now,
    };
    try {
      void persistQueue(addPlannerQueueItem(queuePlan.items, item));
    } catch (mutationError: unknown) {
      setQueueError(mutationError instanceof Error ? mutationError.message : "Could not update the upgrade queue.");
    }
  };

  const removeFromQueue = (itemId: PlannerItemId) => {
    if (!queuePlan || queueBusy || pendingQueueEdit) return;
    try {
      void persistQueue(removePlannerQueueItem(queuePlan.items, itemId));
    } catch (mutationError: unknown) {
      setQueueError(mutationError instanceof Error ? mutationError.message : "Could not update the upgrade queue.");
    }
  };

  const assignNextBuilder = (itemId: PlannerItemId) => {
    if (!queuePlan || queueBusy || pendingQueueEdit) return;
    const item = queuePlan.items.find((candidate) => candidate.id === itemId);
    const builderCount = activeTag ? profilesByTag[activeTag]?.normalBuilderCount ?? 0 : 0;
    if (!item || item.lane.lane !== "normal-builders" || builderCount < 2) return;

    const nextBuilderIndex = item.lane.builderIndex >= builderCount
      ? 1
      : item.lane.builderIndex + 1;
    try {
      void persistQueue(updatePlannerQueueItem(
        queuePlan.items,
        itemId,
        {
          candidateId: item.candidateId,
          targetLevel: item.targetLevel,
          lane: { lane: "normal-builders", builderIndex: nextBuilderIndex },
          ...(item.structureInstanceId ? { structureInstanceId: item.structureInstanceId } : {}),
        },
      ));
    } catch (mutationError: unknown) {
      setQueueError(mutationError instanceof Error ? mutationError.message : "Could not reassign the builder.");
    }
  };

  const moveQueueItem = (itemId: PlannerItemId, direction: -1 | 1) => {
    if (!queuePlan || queueBusy || pendingQueueEdit) return;
    const item = queuePlan.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const laneItems = queuePlan.items
      .filter((candidate) =>
        candidate.lane.lane === item.lane.lane &&
        (candidate.lane.lane !== "normal-builders" ||
          (item.lane.lane === "normal-builders" &&
            candidate.lane.builderIndex === item.lane.builderIndex)),
      )
      .sort((a, b) => a.order - b.order);
    const currentIndex = laneItems.findIndex((candidate) => candidate.id === itemId);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= laneItems.length) return;
    try {
      void persistQueue(movePlannerQueueItem(queuePlan.items, itemId, targetIndex));
    } catch (mutationError: unknown) {
      setQueueError(mutationError instanceof Error ? mutationError.message : "Could not reorder the upgrade queue.");
    }
  };

  const plannerCandidates = useMemo<readonly ProgressionCandidate[]>(() => {
    const dataset = buildPlannerDatasetFromCache({
      entities: Object.values(entitiesById),
      manifest: loadProgressionManifest(),
      loadCategory: loadProgressionCategory,
    });
    return dataset.candidates;
  }, [entitiesById]);

  const structureLevels = useMemo(
    () => resolvePlannerStructureLevels(Object.values(entitiesById), currentLevels),
    [currentLevels, entitiesById],
  );

  const observedUpgrades = useMemo<readonly ObservedActiveUpgrade[] | null>(() => {
    if (!activeTag) return [];
    const observed: ObservedActiveUpgrade[] = [];
    for (const upgrade of activeUpgrades) {
      // This screen schedules the Home Village plan only; Builder Base timers
      // must not occupy Home Village lanes.
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
        } else if (typeof upgrade.builderSlot === "number" && Number.isSafeInteger(upgrade.builderSlot) && upgrade.builderSlot > 0) {
          lane = { lane: "normal-builders", builderIndex: upgrade.builderSlot };
        }
      }
      // Do not guess which lane an incomplete live-timer record occupies.
      if (!lane) return null;
      observed.push({
        observedUpgradeId: upgrade.id,
        accountTag: upgrade.accountTag,
        village: "home",
        lane,
        startsAtMs: upgrade.startTime,
        completesAtMs: upgrade.endTime,
        source: upgrade.source === "JSON" ? "village-import" : upgrade.source === "MANUAL" ? "manual" : "restored-local-state",
      });
    }
    return observed;
  }, [activeTag, activeUpgrades]);

  const laneAvailability = useMemo<PlannerLaneAvailability>(() => ({
    normalBuilderCount: activeTag ? profilesByTag[activeTag]?.normalBuilderCount ?? 0 : 0,
    // The app has no confirmed active-event/eligibility state for Goblin lanes yet.
    goblinBuilderEligible: false,
    goblinLaboratoryEligible: false,
  }), [activeTag, profilesByTag]);

  const prerequisiteState = useMemo<PlannerPrerequisiteState>(() => ({
    townHallLevel,
    laboratoryLevel: structureLevels.laboratoryLevel,
    petHouseLevel: structureLevels.petHouseLevel,
    entityLevels: currentLevels,
  }), [currentLevels, structureLevels, townHallLevel]);

  useEffect(() => {
    let cancelled = false;
    setProjections(null);
    setProjectionError(null);
    if (!activeTag || !queuePlan || queuePlan.accountTag !== activeTag) return;
    if (snapshotReviewRequired) {
      setProjectionError("Village data changed or its freshness cannot be verified. Review the current snapshot before recalculating this saved plan.");
      return;
    }
    if (observedUpgrades === null) {
      setProjectionError("A live timer has no confirmed lane assignment. Scheduling is paused rather than guessing which builder or lab is occupied.");
      return;
    }
    void recalculatePlannerProjection({
      accountTag: activeTag,
      planId: queuePlan.id,
      nowMs: Date.now(),
      candidates: plannerCandidates,
      observedActiveUpgrades: observedUpgrades,
      prerequisiteState,
      laneAvailability,
    }).then((projection) => {
      if (!cancelled) setProjections(projection?.projections ?? []);
    }).catch((projectionLoadError: unknown) => {
      if (!cancelled) setProjectionError(projectionLoadError instanceof Error ? projectionLoadError.message : "Could not calculate the upgrade schedule.");
    });
    return () => { cancelled = true; };
  }, [activeTag, laneAvailability, observedUpgrades, plannerCandidates, prerequisiteState, queuePlan, snapshotReviewRequired]);

  const projectionByItemId = useMemo(() => new Map(
    (projections ?? []).map((projection) => [projection.plannedItemId, projection]),
  ), [projections]);

  const reviewSnapshotAndRecalculate = async () => {
    if (!activeTag || !queuePlan || queuePlan.accountTag !== activeTag || snapshotReviewBusy) return;
    if (lastJsonSyncAtMs === undefined) {
      setProjectionError("The latest village snapshot has no recorded sync time. Sync the account data before recalculating this plan.");
      return;
    }
    setSnapshotReviewBusy(true);
    try {
      await acknowledgePlannerSnapshot(activeTag, queuePlan.id, lastJsonSyncAtMs);
      setQueuePlan((previous) => previous && previous.accountTag === activeTag && previous.id === queuePlan.id
        ? { ...previous, snapshotAtMs: lastJsonSyncAtMs }
        : previous);
      setProjectionError(null);
    } catch (reviewError: unknown) {
      setProjectionError(reviewError instanceof Error ? reviewError.message : "Could not record the reviewed village snapshot.");
    } finally {
      setSnapshotReviewBusy(false);
    }
  };

  const knownLevelCount = Object.keys(currentLevels).length;
  const untrackedEntities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return Object.values(entitiesById)
      .filter((entity) => entity.village === "home")
      .filter((entity) => CATEGORY_BY_ENTITY_TYPE[entity.type] !== undefined)
      .filter((entity) => category === "all" || CATEGORY_BY_ENTITY_TYPE[entity.type] === category)
      .filter((entity) => !Object.prototype.hasOwnProperty.call(currentLevels, String(entity.id))
        || Object.prototype.hasOwnProperty.call(manualOverrides, String(entity.id)))
      .filter((entity) => {
        if (!normalizedQuery) return true;
        return entity.name.en.toLocaleLowerCase().includes(normalizedQuery);
      })
      .map((entity) => {
        const levels = Object.keys(entity.levels ?? {})
          .map(Number)
          .filter((level) => Number.isSafeInteger(level) && level > 0);
        return { entity, maxLevel: levels.length > 0 ? Math.max(...levels) : 0 };
      })
      .filter(({ maxLevel }) => maxLevel > 0)
      .slice(0, 6);
  }, [category, currentLevels, entitiesById, manualOverrides, query]);

  const applyLevel = (entityId: number, maxLevel: number) => {
    const entityKey = String(entityId);
    const draft = levelDrafts[entityKey] ?? "";
    const level = Number(draft);

    if (draft.trim() === "" || !Number.isSafeInteger(level) || level < 0 || level > maxLevel) {
      setLevelErrors((previous) => ({
        ...previous,
        [entityKey]: `Enter a whole-number level from 0 to ${maxLevel}.`,
      }));
      return;
    }
    if (!activeTag) return;
    const nextLevels = { ...currentLevels, [entityKey]: level };

    try {
      // Persist only manually entered overrides, not imported building levels.
      const savedOverrides = loadPlannerCatalogLevelOverrides(activeTag);
      savePlannerCatalogLevelOverrides(activeTag, {
        ...savedOverrides,
        [entityKey]: level,
      });
      setCurrentLevels(nextLevels);
      setManualOverrides((previous) => ({ ...previous, [entityKey]: level }));
      setLevelDrafts((previous) => ({ ...previous, [entityKey]: String(level) }));
      setLevelErrors((previous) => {
        const next = { ...previous };
        delete next[entityKey];
        return next;
      });
      setError(null);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? `Could not save this level: ${saveError.message}`
          : "Could not save this level.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>CLASH ONE · HOME VILLAGE</Text>
        <Text style={styles.title}>Upgrade catalog</Text>
        <Text style={styles.subtitle}>
          Search validated game progression data and see the next upgrade only when the account level is known.
        </Text>

        {!activeTag ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No active village</Text>
            <Text style={styles.body}>Add or select an account before browsing account-specific upgrade candidates.</Text>
          </View>
        ) : (
          <>
            <View style={styles.accountCard}>
              <Text style={styles.accountName}>{activeAccount?.name ?? activeTag}</Text>
              <Text style={styles.muted}>Town Hall {townHallLevel || "unknown"} · {knownLevelCount} known entity levels</Text>
            </View>

            {structureInstances.length > 0 && (
              <View style={styles.stateCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showStructureInstances }}
                  onPress={() => setShowStructureInstances((visible) => !visible)}
                  style={styles.itemTitleWrap}
                >
                  <Text style={styles.stateTitle}>
                    Tracked structure copies ({structureInstances.length})
                  </Text>
                  <Text style={styles.muted}>{showStructureInstances ? "Hide" : "Show"}</Text>
                </Pressable>
                <Text style={styles.body}>
                  Numbered labels are presentation only; the saved instance ID is the identity. Copies are marked uncertain when an import cannot prove which physical copy changed.
                </Text>
                {showStructureInstances && structureInstances
                  .slice(0, 100)
                  .map((instance) => {
                    const entity = entitiesById[instance.dataId];
                    const label = entity?.name.en ?? `Entity ${instance.dataId}`;
                    const activeUpgrade = activeUpgrades.find(
                      (upgrade) => upgrade.structureInstanceId === instance.id,
                    );
                    const hasUnresolvedTimer = activeUpgrades.some(
                      (upgrade) =>
                        !upgrade.structureInstanceId &&
                        upgrade.dataId === instance.dataId &&
                        upgrade.currentLevel === instance.currentLevel,
                    );
                    return (
                      <View key={instance.id} style={styles.levelEditor}>
                        <View style={styles.itemTitleWrap}>
                          <Text style={styles.itemName}>{label} #{instance.instanceNumber}</Text>
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
                {showStructureInstances && structureInstances.length > 100 && (
                  <Text style={styles.muted}>Showing the first 100 non-wall copies.</Text>
                )}
              </View>
            )}

            {hasQueueEditConflict && editingQueueOwner && (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Unsaved edit belongs to another account</Text>
                <Text style={styles.body}>
                  Your edit for {editingQueueOwner.accountTag} is preserved in memory and has not been applied. Switch back to that account to save or cancel it. Editing another account is disabled until you resolve this draft.
                </Text>
              </View>
            )}
            <PlannerSnapshotReview
              visible={snapshotReviewRequired}
              lastJsonSyncAtMs={lastJsonSyncAtMs}
              snapshotAtMs={queuePlan?.snapshotAtMs}
              busy={snapshotReviewBusy}
              onReviewAndRecalculate={() => void reviewSnapshotAndRecalculate()}
            />
            <PlannerTimeline
              items={queuePlan?.items ?? []}
              projections={projections ?? []}
              candidates={plannerCandidates}
              entityNamesById={Object.fromEntries(
                Object.values(entitiesById).map((entity) => [String(entity.id), entity.name.en]),
              )}
              liveUpgrades={observedUpgrades ?? []}
              builderCount={activeTag ? profilesByTag[activeTag]?.normalBuilderCount ?? 0 : 0}
              nowMs={Date.now()}
              queueBusy={queueBusy}
              onEditPlannedItem={beginQueueItemEdit}
              onRemovePlannedItem={removeFromQueue}
            />

            <PlannerQueueList
              items={queuePlan?.items ?? []}
              projections={projections ?? []}
              candidates={plannerCandidates}
              itemNamesByCandidateId={Object.fromEntries(
                (result?.items ?? []).map((item) => [item.candidate.candidateId, item.name]),
              )}
              builderCount={activeTag ? profilesByTag[activeTag]?.normalBuilderCount ?? 0 : 0}
              queueBusy={queueBusy}
              queueError={queueError}
              projectionError={projectionError}
              isCalculating={Boolean(!projectionError && queuePlan && queuePlan.items.length > 0 && projections === null)}
              editingItemId={editingQueueItemId}
              targetDrafts={queueTargetDrafts}
              laneDrafts={queueLaneDrafts}
              editErrors={queueEditErrors}
              pendingEdit={pendingQueueEdit}
              onConfirmEdit={() => {
                if (!pendingQueueEdit || queueBusy || pendingQueueEdit.accountTag !== activeTag || pendingQueueEdit.planId !== queuePlan?.id) {
                  setPendingQueueEdit(null);
                  return;
                }
                void persistQueue(pendingQueueEdit.items).then((saved) => {
                  if (!saved) return;
                  setEditingQueueItemId(null);
                  setEditingQueueOwner(null);
                  setQueueEditErrors((previous) => {
                    const next = { ...previous };
                    delete next[pendingQueueEdit.itemId];
                    return next;
                  });
                  setPendingQueueEdit(null);
                });
              }}
              onCancelPreview={() => setPendingQueueEdit(null)}
              hasEditConflict={hasQueueEditConflict}
              onTargetDraftChange={(itemId, value) => setQueueTargetDrafts((previous) => ({ ...previous, [itemId]: value.replace(/[^0-9]/g, "") }))}
              onLaneDraftChange={(itemId, lane) => setQueueLaneDrafts((previous) => ({ ...previous, [itemId]: lane }))}
              onSaveEdit={(item) => void saveQueueItemEdit(item)}
              onBeginEdit={beginQueueItemEdit}
              onCancelEdit={() => { setEditingQueueItemId(null); setEditingQueueOwner(null); setPendingQueueEdit(null); }}
              onRemove={removeFromQueue}
              onAssignNextBuilder={assignNextBuilder}
              onMove={moveQueueItem}
            />

            <TextInput
              accessibilityLabel="Search upgrades"
              value={query}
              onChangeText={setQuery}
              placeholder="Search upgrades by name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={styles.search}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {CATEGORIES.map((item) => {
                const selected = item.value === category;
                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setCategory(item.value)}
                    style={[styles.filterChip, selected && styles.filterChipSelected]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {untrackedEntities.length > 0 && (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Set or edit levels</Text>
                <Text style={styles.body}>
                  Levels absent from the imported snapshot need manual entry. You can also edit saved manual levels here. Level 0 means not built/unlocked; imported levels take precedence over manual values.
                </Text>
                {untrackedEntities.map(({ entity, maxLevel }) => {
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
                        value={levelDrafts[key] ?? (manualOverrides[key] !== undefined ? String(manualOverrides[key]) : "")}
                        onChangeText={(value) => {
                          setLevelDrafts((previous) => ({ ...previous, [key]: value.replace(/[^0-9]/g, "") }));
                          setLevelErrors((previous) => {
                            if (!previous[key]) return previous;
                            const next = { ...previous };
                            delete next[key];
                            return next;
                          });
                        }}
                        placeholder="Level"
                        placeholderTextColor={colors.textMuted}
                        style={styles.levelInput}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => applyLevel(entity.id, maxLevel)}
                        style={styles.applyButton}
                      >
                        <Text style={styles.applyButtonText}>Use level</Text>
                      </Pressable>
                      {!!levelErrors[key] && (
                        <Text accessibilityRole="alert" style={styles.warning}>{levelErrors[key]}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <PlannerCatalogState
              isLoading={isLoading}
              error={error}
              result={result}
              entityCount={Object.keys(entitiesById).length}
              untrackedEntityCount={untrackedEntities.length}
              query={query}
            />

            {!isLoading && result?.items.map((item) => {
              const entityId = Number(item.candidate.entityId);
              const entity = Number.isSafeInteger(entityId) ? entitiesById[entityId] : undefined;
              const iconUri = entity
                ? resolveEntityIcon(entityId, {
                    village: entity.village,
                    type: entity.type,
                    subType: entity.subType,
                    level: Math.max(1, item.currentLevel),
                    useTroopIcon: entity.type === "troop",
                  })
                : undefined;
              const costResources = getCostResources(item.candidate.estimate.cost);
              return (
              <View key={item.candidate.candidateId} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.catalogIdentity}>
                    {iconUri ? (
                      <Image source={{ uri: iconUri }} style={styles.entityIcon} contentFit="contain" cachePolicy="memory-disk" />
                    ) : (
                      <View style={styles.entityIconFallback}>
                        <Text style={styles.muted}>{item.candidate.category.slice(0, 1).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.itemTitleWrap}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.muted}>{item.candidate.category}</Text>
                    </View>
                  </View>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>{item.currentLevel} → {item.candidate.targetLevel}</Text>
                  </View>
                </View>
                <View style={styles.costAndTime}>
                  <View style={styles.resourceCostRow}>
                    {costResources.length === 0 ? (
                      <Text style={styles.body}>Cost: {formatCostEstimate(item.candidate.estimate.cost)}</Text>
                    ) : costResources.map(({ resource, amount }) => {
                      const resourceIcon = resolveResourceIcon(resource);
                      const resourceColor = getResourceColor(resource, colors);
                      return (
                        <View key={resource} style={[styles.resourceCostChip, { backgroundColor: resourceColor + "18" }]}>
                          {resourceIcon ? <Image source={{ uri: resourceIcon }} style={styles.resourceIcon} contentFit="contain" /> : null}
                          <Text style={[styles.resourceCostText, { color: resourceColor }]}>{amount.toLocaleString("en-US")}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.muted}>Time: {formatDurationEstimate(item.candidate.estimate.durationMs)}</Text>
                </View>
                {item.blockedBy.length > 0 && (
                  <Text style={styles.warning}>
                    Prerequisites not confirmed: {item.blockedBy.map((prerequisite) =>
                      prerequisite.kind === "entity-level"
                        ? `required upgrade level ${prerequisite.minimumLevel}`
                        : `${prerequisite.kind} ${prerequisite.minimumLevel}`,
                    ).join(", ")}
                  </Text>
                )}
                {item.canAdd ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={queuePlan?.items.some((queued) =>
                      queued.candidateId === item.candidate.candidateId &&
                      queued.targetLevel === item.candidate.targetLevel
                    ) ? `Already queued: ${item.name}` : `Add ${item.name} to plan`}
                    disabled={queueBusy || pendingQueueEdit !== null || !queuePlan || queuePlan.items.some((queued) =>
                      queued.candidateId === item.candidate.candidateId &&
                      queued.targetLevel === item.candidate.targetLevel
                    )}
                    onPress={() => addToQueue(item.candidate.candidateId, item.candidate.targetLevel)}
                    style={styles.applyButton}
                  >
                    <Text style={styles.applyButtonText}>
                      {queuePlan?.items.some((queued) =>
                        queued.candidateId === item.candidate.candidateId &&
                        queued.targetLevel === item.candidate.targetLevel
                      ) ? "Already queued" : "Add to plan"}
                    </Text>
                  </Pressable>
                ) : (
                  <Text accessibilityRole="text" style={styles.warning}>
                    Cannot add until the listed prerequisites are met or confirmed.
                  </Text>
                )}
              </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getCostResources(
  estimate: PlannerCatalogResult["items"][number]["candidate"]["estimate"]["cost"],
): { resource: ResourceType; amount: number }[] {
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

function formatCostEstimate(
  estimate: PlannerCatalogResult["items"][number]["candidate"]["estimate"]["cost"],
): string {
  if (estimate.status === "unknown") return "unknown";
  const resources: readonly (readonly [string, number | undefined])[] = [
    ["gold", estimate.value.gold],
    ["elixir", estimate.value.elixir],
    ["dark elixir", estimate.value.darkElixir],
  ];
  const parts = resources
    .filter((entry) => entry[1] !== undefined && Number.isFinite(entry[1]) && entry[1] >= 0)
    .map((entry) => String(entry[1]!.toLocaleString("en-US")) + " " + entry[0]);
  return parts.length > 0 ? parts.join(" + ") : "not listed";
}

function formatDurationEstimate(
  estimate: PlannerCatalogResult["items"][number]["candidate"]["estimate"]["durationMs"],
): string {
  if (estimate.status === "unknown") return "unknown";
  let remaining = estimate.value;
  if (!Number.isSafeInteger(remaining) || remaining < 0) return "invalid";
  if (remaining === 0) return "instant";
  const units: readonly (readonly [number, string])[] = [
    [86400000, "d"], [3600000, "h"], [60000, "m"], [1000, "s"],
  ];
  const parts: string[] = [];
  for (const unit of units) {
    const amount = Math.floor(remaining / unit[0]);
    if (amount > 0) {
      parts.push(String(amount) + unit[1]);
      remaining -= amount * unit[0];
    }
    if (parts.length === 2) break;
  }
  return parts.join(" ") || "<1s";
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { padding: 18, paddingBottom: 32, gap: 12 },
    eyebrow: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
    title: { color: colors.textPrimary, fontSize: 28, fontWeight: "800" },
    subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 4 },
    accountCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 },
    accountName: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
    muted: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    body: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
    search: { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    filters: { gap: 8, paddingVertical: 2 },
    filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    filterChipSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
    filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    filterTextSelected: { color: colors.textDark },
    inlineState: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 18 },
    stateCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16 },
    stateTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
    itemCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
    itemHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
    catalogIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    entityIcon: { width: 48, height: 48 },
    entityIconFallback: { width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, borderRadius: 8 },
    costAndTime: { gap: 5 },
    resourceCostRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
    resourceCostChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
    resourceIcon: { width: 18, height: 18 },
    resourceCostText: { fontSize: 12, fontWeight: "800" },
    itemTitleWrap: { flex: 1 },
    itemName: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    levelBadge: { backgroundColor: colors.surfaceRaised, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
    levelText: { color: colors.gold, fontSize: 12, fontWeight: "800" },
    warning: { color: colors.orangeLight, fontSize: 12, lineHeight: 17 },
    levelEditor: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    levelInput: { width: 64, color: colors.textPrimary, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, textAlign: "center" },
    applyButton: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
    applyButtonText: { color: colors.textDark, fontSize: 11, fontWeight: "800" },
    queueRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    queueActions: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
    queueEditPanel: { gap: 8, paddingTop: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
    laneChoiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    laneChoice: { borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
    laneChoiceSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
    laneChoiceTextSelected: { color: colors.textDark },
    removeButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
    removeButtonText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700" },
  });
}
