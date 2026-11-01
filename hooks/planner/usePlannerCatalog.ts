import { useEffect, useMemo, useRef, useState } from "react";
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
import type { PlannerEntityCategory, ProgressionCandidate } from "@/types/planner";
import { useAccountStore } from "@/stores/accountStore";
import { useEntityStore } from "@/stores/entityStore";
import { getPlannerLevelEditorCandidates, resolvePlannerCatalogLevelState } from "@/services/plannerCatalogLevelState";
import { resolvePlannerStructureLevels } from "@/services/plannerStructureLevelService";

const EMPTY_LEVELS: Record<string, number> = {};

export function usePlannerCatalog(townHallLevel: number) {
  const activeTag = useAccountStore((state) => state.activeTag);
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
  const [loadedAccountTag, setLoadedAccountTag] = useState<string | null>(null);
  const hasLoadedActiveAccount = activeTag !== null && loadedAccountTag === activeTag;
  const accountCurrentLevels = hasLoadedActiveAccount ? currentLevels : EMPTY_LEVELS;

  const plannerCandidates = useMemo<readonly ProgressionCandidate[]>(() => {
    const dataset = buildPlannerDatasetFromCache({
      entities: Object.values(entitiesById),
      manifest: loadProgressionManifest(),
      loadCategory: loadProgressionCategory,
    });
    return dataset.candidates;
  }, [entitiesById]);

  const structureLevels = useMemo(
    () => resolvePlannerStructureLevels(Object.values(entitiesById), accountCurrentLevels),
    [accountCurrentLevels, entitiesById],
  );

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setError(null);

    if (!activeTag) {
      setLoadedAccountTag(null);
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

    setLoadedAccountTag(null);
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
        setLoadedAccountTag(activeTag);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load village levels.");
          setIsLoading(false);
          setLoadedAccountTag(activeTag);
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

    const resolvedStructureLevels = resolvePlannerStructureLevels(
      Object.values(entitiesById),
      accountCurrentLevels,
    );
    const filters: PlannerCatalogFilters = {
      query,
      category,
      currentLevels: accountCurrentLevels,
      townHallLevel,
      ...resolvedStructureLevels,
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
  }, [activeTag, accountCurrentLevels, category, coordinator, entitiesById, query, townHallLevel]);

  const untrackedEntities = useMemo(
    () => getPlannerLevelEditorCandidates(Object.values(entitiesById), {
      category,
      query,
      currentLevels: accountCurrentLevels,
      manualOverrides,
    }, plannerCandidates),
    [accountCurrentLevels, category, entitiesById, manualOverrides, plannerCandidates, query],
  );

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

  return {
    activeTag,
    entitiesById,
    query,
    setQuery,
    category,
    setCategory,
    currentLevels: accountCurrentLevels,
    structureInstances: hasLoadedActiveAccount ? structureInstances : [],
    activeUpgrades: hasLoadedActiveAccount ? activeUpgrades : [],
    showStructureInstances: hasLoadedActiveAccount && showStructureInstances,
    setShowStructureInstances,
    manualOverrides: hasLoadedActiveAccount ? manualOverrides : {},
    levelDrafts: hasLoadedActiveAccount ? levelDrafts : {},
    setLevelDrafts,
    levelErrors: hasLoadedActiveAccount ? levelErrors : {},
    setLevelErrors,
    result: hasLoadedActiveAccount ? result : null,
    isLoading: isLoading || (activeTag !== null && !hasLoadedActiveAccount),
    error: hasLoadedActiveAccount ? error : null,
    setError,
    plannerCandidates,
    structureLevels,
    untrackedEntities: hasLoadedActiveAccount ? untrackedEntities : [],
    applyLevel,
  };
}
