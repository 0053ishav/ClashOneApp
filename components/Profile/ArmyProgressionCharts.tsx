import { useMemo } from "react";
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
  count: number;
  color: string;
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
      { key: "maxed", label: "Max level", count: 0, color: colors.success },
      { key: "nearMax", label: "Almost there", count: 0, color: colors.gold },
      { key: "upgrade", label: "Needs upgrades", count: 0, color: colors.danger },
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
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <View style={styles.container}>
      <View style={styles.switcher} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "distribution" }}
          onPress={() => onSelectMode("distribution")}
          style={[styles.tab, { borderColor: mode === "distribution" ? colors.gold : colors.borderStrong, backgroundColor: mode === "distribution" ? colors.surfaceRaised : "transparent" }]}
        >
          <Text style={[styles.tabText, { color: mode === "distribution" ? colors.textPrimary : colors.textSecondary }]}>Level distribution</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "history" }}
          onPress={() => onSelectMode("history")}
          style={[styles.tab, { borderColor: mode === "history" ? colors.gold : colors.borderStrong, backgroundColor: mode === "history" ? colors.surfaceRaised : "transparent" }]}
        >
          <Text style={[styles.tabText, { color: mode === "history" ? colors.textPrimary : colors.textSecondary }]}>Over time</Text>
        </Pressable>
      </View>

      {mode === "distribution" ? (
        <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]}>
          <View style={styles.cardHeading}>
            <View style={styles.headingCopy}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Army readiness</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Current levels across {total} entities</Text>
            </View>
            <View style={[styles.totalBadge, { backgroundColor: colors.surfaceDark }]}>
              <Text style={[styles.totalValue, { color: colors.gold }]}>{total}</Text>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>units</Text>
            </View>
          </View>

          {total === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No army progression data is available for this category.</Text>
          ) : (
            <>
              <View style={styles.chartRows}>
                {buckets.map((bucket) => {
                  const selected = selectedBucket === bucket.key;
                  const percentage = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
                  const barWidth = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
                  return (
                    <Pressable
                      key={bucket.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => onSelectBucket(selected ? null : bucket.key)}
                      style={[
                        styles.chartRow,
                        {
                          borderColor: selected ? bucket.color : colors.borderStrong,
                          backgroundColor: selected ? colors.surfaceDark : "transparent",
                        },
                      ]}
                    >
                      <View style={styles.chartRowHeading}>
                        <View style={styles.chartLabelGroup}>
                          <View style={[styles.chartLegend, { backgroundColor: bucket.color }]} />
                          <Text style={[styles.chartLabel, { color: colors.textPrimary }]}>{bucket.label}</Text>
                        </View>
                        <View style={styles.chartMetric}>
                          <Text style={[styles.chartCount, { color: bucket.color }]}>{bucket.count}</Text>
                          <Text style={[styles.chartPercent, { color: colors.textSecondary }]}>{percentage}%</Text>
                        </View>
                      </View>
                      <View style={[styles.chartTrack, { backgroundColor: colors.surfaceDark }]}>
                        <View
                          style={[
                            styles.chartFill,
                            { width: `${barWidth}%`, backgroundColor: bucket.color },
                          ]}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.filters}>
                {buckets.map((bucket) => {
                  const selected = selectedBucket === bucket.key;
                  return (
                    <Pressable
                      key={bucket.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => onSelectBucket(selected ? null : bucket.key)}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: selected ? bucket.color : colors.borderStrong,
                          backgroundColor: selected ? colors.surfaceDark : "transparent",
                        },
                      ]}
                    >
                      <View style={[styles.filterDot, { backgroundColor: bucket.color }]} />
                      <Text style={[styles.filterText, { color: colors.textPrimary }]}>
                        {bucket.label} · {bucket.count}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.filterHint, { color: colors.textSecondary }]}>
                {selectedBucket ? "Showing matching entities below. Tap the selected filter to clear it." : "Tap a category to see exactly which entities need attention below."}
              </Text>
              <View style={[styles.insight, { backgroundColor: colors.surfaceDark }]}>
                <View style={[styles.insightDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                  {buckets[0].count === total
                    ? "Everything in this category is at max level."
                    : `${buckets[0].count} of ${total} entities are maxed. Focus on the remaining upgrades to strengthen your army.`}
                </Text>
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={[styles.card, styles.historyCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]}>
          <View style={[styles.historyIcon, { backgroundColor: colors.surfaceDark }]}>
            <Ionicons name="analytics-outline" size={34} color={colors.cyan} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Your progress story starts here</Text>
          <Text style={[styles.historyCopy, { color: colors.textSecondary }]}>
            Clash One currently has your latest levels, but not a saved history of earlier levels. Once progression snapshots are available, this chart can show how your army improves over time.
          </Text>
          <View style={[styles.historyNote, { borderColor: colors.borderStrong }]}>
            <Text style={[styles.historyNoteText, { color: colors.textSecondary }]}>No historical data yet · Nothing is estimated or invented</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  switcher: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, minHeight: 42, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 11, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  headingCopy: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "900", letterSpacing: -0.2, textAlign: "center" },
  cardSubtitle: { fontSize: 11 },
  totalBadge: { minWidth: 52, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 11, alignItems: "center" },
  totalValue: { fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] },
  totalLabel: { fontSize: 9, fontWeight: "700" },
  chartRows: { gap: 8 },
  chartRow: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, gap: 9 },
  chartRowHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  chartLabelGroup: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  chartLegend: { width: 8, height: 8, borderRadius: 4 },
  chartLabel: { fontSize: 12, fontWeight: "700" },
  chartMetric: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  chartCount: { fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] },
  chartPercent: { fontSize: 10, fontWeight: "700", fontVariant: ["tabular-nums"] },
  chartTrack: { height: 7, borderRadius: 6, overflow: "hidden" },
  chartFill: { height: "100%", borderRadius: 6 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { fontSize: 10, fontWeight: "700" },
  filterHint: { fontSize: 10, lineHeight: 14 },
  insight: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10 },
  insightDot: { width: 7, height: 7, borderRadius: 4, marginTop: 4 },
  insightText: { flex: 1, fontSize: 11, lineHeight: 16 },
  emptyText: { fontSize: 12, lineHeight: 18 },
  historyCard: { alignItems: "center", paddingVertical: 24, gap: 12 },
  historyIcon: { width: 82, height: 70, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  historyCopy: { fontSize: 12, lineHeight: 19, textAlign: "center" },
  historyNote: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignSelf: "stretch" },
  historyNoteText: { fontSize: 10, textAlign: "center" },
});
