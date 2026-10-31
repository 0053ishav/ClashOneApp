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
      setIsLoading(false);
      return () => {
        cancelled = true;
        coordinator.invalidate();
      };
    }

    setIsLoading(true);
    void getBuildingProgress(activeTag)
      .then((records) => {
        if (cancelled) return;
        const levels: Record<string, number> = {};
        for (const record of records) {
          const key = String(record.dataId);
          levels[key] = Math.max(levels[key] ?? 0, record.normalLevel);
        }
        setCurrentLevels(levels);
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

    const filters: PlannerCatalogFilters = {
      query,
      category,
      currentLevels,
      townHallLevel,
      // Until the player imports these structure levels, zero is a conservative
      // prerequisite value: it can block an item, but cannot falsely unlock it.
      laboratoryLevel: 0,
      petHouseLevel: 0,
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
  }, [activeTag, category, coordinator, currentLevels, query, townHallLevel]);

  const knownLevelCount = Object.keys(currentLevels).length;

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
              <Text style={styles.muted}>Town Hall {townHallLevel || "unknown"} · {knownLevelCount} known building levels</Text>
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
                <Text style={styles.stateTitle}>No eligible upgrades yet</Text>
                <Text style={styles.body}>
                  The catalog will not assume an untracked building or troop is level 0. Import a village snapshot with building levels, or sync progression data and try another category.
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
                  {item.candidate.estimate.cost.status === "known"
                    ? "Cost data available"
                    : "Cost estimate unavailable"}
                  {" · "}
                  {item.candidate.estimate.durationMs.status === "known"
                    ? "Time data available"
                    : "Time estimate unavailable"}
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
  });
}
