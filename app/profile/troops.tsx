import EntityCard from "@/components/EntityCard";
import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { getUpgradeStatus } from "@/engine/progression/selectors/getUpgradeStatus";
import { getPlayerProfileSnapshot } from "@/services/playerProfileRepository";
import { useAccountStore } from "@/stores/accountStore";
import { track } from "@/utils/analytics/analytics";
import { parseArmy } from "@/utils/profile/parseArmy";
import type { PlayerVillage } from "@/types/playerFull";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Troop {
  dataId: number;
  name: string;
  level: number;
  maxLevel: number;
  status: "max" | "near" | "mid" | "low";
  village: PlayerVillage;
  isSuperTroop?: boolean;
}

type Filter = "all" | "maxed" | "upgradable";
type TroopCategory = "home" | "superTroops" | "builderBase";

const TROOP_CATEGORIES: { key: TroopCategory; label: string }[] = [
  { key: "home", label: "Home Village" },
  { key: "superTroops", label: "Super Troops" },
  { key: "builderBase", label: "Builder Base" },
];


const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upgradable", label: "Upgradable" },
  { key: "maxed", label: "Maxed" },
];

export default function TroopsScreen() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const GOLD = colors.gold;
  const GREEN = colors.success;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeTag = useAccountStore((state) => state.activeTag);
  const loadRequestId = useRef(0);

  const [troopsByCategory, setTroopsByCategory] = useState<Record<TroopCategory, Troop[]>>({
    home: [],
    superTroops: [],
    builderBase: [],
  });
  const [category, setCategory] = useState<TroopCategory>("home");
  const troops = troopsByCategory[category];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    track("screen_view", {
      screen: "troops",
    });
  }, []);

  const load = useCallback(async (forceRefresh = false, silent = false) => {
    const requestId = ++loadRequestId.current;
    const playerTag = activeTag;

    try {
      if (!silent) setLoading(true);
      setError(null);

      if (!playerTag) {
        setTroopsByCategory({ home: [], superTroops: [], builderBase: [] });
        setError("No player tag found");
        return;
      }

      const snapshot = await getPlayerProfileSnapshot(playerTag, { forceRefresh });
      if (requestId !== loadRequestId.current) return;

      const parsed = parseArmy(snapshot.profile);
      const toTroops = (entities: typeof parsed.home.troops): Troop[] =>
        entities.map((entity) => ({
          dataId: entity.dataId,
          name: entity.name,
          level: entity.level,
          maxLevel: entity.maxLevel,
          village: entity.village,
          isSuperTroop: entity.isSuperTroop,
          status: getUpgradeStatus(entity.level, entity.maxLevel),
        }));

      setTroopsByCategory({
        home: toTroops(parsed.home.troops),
        superTroops: toTroops(parsed.home.superTroops),
        builderBase: toTroops(parsed.builderBase.troops),
      });
    } catch (err) {
      if (requestId === loadRequestId.current) {
        setError(err instanceof Error ? err.message : "Failed to load troops");
      }
    } finally {
      if (requestId === loadRequestId.current && !silent) setLoading(false);
    }
  }, [activeTag]);

  useEffect(() => {
    setTroopsByCategory({ home: [], superTroops: [], builderBase: [] });
    void load();
  }, [activeTag, load]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await load(true, true);
    } finally {
      setRefreshing(false);
    }
  };

  const hasActiveFilters = search.trim().length > 0 || filter !== "all";

  const resetFilters = () => {
    setSearch("");
    setFilter("all");
  };

  const filtered = useMemo(() => {
    let list = troops;

    if (search.trim()) {
      list = list.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (filter === "maxed") {
      list = list.filter((t) => t.status === "max");
    }

    if (filter === "upgradable") {
      list = list.filter((t) => t.status !== "max");
    }

    return list;
  }, [troops, search, filter]);

  const stats = useMemo(() => {
    const maxed = troops.filter((t) => t.status === "max").length;

    const totalLevels = troops.reduce((sum, troop) => sum + troop.level, 0);

    const maxLevels = troops.reduce((sum, troop) => sum + troop.maxLevel, 0);

    const progress =
      maxLevels > 0 ? Math.round((totalLevels / maxLevels) * 100) : 0;

    return {
      maxed,
      remaining: troops.length - maxed,
      progress,
    };
  }, [troops]);

  const filterCounts: Record<Filter, number> = {
    all: troops.length,
    upgradable: stats.remaining,
    maxed: stats.maxed,
  };

  if (loading && troops.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size={42} color={GOLD} />

        <Text style={styles.loadingText}>Loading troops…</Text>
      </View>
    );
  }

  if (error && troops.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle" size={36} color={colors.danger} />
        </View>

        <Text style={styles.errorTitle}>Couldn&apos;t load troops</Text>
        <Text style={styles.errorText}>{error}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => load()}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="refresh" size={16} color={colors.textDark} />
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        keyExtractor={(item) => `${item.dataId}-${item.level}-${item.village}`}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 12,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD}
          />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.textBright} />
              </Pressable>

              <Text style={styles.headerTitle}>Troops</Text>

              <View style={styles.headerSpacer} />
            </View>

            {/* Troop category selector */}
            <View style={styles.villageSelector}>
              {TROOP_CATEGORIES.map((option) => {
                const active = category === option.key;

                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setCategory(option.key)}
                    style={[
                      styles.villageTab,
                      active && styles.villageTabActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.villageTabText,
                        active && styles.villageTabTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.villageTabCount,
                        active && styles.villageTabTextActive,
                      ]}
                    >
                      {troopsByCategory[option.key].length}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Overview */}
            <View style={styles.overviewCard}>
              <View style={styles.overviewTop}>
                <View style={styles.overviewTitleGroup}>
                  <Text style={styles.overviewLabel}>Upgrade progress</Text>
                  <Text style={styles.overviewValue}>{stats.progress}%</Text>
                </View>

                <View style={styles.overviewIcon}>
                  <Ionicons name="flash" size={20} color={GOLD} />
                </View>
              </View>

              <View style={styles.overviewProgressBar}>
                <View
                  style={[
                    styles.overviewProgressFill,
                    {
                      width: `${stats.progress}%`,
                      backgroundColor: stats.progress === 100 ? GREEN : GOLD,
                    },
                  ]}
                />
              </View>

              <View style={styles.overviewStats}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{troops.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: GREEN }]}>
                    {stats.maxed}
                  </Text>
                  <Text style={styles.statLabel}>Maxed</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: GOLD }]}>
                    {stats.remaining}
                  </Text>
                  <Text style={styles.statLabel}>To upgrade</Text>
                </View>
              </View>
            </View>

            {/* Search */}
            <View
              style={[
                styles.searchContainer,
                searchFocused && styles.searchContainerFocused,
              ]}
            >
              <Ionicons
                name="search"
                size={16}
                color={searchFocused ? GOLD : colors.textMuted}
              />

              <TextInput
                placeholder={`Search ${TROOP_CATEGORIES.find((option) => option.key === category)?.label ?? "troops"}`}
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />

              {search.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={8}
                  onPress={() => setSearch("")}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Filters — segmented control */}
            <View style={styles.segmented}>
              {FILTERS.map((f) => {
                const active = filter === f.key;

                return (
                  <Pressable
                    key={f.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setFilter(f.key)}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>

                    <Text
                      style={[
                        styles.segmentCount,
                        active && styles.segmentCountActive,
                      ]}
                    >
                      {filterCounts[f.key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Results */}
            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                {filtered.length} {TROOP_CATEGORIES.find((option) => option.key === category)?.label ?? "Troops"} troop{filtered.length !== 1 ? "s" : ""}
              </Text>

              {hasActiveFilters && (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={resetFilters}
                >
                  <Text style={styles.clearText}>Clear filters</Text>
                </Pressable>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <EntityCard
            name={item.name}
            level={item.level}
            maxLevel={item.maxLevel}
            dataId={item.dataId}
            village={item.village}
            isSuperTroop={item.isSuperTroop}
            fillContainer
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color={colors.textMuted} />
            </View>

            <Text style={styles.emptyText}>No troops found</Text>

            <Text style={styles.emptySubtext}>
              {hasActiveFilters
                ? "Nothing matches your search or filter."
                : category === "home"
                  ? "There are no Home Village troops to show yet."
                  : category === "superTroops"
                    ? "No Super Troops were returned for this player. Check the player data and entity mappings if you expect to see some."
                    : "There are no Builder Base troops to show yet."}
            </Text>

            {hasActiveFilters && (
              <Pressable
                accessibilityRole="button"
                onPress={resetFilters}
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.emptyButtonText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  gridRow: {
    gap: 10,
    marginBottom: 10,
  },

  pressed: {
    opacity: 0.6,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.gold,
    letterSpacing: -0.5,
  },

  headerSpacer: {
    width: 40,
  },

  villageSelector: {
    flexDirection: "row",
    gap: 8,
    padding: 5,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },

  villageTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  villageTabActive: {
    backgroundColor: colors.surfaceRaised,
  },

  villageTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },

  villageTabCount: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
  },

  villageTabTextActive: {
    color: colors.gold,
  },

  // ── Overview ────────────────────────────────────────────
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  overviewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  overviewTitleGroup: {
    gap: 2,
  },

  overviewLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  overviewValue: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textBright,
    letterSpacing: -1,
  },

  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  overviewProgressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    marginBottom: 16,
  },

  overviewProgressFill: {
    height: "100%",
    borderRadius: 999,
  },

  overviewStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    paddingVertical: 12,
  },

  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  // ── Search ──────────────────────────────────────────────
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slateMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },

  searchContainerFocused: {
    borderColor: "rgba(251, 191, 36, 0.6)",
  },

  searchInput: {
    flex: 1,
    color: colors.textBright,
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },

  // ── Segmented filter ────────────────────────────────────
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slateMuted,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },

  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },

  segmentActive: {
    backgroundColor: "rgba(251, 191, 36, 0.14)",
  },

  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  segmentTextActive: {
    color: colors.gold,
    fontWeight: "700",
  },

  segmentCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },

  segmentCountActive: {
    color: "rgba(251, 191, 36, 0.75)",
  },

  // ── Results ─────────────────────────────────────────────
  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  resultsText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },

  clearText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gold,
  },

  // ── States ──────────────────────────────────────────────
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },

  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
  },

  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: colors.gold,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },

  retryButtonText: {
    color: colors.textDark,
    fontWeight: "800",
    fontSize: 14,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 8,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },

  emptyButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  },

  emptyButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gold,
  },
});
