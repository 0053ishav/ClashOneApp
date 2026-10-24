import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { fetchFullPlayer } from "@/services/clashApi";
import { useAccountStore } from "@/stores/accountStore";
import { PlayerFull } from "@/types/playerFull";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AchievementFilter = "ALL" | "IN_PROGRESS" | "COMPLETED";

type VillageFilter = "ALL" | "home" | "builderBase" | "clanCapital";

const STATUS_OPTIONS = [
  {
    key: "ALL",
    label: "All",
    icon: "grid",
  },
  {
    key: "IN_PROGRESS",
    label: "In-Progress",
    icon: "arrow-up",
  },
  {
    key: "COMPLETED",
    label: "Completed",
    icon: "checkmark",
  },
] as const;

const VILLAGE_OPTIONS = [
  { key: "ALL", label: "All Villages" },
  { key: "home", label: "Home Village" },
  { key: "builderBase", label: "Builder Base" },
  { key: "clanCapital", label: "Clan Capital" },
] as const;

function isCompleted(value: number, target: number, stars: number) {
  return stars >= 3 || value >= target;
}

export default function AchievementsScreen() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeTag = useAccountStore((s) => s.activeTag);

  const [data, setData] = useState<PlayerFull | null>(null);

  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<AchievementFilter>("ALL");

  const [villageFilter, setVillageFilter] = useState<VillageFilter>("ALL");

  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!activeTag) return;

    try {
      const player = await fetchFullPlayer(activeTag);

      setData(player);
    } finally {
      setLoading(false);
    }
  }, [activeTag]);

  useEffect(() => {
    load();
  }, [load]);

  const achievements = useMemo(() => data?.achievements ?? [], [data]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredAchievements = useMemo(() => {
    return achievements
      .filter((achievement) => {
        const completed = isCompleted(
          achievement.value,
          achievement.target,
          achievement.stars,
        );

        const matchesStatus =
          statusFilter === "ALL"
            ? true
            : statusFilter === "COMPLETED"
              ? completed
              : !completed;

        const matchesVillage =
          villageFilter === "ALL"
            ? true
            : achievement.village === villageFilter;

        const matchesSearch =
          !normalizedSearch ||
          achievement.name.toLowerCase().includes(normalizedSearch);

        return matchesStatus && matchesVillage && matchesSearch;
      })
      .sort((a, b) => {
        const aDone = isCompleted(a.value, a.target, a.stars);

        const bDone = isCompleted(b.value, b.target, b.stars);

        if (aDone !== bDone) {
          return aDone ? 1 : -1;
        }

        return b.value / b.target - a.value / a.target;
      });
  }, [achievements, statusFilter, villageFilter, normalizedSearch]);

  const stats = useMemo(() => {
    const completed = achievements.filter((a) =>
      isCompleted(a.value, a.target, a.stars),
    ).length;

    const totalStars = achievements.reduce((sum, a) => sum + (a.stars ?? 0), 0);

    return {
      completed,
      totalStars,
      maxStars: achievements.length * 3,
      completionPercent:
        achievements.length > 0
          ? Math.round((completed / achievements.length) * 100)
          : 0,
    };
  }, [achievements]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
       
      </ScrollView> */}
      <FlatList
        data={filteredAchievements}
        keyExtractor={(item, index) => `${item.village}-${item.name}-${index}`}
        renderItem={({ item }) => <AchievementCard achievement={item} />}
        initialNumToRender={10}
        windowSize={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
          },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color={colors.gold} />
              </Pressable>

              <Text style={styles.headerTitle}>Achievements</Text>

              <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color={colors.textMuted} />

              <TextInput
                placeholder="Search achievements..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {search.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSearch("")}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            <View style={styles.dropdownRow}>
              <Text style={styles.dropdownLabel}>Village</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {VILLAGE_OPTIONS.map((item) => (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.villageChip,
                      villageFilter === item.key && styles.villageChipActive,
                    ]}
                    onPress={() => setVillageFilter(item.key as VillageFilter)}
                  >
                    <Text
                      style={[
                        styles.villageChipText,
                        villageFilter === item.key &&
                          styles.villageChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Achievement Progress</Text>

              <Text style={styles.bigNumber}>
                {stats.completed} / {achievements.length}
              </Text>

              <Text style={styles.percent}>
                {stats.completionPercent}% Complete
              </Text>

              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${stats.completionPercent}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.starText}>
                ⭐ {stats.totalStars} / {stats.maxStars}
              </Text>
            </View>

            <View style={styles.filterButtons}>
              {STATUS_OPTIONS.map((filter) => {
                const active = statusFilter === filter.key;

                return (
                  <Pressable
                    key={filter.key}
                    accessibilityRole="button"
                    onPress={() =>
                      setStatusFilter(filter.key as AchievementFilter)
                    }
                    style={[
                      styles.filterButton,
                      active && styles.filterButtonActive,
                    ]}
                  >
                    <Ionicons
                      name={filter.icon as any}
                      size={14}
                      color={active ? colors.gold : colors.textMuted}
                    />

                    <Text
                      style={[
                        styles.filterButtonText,
                        active && styles.filterButtonTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 16 }}>
              <Text style={styles.resultsText}>
                {filteredAchievements.length} achievements
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              paddingVertical: 40,
            }}
          >
            <Ionicons name="search" size={40} color={colors.textMuted} />

            <Text
              style={{
                color: colors.textSecondary,
                marginTop: 10,
              }}
            >
              No achievements found
            </Text>
          </View>
        }
      />
    </View>
  );
}

const AchievementCard = React.memo(function AchievementCard({
  achievement,
}: any) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rawPercent = (achievement.value / achievement.target) * 100;

  const progress = Math.min(rawPercent, 100);

  const completed = achievement.stars >= 3;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{achievement.name}</Text>

          <Text style={styles.info}>{achievement.info}</Text>

          <View style={styles.villageBadge}>
            <Text style={styles.villageBadgeText}>
              {achievement.village === "home"
                ? "Home Village"
                : achievement.village === "builderBase"
                  ? "Builder Base"
                  : "Clan Capital"}
            </Text>
          </View>
        </View>

        <View style={styles.starContainer}>
          {[1, 2, 3].map((i) => (
            <Ionicons
              key={i}
              name={i <= achievement.stars ? "star" : "star-outline"}
              size={15}
              color={colors.gold}
            />
          ))}
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
            },
          ]}
        />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>
            {achievement.value}/{achievement.target}
          </Text>
        </View>

        <Text style={styles.progressText}>{Math.round(rawPercent)}%</Text>
      </View>

      {achievement.completionInfo && (
        <Text style={styles.completionInfo}>{achievement.completionInfo}</Text>
      )}

      {completed && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />

          <Text style={styles.completedBadgeText}>Completed</Text>
        </View>
      )}
    </View>
  );
});

