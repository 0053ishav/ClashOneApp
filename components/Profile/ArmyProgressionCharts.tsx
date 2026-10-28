import { useMemo } from "react";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ParsedArmyEntity } from "@/utils/profile/parseArmy";
import type { HomeColors } from "@/theme/home";

type ChartMode = "distribution" | "history";

interface Props {
  items: ParsedArmyEntity[];
  mode: ChartMode;
  colors: HomeColors;
  onSelectMode: (mode: ChartMode) => void;
  selectedBucket: LevelBucket["key"] | null;
  onSelectBucket: (bucket: LevelBucket["key"] | null) => void;
}

interface LevelBucket {
  key: "maxed" | "nearMax" | "upgrade";
  label: string;
  description: string;
  count: number;
  color: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}

export default function ArmyProgressionCharts({
  items,
  mode,
  colors,
  onSelectMode,
  selectedBucket,
  onSelectBucket,
}: Props) {
  const buckets = useMemo<LevelBucket[]>(() => {
    const result: LevelBucket[] = [
      { key: "maxed", label: "Maxed", description: "At max level", count: 0, color: colors.success, icon: "checkmark-circle" },
      { key: "nearMax", label: "Almost there", description: "1–2 levels left", count: 0, color: colors.gold, icon: "trending-up" },
      { key: "upgrade", label: "Needs work", description: "3+ levels left", count: 0, color: colors.danger, icon: "arrow-up-circle" },
    ];

    for (const item of items) {
      const remaining = Math.max(0, item.maxLevel - item.level);
      if (remaining === 0) result[0].count += 1;
      else if (remaining <= 2) result[1].count += 1;
      else result[2].count += 1;
    }

    return result;
  }, [items, colors.danger, colors.gold, colors.success]);

  const total = items.length;
  const maxedCount = buckets[0].count;
  const readiness = total === 0 ? 0 : Math.round((maxedCount / total) * 100);
  const hasSelection = selectedBucket !== null;

  return (
    <View style={styles.container}>
      <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceDark }]}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "distribution" }}
          onPress={() => onSelectMode("distribution")}
          style={[styles.modeTab, mode === "distribution" && { backgroundColor: colors.surfaceRaised }]}
        >
          <Ionicons name="grid-outline" size={14} color={mode === "distribution" ? colors.gold : colors.textSecondary} />
          <Text style={[styles.modeText, { color: mode === "distribution" ? colors.textPrimary : colors.textSecondary }]}>Overview</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "history" }}
          onPress={() => onSelectMode("history")}
          style={[styles.modeTab, mode === "history" && { backgroundColor: colors.surfaceRaised }]}
        >
          <Ionicons name="time-outline" size={14} color={mode === "history" ? colors.gold : colors.textSecondary} />
          <Text style={[styles.modeText, { color: mode === "history" ? colors.textPrimary : colors.textSecondary }]}>History</Text>
        </Pressable>
      </View>

      {mode === "distribution" ? (
        <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]}>
          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ARMY READINESS</Text>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                {total === 0 ? "No data yet" : readiness === 100 ? "Army mastered" : readiness >= 60 ? "Looking strong" : "Room to grow"}
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                {total === 0 ? "Add progression data to see your readiness." : `${maxedCount} of ${total} entities fully upgraded`}
              </Text>
            </View>
            <View style={[styles.scoreRing, { borderColor: colors.gold, backgroundColor: colors.surfaceDark }]}>
              <Text style={[styles.scoreValue, { color: colors.gold }]}>{readiness}<Text style={styles.scoreUnit}>%</Text></Text>
              <Text style={[styles.scoreCaption, { color: colors.textSecondary }]}>MAXED</Text>
            </View>
          </View>

          {total === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No army progression data is available for this category.</Text>
          ) : (
            <>
              <View
                accessibilityLabel={`${buckets.map((bucket) => `${bucket.label}: ${bucket.count}`).join(", ")} out of ${total} entities`}
                style={[styles.distributionTrack, { backgroundColor: colors.surfaceDark }]}
              >
                {buckets.map((bucket) => bucket.count > 0 ? (
                  <View
                    key={bucket.key}
                    style={{ flex: bucket.count, backgroundColor: bucket.color }}
                  />
                ) : null)}
              </View>
              <View style={styles.statsGrid}>
                {buckets.map((bucket) => {
                  const selected = selectedBucket === bucket.key;
                  const percentage = Math.round((bucket.count / total) * 100);
                  return (
                    <Pressable
                      key={bucket.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => onSelectBucket(selected ? null : bucket.key)}
                      style={[
                        styles.statCard,
                        { backgroundColor: colors.surfaceDark, borderColor: selected ? bucket.color : "transparent" },
                      ]}
                    >
                      <View style={styles.statHeading}>
                        <Ionicons name={bucket.icon} size={16} color={bucket.color} />
                        <Text style={[styles.statPercent, { color: bucket.color }]}>{percentage}%</Text>
                      </View>
                      <Text style={[styles.statCount, { color: colors.textPrimary }]}>{bucket.count}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{bucket.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={[styles.insight, { borderColor: colors.borderStrong }]}>
                <View style={[styles.insightIcon, { backgroundColor: colors.surfaceDark }]}>
                  <Ionicons
                    name={buckets[2].count > 0 ? "flash-outline" : "checkmark-circle-outline"}
                    size={17}
                    color={buckets[2].count > 0 ? colors.gold : colors.success}
                  />
                </View>
                <View style={styles.insightCopy}>
                  <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
                    {buckets[2].count > 0 ? "Best place to focus" : buckets[1].count > 0 ? "You're nearly there" : "All caught up"}
                  </Text>
                  <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                    {buckets[2].count > 0
                      ? `${buckets[2].count} entities have more than 2 levels left. Select “Needs work” to review them.`
                      : buckets[1].count > 0
                        ? `${buckets[1].count} entities are within two levels of max.`
                        : "Every tracked entity is at max level."}
                  </Text>
                </View>
                {hasSelection && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear progression filter" onPress={() => onSelectBucket(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={[styles.card, styles.historyCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]}>
          <View style={[styles.historyIcon, { backgroundColor: colors.surfaceDark }]}>
            <Ionicons name="time-outline" size={28} color={colors.cyan} />
          </View>
          <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Your progress story starts here</Text>
          <Text style={[styles.historyCopy, { color: colors.textSecondary }]}>
            Clash One currently has your latest levels, but not a saved history of earlier levels. Once progression snapshots are available, this view can show how your army improves over time.
          </Text>
          <View style={[styles.historyNote, { borderColor: colors.borderStrong }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.historyNoteText, { color: colors.textSecondary }]}>No historical data yet · Nothing is estimated or invented</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  modeSwitch: { flexDirection: "row", alignSelf: "flex-start", padding: 4, borderRadius: 12, gap: 3 },
  modeTab: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 34, paddingHorizontal: 13, borderRadius: 9 },
  modeText: { fontSize: 11, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 20, padding: 15, gap: 15 },
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroCopy: { flex: 1, gap: 5 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  heroTitle: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 11, lineHeight: 16 },
  scoreRing: { width: 76, height: 76, borderWidth: 2, borderRadius: 38, alignItems: "center", justifyContent: "center", gap: 1 },
  scoreValue: { fontSize: 23, fontWeight: "900", fontVariant: ["tabular-nums"] },
  scoreUnit: { fontSize: 12, fontWeight: "800" },
  scoreCaption: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  distributionTrack: { height: 10, flexDirection: "row", borderRadius: 6, overflow: "hidden" },
  statsGrid: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 14, padding: 10, gap: 5 },
  statHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 3 },
  statPercent: { fontSize: 10, fontWeight: "900", fontVariant: ["tabular-nums"] },
  statCount: { fontSize: 24, lineHeight: 28, fontWeight: "900", fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 10, lineHeight: 13, fontWeight: "700" },
  insight: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 13 },
  insightIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  insightCopy: { flex: 1, gap: 3 },
  insightTitle: { fontSize: 12, fontWeight: "900" },
  insightText: { fontSize: 10, lineHeight: 15 },
  emptyText: { fontSize: 12, lineHeight: 18 },
  historyCard: { alignItems: "center", paddingVertical: 24, gap: 12 },
  historyIcon: { width: 66, height: 66, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  historyTitle: { fontSize: 15, fontWeight: "900", textAlign: "center" },
  historyCopy: { fontSize: 12, lineHeight: 19, textAlign: "center" },
  historyNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignSelf: "stretch" },
  historyNoteText: { fontSize: 10, textAlign: "center", flexShrink: 1 },
});
