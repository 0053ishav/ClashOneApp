import { fetchFullPlayer } from "@/services/clashApi";
import { useAccountStore } from "@/stores/accountStore";
import { PlayerFull } from "@/types/playerFull";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeTag = useAccountStore((s) => s.activeTag);

  const [data, setData] = useState<PlayerFull | null>(null);

  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<AchievementFilter>("ALL");

  const [villageFilter, setVillageFilter] = useState<VillageFilter>("ALL");

  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, [activeTag]);

  async function load() {
    if (!activeTag) return;

    try {
      const player = await fetchFullPlayer(activeTag);

      setData(player);
    } finally {
      setLoading(false);
    }
  }

  const achievements = data?.achievements ?? [];

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
        <ActivityIndicator size="large" color="#fbbf24" />
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
                <Ionicons name="chevron-back" size={24} color="#fbbf24" />
              </Pressable>

              <Text style={styles.headerTitle}>Achievements</Text>

              <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color="#64748b" />

              <TextInput
                placeholder="Search achievements..."
                placeholderTextColor="#64748b"
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
                  <Ionicons name="close-circle" size={18} color="#64748b" />
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
                      color={active ? "#fbbf24" : "#64748b"}
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
            <Ionicons name="search" size={40} color="#64748b" />

            <Text
              style={{
                color: "#94a3b8",
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
              color="#fbbf24"
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
          <Ionicons name="checkmark-circle" size={14} color="#22c55e" />

          <Text style={styles.completedBadgeText}>Completed</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  villageBadge: {
    alignSelf: "flex-start",

    backgroundColor: "rgba(255,255,255,0.05)",

    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 999,
    marginTop: 6,
  },

  villageBadgeText: {
    color: "#94a3b8",
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
    color: "#fbbf24",
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
    backgroundColor: "#fbbf24",
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
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "600",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fbbf24",
    letterSpacing: -0.4,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    color: "#f8fafc",
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
    backgroundColor: "#111827",
  },

  filterButtonActive: {
    backgroundColor: "rgba(251,191,36,0.12)",
  },

  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },

  filterButtonTextActive: {
    color: "#fbbf24",
  },
  summaryCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,

    borderWidth: 1,
    borderColor: "#1f2937",
  },

  summaryTitle: {
    color: "#94a3b8",
    fontSize: 12,
  },

  summaryValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },

  summaryPercent: {
    color: "#fbbf24",
    marginTop: 8,
    fontWeight: "600",
  },

  resultsText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },

  progressText: {
    color: "#fbbf24",
    fontWeight: "700",
    fontSize: 12,
  },

  dropdownRow: {
    marginBottom: 16,
  },

  dropdownLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  villageChip: {
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  villageChipActive: {
    backgroundColor: "rgba(251,191,36,0.12)",
  },

  villageChipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },

  villageChipTextActive: {
    color: "#fbbf24",
  },

  bigNumber: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 8,
  },

  percent: {
    color: "#fbbf24",
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
    backgroundColor: "#fbbf24",
    borderRadius: 999,
  },

  starText: {
    color: "#cbd5e1",
    marginTop: 10,
  },

  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  name: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 14,
  },

  info: {
    color: "#94a3b8",
    marginTop: 4,
    marginBottom: 6,
    fontSize: 12,
    lineHeight: 16,
  },

  completionInfo: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 8,
  },
});
