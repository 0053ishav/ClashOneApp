import EntityCard from "@/components/EntityCard";
import { getUpgradeStatus } from "@/engine/progression/selectors/getUpgradeStatus";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { fetchFullPlayer } from "@/services/clashApi";
import { track } from "@/utils/analytics/analytics";
import { parseArmy } from "@/utils/profile/parseArmy";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
  village: string;
}

type Filter = "all" | "maxed" | "upgradable";

const GOLD = "#fbbf24";
const GREEN = "#22c55e";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upgradable", label: "Upgradable" },
  { key: "maxed", label: "Maxed" },
];

export default function TroopsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = usePlayerProfile();

  const [troops, setTroops] = useState<Troop[]>([]);
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

  const load = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      setError(null);

      if (!profile?.playerTag) {
        setError("No player tag found");
        return;
      }

      const data = await fetchFullPlayer(profile.playerTag);

      const parsed = parseArmy(data);

      const homeTroops: Troop[] = parsed.home.troops
        ?.filter((t: any) => t.village === "home")
        .map((t: any) => ({
          dataId: t.dataId,
          name: t.name,
          level: t.level,
          maxLevel: t.maxLevel,
          village: t.village,
          status: getUpgradeStatus(t.level, t.maxLevel),
        }));

      setTroops(homeTroops);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load troops");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load();
  }, [profile?.playerTag]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await load(true);
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
          <Ionicons name="alert-circle" size={36} color="#ef4444" />
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
          <Ionicons name="refresh" size={16} color="#0f172a" />
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
                <Ionicons name="chevron-back" size={22} color="#f8fafc" />
              </Pressable>

              <Text style={styles.headerTitle}>Troops</Text>

              <View style={styles.headerSpacer} />
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
                color={searchFocused ? GOLD : "#64748b"}
              />

              <TextInput
                placeholder="Search troops"
                placeholderTextColor="#64748b"
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
                  <Ionicons name="close-circle" size={18} color="#64748b" />
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
                {filtered.length} troop{filtered.length !== 1 ? "s" : ""}
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
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color="#64748b" />
            </View>

            <Text style={styles.emptyText}>No troops found</Text>

            <Text style={styles.emptySubtext}>
              {hasActiveFilters
                ? "Nothing matches your search or filter."
                : "There are no home troops to show yet."}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
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
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: GOLD,
    letterSpacing: -0.5,
  },

  headerSpacer: {
    width: 40,
  },

  // ── Overview ────────────────────────────────────────────
  overviewCard: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
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
    color: "#94a3b8",
  },

  overviewValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#f8fafc",
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
    backgroundColor: "#0f172a",
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
    color: "#f8fafc",
    letterSpacing: -0.4,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  // ── Search ──────────────────────────────────────────────
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
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
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },

  // ── Segmented filter ────────────────────────────────────
  segmented: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
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
    color: "#94a3b8",
  },

  segmentTextActive: {
    color: GOLD,
    fontWeight: "700",
  },

  segmentCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
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
    color: "#64748b",
  },

  clearText: {
    fontSize: 12,
    fontWeight: "700",
    color: GOLD,
  },

  // ── States ──────────────────────────────────────────────
  loadingText: {
    marginTop: 12,
    color: "#94a3b8",
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
    color: "#f1f5f9",
    marginBottom: 6,
  },

  errorText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: GOLD,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },

  retryButtonText: {
    color: "#0f172a",
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
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e2e8f0",
  },

  emptySubtext: {
    fontSize: 13,
    color: "#64748b",
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
    color: GOLD,
  },
});