const createStyles = (colors: HomeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  villageBadge: {
    alignSelf: "flex-start",

    backgroundColor: "rgba(255,255,255,0.05)",

    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },

  villageBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },

  starContainer: {
    flexDirection: "row",
    gap: 2,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  progressBadge: {
    backgroundColor: "rgba(251,191,36,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  progressBadgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
  },

  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    marginTop: 12,
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.gold,
    borderRadius: 999,
  },

  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",

    backgroundColor: "rgba(34,197,94,0.12)",

    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 999,
    marginTop: 10,
  },

  completedBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "600",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.gold,
    letterSpacing: -0.4,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    color: colors.textBright,
    fontSize: 14,
    fontWeight: "500",
  },

  filterButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },

  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  filterButtonActive: {
    backgroundColor: "rgba(251,191,36,0.12)",
  },

  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },

  filterButtonTextActive: {
    color: colors.gold,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,

    borderWidth: 1,
    borderColor: colors.border,
  },

  summaryTitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  summaryValue: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },

  summaryPercent: {
    color: colors.gold,
    marginTop: 8,
    fontWeight: "600",
  },

  resultsText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },

  progressText: {
    color: colors.gold,
    fontWeight: "700",
    fontSize: 12,
  },

  dropdownRow: {
    marginBottom: 16,
  },

  dropdownLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  villageChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  villageChipActive: {
    backgroundColor: "rgba(251,191,36,0.12)",
  },

  villageChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  villageChipTextActive: {
    color: colors.gold,
  },

  bigNumber: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 8,
  },

  percent: {
    color: colors.gold,
    marginBottom: 12,
    fontWeight: "700",
  },

  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    marginTop: 10,
  },

  fill: {
    height: "100%",
    backgroundColor: colors.gold,
    borderRadius: 999,
  },

  starText: {
    color: colors.textSecondary,
    marginTop: 10,
  },

  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  name: {
    color: colors.textBright,
    fontWeight: "700",
    fontSize: 14,
  },

  info: {
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 6,
    fontSize: 12,
    lineHeight: 16,
  },

  completionInfo: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
});
