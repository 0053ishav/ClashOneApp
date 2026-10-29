import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import StatsGrid from "@/components/Profile/StatsGrid";
import ProfileHeroCard from "@/components/Profile/ProfileHeroCard";
import ProgressSection from "@/components/Profile/ProgressSection";
import ProgressionBreakdownSheet, {
  type ProgressionBreakdownSheetRef,
} from "@/components/Profile/ProgressionBreakdownSheet";
import EntityCard from "@/components/EntityCard";
import {
  buildVirtualizedArmyList,
  type VirtualizedArmyListItem,
} from "@/utils/profile/buildVirtualizedArmyList";
import { parseArmy } from "@/utils/profile/parseArmy";
import { fetchFullPlayer } from "@/services/clashApi";
import {
  getCachedPlayerProfile,
  getInMemoryCachedPlayerProfile,
  rememberPlayerProfileInMemory,
  saveCachedPlayerProfile,
} from "@/services/playerProfileCacheService";
import { getEntities } from "@/services/entityService";
import { useAccountStore } from "@/stores/accountStore";
import type { PlayerFull } from "@/types/playerFull";
import type { EntityRecord } from "@/types/upgrade";
import { getSessionSource, track } from "@/utils/analytics/analytics";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PlayerFull | null>(null);
  const [dataTag, setDataTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<number | null>(null);

  const activeTag = useAccountStore((s) => s.activeTag);
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [entitiesTag, setEntitiesTag] = useState<string | null>(null);
  const visibleData = dataTag === activeTag ? data : null;
  const activeEntities = entitiesTag === activeTag ? entities : [];
  const progressionSheetRef = useRef<ProgressionBreakdownSheetRef>(null);
  const router = useRouter();
  const armyList = useMemo(
    () => (visibleData ? buildVirtualizedArmyList(parseArmy(visibleData)) : { categories: [], items: [] }),
    [visibleData],
  );

  useEffect(() => {
    track("screen_view", { screen: "profile" });
  }, []);

  const loadRequestId = useRef(0);
  const screenMountedAtRef = useRef(Date.now());
  const firstContentLayoutLoggedRef = useRef(false);

  const logProfileTiming = useCallback((event: string, startedAt: number) => {
    if (__DEV__) {
      console.info("[PROFILE_PERF]", event, {
        elapsedMs: Date.now() - startedAt,
      });
    }
  }, []);

  const handleProfileContentLayout = useCallback(() => {
    if (firstContentLayoutLoggedRef.current) return;
    firstContentLayoutLoggedRef.current = true;
    logProfileTiming("first-content-layout", screenMountedAtRef.current);
  }, [logProfileTiming]);

  const loadProfile = useCallback(async (forceRefresh = false) => {
    const loadStartedAt = Date.now();
    const requestId = ++loadRequestId.current;
    const playerTag = activeTag;

    try {
      setLoading(true);
      setError(null);

      if (!playerTag) {
        setData(null);
        setDataTag(null);
        setEntities([]);
        setEntitiesTag(null);
        setProfileUpdatedAt(null);
        setError("No player tag found");
        return;
      }

      // Serve a profile already seen in this app session synchronously so an
      // account switch does not wait for another SQLite round trip before render.
      if (!forceRefresh) {
        const inMemory = getInMemoryCachedPlayerProfile(playerTag);
        if (inMemory) {
          setData(inMemory.profile);
          setDataTag(playerTag);
          setEntities([]);
          setEntitiesTag(null);
          setProfileUpdatedAt(inMemory.updatedAt);
          setLoading(false);

          // Entity chips are supplementary; don't block the profile content on them.
          void getEntities(playerTag).then((entityData) => {
            if (requestId === loadRequestId.current) {
              setEntities(entityData);
              setEntitiesTag(playerTag);
            }
          }).catch((entityError: unknown) => {
            console.warn("Failed to read cached profile entities:", entityError);
          });
          return;
        }
      }

      // Read local SQLite first. A cached profile prevents an automatic network
      // request whenever this screen mounts or the active account changes.
      if (!forceRefresh) {
        try {
          const cached = await getCachedPlayerProfile(playerTag);
          if (requestId !== loadRequestId.current) return;

          if (cached) {
            setData(cached.profile);
            setDataTag(playerTag);
            setEntities([]);
            setEntitiesTag(null);
            setProfileUpdatedAt(cached.updatedAt);
            logProfileTiming("profile-cache-hit", loadStartedAt);
            const entityData = await getEntities(playerTag);
            if (requestId === loadRequestId.current) {
              setEntities(entityData);
              setEntitiesTag(playerTag);
            }
            return;
          }
        } catch (cacheReadError) {
          // The cache is an optimization: a local read failure must not block
          // the existing live profile fetch path.
          console.warn("Failed to read cached player profile:", cacheReadError);
        }
      }

      track("player_fetching", {
        source: getSessionSource(),
        trigger: forceRefresh ? "profile_refresh" : "profile_cache_miss",
      });

      const playerData = await fetchFullPlayer(playerTag);
      if (requestId !== loadRequestId.current) return;
      logProfileTiming(forceRefresh ? "profile-network-refresh" : "profile-network-miss", loadStartedAt);

      setData(playerData);
      setDataTag(playerTag);
      setEntities([]);
      setEntitiesTag(null);
      rememberPlayerProfileInMemory(playerTag, playerData, Date.now());

      // A cache write failure should not discard a successful live API response.
      try {
        await saveCachedPlayerProfile(playerTag, playerData);
        if (requestId === loadRequestId.current) {
          setProfileUpdatedAt(Date.now());
        }
      } catch (cacheError) {
        if (requestId === loadRequestId.current) {
          setProfileUpdatedAt(null);
        }
        console.warn("Failed to cache player profile:", cacheError);
      }

      const entityData = await getEntities(playerTag);
      if (requestId !== loadRequestId.current) return;

      track("player_fetching_success", {
        source: getSessionSource(),
        trigger: forceRefresh ? "profile_refresh" : "profile_cache_miss",
      });

      setEntities(entityData);
      setEntitiesTag(playerTag);
    } catch (err) {
      if (requestId !== loadRequestId.current) return;

      // Mark this account as the current request even on failure so the
      // matching error state can render instead of an indefinite switch spinner.
      setDataTag(playerTag);
      track("player_fetching_failed", {
        source: getSessionSource(),
        trigger: forceRefresh ? "profile_refresh" : "profile_screen",
        error: err,
      });
      setError(err instanceof Error ? err.message : "Failed to load profile");
      console.error("Profile load error:", err);
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, [activeTag, logProfileTiming]);

  useEffect(() => {
    setData(null);
    setDataTag(null);
    setEntities([]);
    setEntitiesTag(null);
    setProfileUpdatedAt(null);
    setError(null);
    void loadProfile();
  }, [activeTag, loadProfile]);

  const onRefresh = async () => {
    track("profile_refresh", {
      source: getSessionSource(),
    });
    setRefreshing(true);
    await loadProfile(true);
    setRefreshing(false);
  };

  if (!visibleData && (loading || dataTag !== activeTag)) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size={44} color={colors.gold} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  if (!visibleData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle" size={32} color={colors.danger} />
        </View>
        <Text style={styles.errorTitle}>Couldn&apos;t load profile</Text>
        <Text style={styles.errorText}>
          {error || "Failed to load profile"}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadProfile()}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="refresh" size={15} color={colors.textDark} />
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const helpers = activeEntities.filter((entity) => entity.type?.toLowerCase() === "helper");
  const guardians = activeEntities.filter((entity) => entity.type?.toLowerCase() === "guardian");

  const renderArmyItem = ({ item }: { item: VirtualizedArmyListItem }) => {
    if (item.type === "army-header") {
      return (
        <View style={styles.armyHeader}>
          <View style={styles.armyHeaderLeft}>
            <View style={styles.armyIconWrapper}>
              <Ionicons name="shield" size={15} color={colors.gold} />
            </View>
            <Text style={styles.armyTitle}>Army</Text>
          </View>
          <View style={styles.armyHeaderActions}>
            <Text style={styles.armyTotal}>{item.total} units</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open overall army progression"
              onPress={() => progressionSheetRef.current?.present()}
              style={styles.overviewButton}
            >
              <Ionicons name="stats-chart-outline" size={14} color={colors.gold} />
              <Text style={styles.overviewButtonText}>Overview</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    const { category, rowItems, rowIndex, rowCount } = item;
    const firstRow = rowIndex === 0;
    const lastRow = rowIndex === rowCount - 1;
    const accent = category.key.startsWith("builder-") ? colors.purpleStrong : colors.gold;

    return (
      <View
        style={[
          styles.armyCategoryRow,
          firstRow && styles.armyCategoryFirst,
          !firstRow && styles.armyCategoryContinuation,
          lastRow && styles.armyCategoryLast,
        ]}
      >
        {firstRow && (
          <View style={styles.armyCategoryHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${category.title} progression details`}
              onPress={() => progressionSheetRef.current?.present(category.key)}
              style={styles.armyCategoryHeaderLeft}
            >
              <View style={[styles.armyCategoryIconChip, { backgroundColor: accent + "1f" }]}>
                <Ionicons name={category.icon} size={14} color={accent} />
              </View>
              <Text style={styles.armyCategoryTitle}>{category.title}</Text>
              <View style={styles.armyCountBadge}>
                <Text style={styles.armyCountText}>{category.items.length}</Text>
              </View>
              <Ionicons name="chevron-down" size={14} color={accent} />
            </Pressable>
            {category.showViewAll && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View all ${category.title}`}
                onPress={() => router.push("/profile/troops")}
                hitSlop={8}
                style={styles.viewAllButton}
              >
                <Text style={[styles.viewAllText, { color: accent }]}>View all</Text>
                <Ionicons name="chevron-forward" size={12} color={accent} />
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.armyGrid}>
          {rowItems.map((entity, index) => (
            <EntityCard
              key={`${entity.dataId}-${entity.level}-${rowIndex * 6 + index}`}
              name={entity.name}
              dataId={entity.dataId}
              level={entity.level}
              maxLevel={entity.maxLevel}
              village={entity.village}
              isSuperTroop={entity.isSuperTroop}
              compact
            />
          ))}
        </View>
      </View>
    );
  };

  const listHeader = (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ProfileHeroCard data={visibleData} helpers={helpers} guardians={guardians} />
      <StatsGrid
        title="Battle stats"
        stats={[
          { icon: "star", label: "War stars", value: visibleData.warStars, highlight: true },
          { icon: "flame", label: "Attacks won", value: visibleData.attackWins, color: colors.orange },
          { icon: "shield-checkmark", label: "Defenses won", value: visibleData.defenseWins, color: colors.cyan },
          { icon: "arrow-up", label: "Donated", value: visibleData.donations, color: colors.success },
          { icon: "arrow-down", label: "Received", value: visibleData.donationsReceived, color: colors.blue },
        ]}
      />
    </View>
  );

  const listFooter = (
    <View style={styles.listFooter}>
      <ProgressSection data={visibleData} />
      <View style={styles.footer}>
        <Ionicons
          name={error ? "alert-circle" : "checkmark-circle"}
          size={13}
          color={error ? colors.danger : colors.success}
        />
        <Text style={styles.footerText}>
          {error
            ? "Showing saved profile; latest update unavailable"
            : profileUpdatedAt
              ? `Saved profile · ${new Date(profileUpdatedAt).toLocaleString()}`
              : "Synced from Clash of Clans API"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ProgressionBreakdownSheet
        ref={progressionSheetRef}
        categories={armyList.categories}
      />
      <FlatList
        onLayout={handleProfileContentLayout}
        data={armyList.items}
        extraData={data}
        keyExtractor={(item) => item.key}
        renderItem={renderArmyItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 10 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={40}
        windowSize={5}
        showsVerticalScrollIndicator={false}
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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 14,
  },

  listFooter: {
    gap: 8,
    paddingTop: 12,
  },

  armyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(51, 65, 85, 0.6)",
  },
  armyHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  armyIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  armyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  armyHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  armyTotal: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  overviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  overviewButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  armyCategoryRow: {
    backgroundColor: colors.surfaceDark,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  armyCategoryFirst: {
    paddingTop: 12,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  armyCategoryContinuation: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  armyCategoryLast: {
    paddingBottom: 12,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    marginBottom: 12,
  },
  armyCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  armyCategoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  armyCategoryIconChip: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  armyCategoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  armyCountBadge: {
    minWidth: 22,
    alignItems: "center",
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  armyCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: 999,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
  },
  armyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingBottom: 10,
  },

  pressed: {
    opacity: 0.6,
  },

  // ── Header ──────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gold,
    letterSpacing: -0.4,
  },

  headerSpacer: {
    width: 36,
  },

  // ── Loading ─────────────────────────────────────────────
  loadingWrapper: {
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  // ── Error ───────────────────────────────────────────────
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 5,
  },

  errorText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    backgroundColor: colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
  },

  retryButtonText: {
    color: colors.textDark,
    fontWeight: "800",
    fontSize: 13,
  },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 5,
    marginTop: 2,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },

  footerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
