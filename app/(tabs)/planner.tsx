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
import { useHomeColors } from "@/theme/useHomeColors";
import { useAccountStore } from "@/stores/accountStore";
import { useEntityStore } from "@/stores/entityStore";
import { getBuildingProgress } from "@/services/accountService";
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
import type { PlannerEntityCategory } from "@/types/planner";
import { resolvePlannerStructureLevels } from "@/services/plannerStructureLevelService";
import { resolvePlannerCatalogLevelState } from "@/services/plannerCatalogLevelState";

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
  const entitiesById = useEntityStore((state) => state.entitiesById);
  const coordinator = useRef(createPlannerCatalogRequestCoordinator()).current;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlannerEntityCategory | "all">("all");
  const [currentLevels, setCurrentLevels] = useState<Record<string, number>>({});
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [levelDrafts, setLevelDrafts] = useState<Record<string, string>>({});
  const [levelErrors, setLevelErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PlannerCatalogResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccount = accounts.find((account) => account.tag === activeTag);
  const townHallLevel =
    (activeTag ? profilesByTag[activeTag]?.townHallLevel : undefined) ??
    activeAccount?.townhall ??
    0;

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setError(null);

    if (!activeTag) {
      setCurrentLevels({});
      setManualOverrides({});
      setIsLoading(false);
      return () => {
        cancelled = true;
        coordinator.invalidate();
      };
    }

    setCurrentLevels({});
    setManualOverrides({});
    setLevelDrafts({});
    setIsLoading(true);
    const savedOverrides = loadPlannerCatalogLevelOverrides(activeTag);
    void getBuildingProgress(activeTag)
      .then((records) => {
        if (cancelled) return;
        const levels: Record<string, number> = {};
        for (const record of records) {
          const key = String(record.dataId);
          levels[key] = Math.max(levels[key] ?? 0, record.normalLevel);
        }
        const resolvedLevels = resolvePlannerCatalogLevelState(savedOverrides, levels);
        setCurrentLevels(resolvedLevels.currentLevels);
        setManualOverrides(resolvedLevels.manualOverrides);
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
        return entity.name.en.toLocaleLowerCase().includes(normalizedQuery)
          || String(entity.id).includes(normalizedQuery);
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

            <TextInput
              accessibilityLabel="Search upgrades"
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or entity ID"
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
                        <Text style={styles.muted}>Max level {maxLevel} · ID {key}</Text>
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

            {isLoading && (
              <View style={styles.inlineState}>
                <ActivityIndicator color={colors.gold} />
                <Text style={styles.body}>Loading catalog…</Text>
              </View>
            )}

            {!!error && (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Catalog unavailable</Text>
                <Text style={styles.body}>{error}</Text>
              </View>
            )}

            {!isLoading && !error && result?.state === "error" && (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Game data unavailable</Text>
                <Text style={styles.body}>The progression manifest or category cache is missing. Sync game data and try again.</Text>
              </View>
            )}

            {!isLoading && !error && result && result.items.length === 0 && (
              <View style={styles.stateCard}>
                {Object.keys(entitiesById).length === 0 ? (
                  <>
                    <Text style={styles.stateTitle}>Game entity metadata not loaded</Text>
                    <Text style={styles.body}>
                      The Planner has no entity catalog to search or show level editors for. Open the Home screen and sync game data, then return here. This is different from having no eligible upgrades.
                    </Text>
                  </>
                ) : untrackedEntities.length === 0 && query.trim() !== "" ? (
                  <>
                    <Text style={styles.stateTitle}>No matching entity metadata</Text>
                    <Text style={styles.body}>
                      No Home Village entity name or ID matches “{query.trim()}”. Try the entity name without extra words, clear search, or sync game data if the entity is missing.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.stateTitle}>No eligible upgrades yet</Text>
                    <Text style={styles.body}>
                      The catalog has no candidate matching the known account levels and available progression data. Missing levels are not assumed to be 0. Check the entity&apos;s current level and sync game data if its next level is missing.
                    </Text>
                  </>
                )}
                <Text style={styles.muted}>
                  Planner diagnostics · progression candidates {result.diagnosticsSummary.datasetCandidates}
                  {" · "}Home Village {result.diagnosticsSummary.homeVillageCandidates}
                  {" · "}known level {result.diagnosticsSummary.knownLevelCandidates}
                  {" · "}next level {result.diagnosticsSummary.nextLevelCandidates}
                  {" · "}category match {result.diagnosticsSummary.categoryCandidates}
                  {" · "}metadata match {result.diagnosticsSummary.metadataCandidates}
                  {" · "}below max {result.diagnosticsSummary.belowMaxLevelCandidates}
                  {" · "}search match {result.diagnosticsSummary.queryCandidates}
                  {" · "}shown {result.diagnosticsSummary.returnedItems}
                </Text>
                {result.state === "partial" && (
                  <Text style={styles.muted}>Some progression categories are unavailable: {result.unavailableCategories.join(", ") || "data is incomplete"}.</Text>
                )}
              </View>
            )}

            {!isLoading && result?.items.map((item) => (
              <View key={item.candidate.candidateId} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleWrap}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.muted}>{item.candidate.category} · ID {item.candidate.entityId}</Text>
                  </View>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>{item.currentLevel} → {item.candidate.targetLevel}</Text>
                  </View>
                </View>
                <Text style={styles.body}>
                  Cost: {formatCostEstimate(item.candidate.estimate.cost)}
                  {" · "}
                  Time: {formatDurationEstimate(item.candidate.estimate.durationMs)}
                </Text>
                {item.blockedBy.length > 0 && (
                  <Text style={styles.warning}>
                    Prerequisites not confirmed: {item.blockedBy.map((prerequisite) =>
                      prerequisite.kind === "entity-level"
                        ? `entity ${prerequisite.entityId} level ${prerequisite.minimumLevel}`
                        : `${prerequisite.kind} ${prerequisite.minimumLevel}`,
                    ).join(", ")}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    itemTitleWrap: { flex: 1 },
    itemName: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    levelBadge: { backgroundColor: colors.surfaceRaised, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
    levelText: { color: colors.gold, fontSize: 12, fontWeight: "800" },
    warning: { color: colors.orangeLight, fontSize: 12, lineHeight: 17 },
    levelEditor: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    levelInput: { width: 64, color: colors.textPrimary, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, textAlign: "center" },
    applyButton: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
    applyButtonText: { color: colors.textDark, fontSize: 11, fontWeight: "800" },
  });
}
