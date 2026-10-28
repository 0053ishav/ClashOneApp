import { useMemo, useState } from "react";
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
  shortLabel: string;
  count: number;
  color: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}

interface GridEntity extends ParsedArmyEntity {
  remainingLevels: number;
  progress: number;
  bucket: LevelBucket["key"];
  entityKey: string;
}

const GRID_GAP = 5;
const MIN_CELL_WIDTH = 15;
const MAX_COLUMNS = 19;

function getEntityBucket(remainingLevels: number): LevelBucket["key"] {
  if (remainingLevels === 0) return "maxed";
  if (remainingLevels <= 2) return "nearMax";
  return "upgrade";
}

export default function ArmyProgressionCharts({
  items,
  mode,
  colors,
  onSelectMode,
  selectedBucket,
  onSelectBucket,
}: Props) {
  const [gridWidth, setGridWidth] = useState(0);
  const [selectedEntityKey, setSelectedEntityKey] = useState<string | null>(null);

  const buckets = useMemo<LevelBucket[]>(() => {
    const result: LevelBucket[] = [
      { key: "maxed", label: "Max level", shortLabel: "Maxed", count: 0, color: colors.success, icon: "checkmark-circle" },
      { key: "nearMax", label: "Almost there", shortLabel: "Almost there", count: 0, color: colors.gold, icon: "trending-up" },
      { key: "upgrade", label: "Needs upgrades", shortLabel: "Needs work", count: 0, color: colors.danger, icon: "arrow-up-circle" },
    ];

    for (const item of items) {
      const remaining = Math.max(0, item.maxLevel - item.level);
      const bucketIndex = remaining === 0 ? 0 : remaining <= 2 ? 1 : 2;
      result[bucketIndex].count += 1;
    }

    return result;
  }, [items, colors.danger, colors.gold, colors.success]);

  const gridEntities = useMemo<GridEntity[]>(() => {
    const bucketOrder: Record<LevelBucket["key"], number> = { maxed: 0, nearMax: 1, upgrade: 2 };
    return items
      .map((item) => {
        const remainingLevels = Math.max(0, item.maxLevel - item.level);
        const progress = item.maxLevel > 0
          ? Math.max(0, Math.min(1, item.level / item.maxLevel))
          : 0;
        return {
          ...item,
          remainingLevels,
          progress,
          bucket: getEntityBucket(remainingLevels),
          entityKey: `${item.dataId}-${item.village}-${item.name}`,
        };
      })
      .sort((a, b) =>
        bucketOrder[a.bucket] - bucketOrder[b.bucket]
        || b.progress - a.progress
        || a.name.localeCompare(b.name),
      );
  }, [items]);

  const total = items.length;
  const maxedCount = buckets[0].count;
  const remainingLevels = gridEntities.reduce((sum, entity) => sum + entity.remainingLevels, 0);
  const totalPossibleLevels = gridEntities.reduce((sum, entity) => sum + Math.max(0, entity.maxLevel), 0);
  const readiness = total === 0 ? 0 : Math.round((maxedCount / total) * 100);
  const overallCompletion = totalPossibleLevels === 0
    ? 0
    : Math.round((gridEntities.reduce((sum, entity) => sum + Math.max(0, Math.min(entity.level, entity.maxLevel)), 0) / totalPossibleLevels) * 100);
  const columns = gridWidth > 0
    ? Math.max(1, Math.min(MAX_COLUMNS, Math.floor((gridWidth + GRID_GAP) / (MIN_CELL_WIDTH + GRID_GAP))))
    : MAX_COLUMNS;
  const cellWidth = gridWidth > 0
    ? (gridWidth - (columns - 1) * GRID_GAP) / columns
    : MIN_CELL_WIDTH;
  const selectedEntity = gridEntities.find((entity) => entity.entityKey === selectedEntityKey);
  const selectedEntityColor = selectedEntity
    ? buckets.find((bucket) => bucket.key === selectedEntity.bucket)?.color ?? colors.gold
    : colors.gold;

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
          <Text style={[styles.modeText, { color: mode === "distribution" ? colors.textPrimary : colors.textSecondary }]}>Levels</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "history" }}
          onPress={() => onSelectMode("history")}
          style={[styles.modeTab, mode === "history" && { backgroundColor: colors.surfaceRaised }]}
        >
          <Ionicons name="time-outline" size={14} color={mode === "history" ? colors.gold : colors.textSecondary} />
          <Text style={[styles.modeText, { color: mode === "history" ? colors.textPrimary : colors.textSecondary }]}>Over time</Text>
        </Pressable>
      </View>

      {mode === "distribution" ? (
        <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]}>
          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ARMY READINESS</Text>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                {total === 0 ? "No data yet" : `${remainingLevels} levels to go`}
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                {total === 0 ? "Add progression data to see your army status." : `${maxedCount} of ${total} units maxed · ${readiness}% readiness`}
              </Text>
            </View>
          </View>

          {total === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No army progression data is available for this category.</Text>
          ) : (
            <>
              <View style={styles.completionBlock}>
                <View style={styles.completionLabels}>
                  <Text style={[styles.completionLabel, { color: colors.textSecondary }]}>Level completion</Text>
                  <Text style={[styles.completionValue, { color: colors.textPrimary }]}>{overallCompletion}%</Text>
                </View>
                <View style={[styles.completionTrack, { backgroundColor: colors.surfaceDark }]}>
                  <View style={[styles.completionFill, { width: `${overallCompletion}%`, backgroundColor: colors.success }]} />
                </View>
              </View>
              <View
                accessibilityLabel={`${gridEntities.length} units arranged by level progress`}
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;
                  setGridWidth((currentWidth) => Math.abs(currentWidth - nextWidth) > 1 ? nextWidth : currentWidth);
                }}
                style={styles.grid}
              >
                {gridEntities.map((entity) => {
                  const selected = selectedEntityKey === entity.entityKey;
                  const dimmed = selectedBucket !== null && entity.bucket !== selectedBucket;
                  const bucket = buckets.find((candidate) => candidate.key === entity.bucket);
                  return (
                    <Pressable
                      key={entity.entityKey}
                      accessibilityRole="button"
                      accessibilityLabel={`${entity.name}, level ${entity.level} of ${entity.maxLevel}, ${Math.round(entity.progress * 100)} percent complete`}
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedEntityKey(selected ? null : entity.entityKey)}
                      style={[
                        styles.cell,
                        {
                          width: cellWidth,
                          height: Math.max(23, cellWidth * 1.35),
                          backgroundColor: colors.surfaceDark,
                          borderColor: selected ? bucket?.color ?? colors.gold : colors.borderStrong,
                          opacity: dimmed ? 0.28 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.cellFill,
                          {
                            height: `${Math.round(entity.progress * 100)}%`,
                            backgroundColor: bucket?.color ?? colors.gold,
                          },
                        ]}
                      />
                      {entity.progress >= 0.78 && (
                        <View style={styles.cellMark}>
                          <Ionicons name="checkmark" size={10} color={colors.surfaceDark} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {selectedEntity && (
                <View style={[styles.entityDetail, { backgroundColor: colors.surfaceDark, borderColor: selectedEntityColor }]}>
                  <View style={[styles.entityDetailIcon, { backgroundColor: selectedEntityColor + "22" }]}>
                    <Ionicons name="bar-chart-outline" size={17} color={selectedEntityColor} />
                  </View>
                  <View style={styles.entityDetailCopy}>
                    <Text style={[styles.entityDetailName, { color: colors.textPrimary }]} numberOfLines={1}>{selectedEntity.name}</Text>
                    <Text style={[styles.entityDetailSubtitle, { color: colors.textSecondary }]}>
                      Level {selectedEntity.level}/{selectedEntity.maxLevel} · {selectedEntity.remainingLevels} levels left
                    </Text>
                  </View>
                  <Text style={[styles.entityDetailPercent, { color: selectedEntityColor }]}>{Math.round(selectedEntity.progress * 100)}%</Text>
                </View>
              )}

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
                        styles.filterPill,
                        {
                          borderColor: selected ? bucket.color : colors.borderStrong,
                          backgroundColor: selected ? colors.surfaceDark : "transparent",
                        },
                      ]}
                    >
                      <View style={[styles.filterDot, { backgroundColor: bucket.color }]} />
                      <Text style={[styles.filterText, { color: selected ? bucket.color : colors.textSecondary }]}>
                        {bucket.shortLabel} · {bucket.count}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectedEntityKey(null);
                  onSelectBucket("upgrade");
                }}
                style={[styles.actionRow, { backgroundColor: colors.surfaceDark }]}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.danger + "20" }]}>
                  <Ionicons name="arrow-up" size={16} color={colors.danger} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                    {buckets[2].count > 0 ? `Review ${buckets[2].count} units that need work` : "Your army is fully upgraded"}
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                    {buckets[2].count > 0 ? "Open the breakdown to see what to upgrade next" : "Nothing left in the needs-work category"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
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
  completionBlock: { gap: 7 },
  completionLabels: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  completionLabel: { fontSize: 11, fontWeight: "700" },
  completionValue: { fontSize: 11, fontWeight: "900", fontVariant: ["tabular-nums"] },
  completionTrack: { height: 7, borderRadius: 6, overflow: "hidden" },
  completionFill: { height: "100%", borderRadius: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  cell: { borderWidth: 1, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  cellFill: { position: "absolute", left: 0, right: 0, bottom: 0, borderRadius: 2 },
  cellMark: { position: "absolute", top: 1, right: 1 },
  entityDetail: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 10 },
  entityDetailIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  entityDetailCopy: { flex: 1, gap: 3 },
  entityDetailName: { fontSize: 12, fontWeight: "800" },
  entityDetailSubtitle: { fontSize: 10 },
  entityDetailPercent: { fontSize: 16, fontWeight: "900", fontVariant: ["tabular-nums"] },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  filterPill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { fontSize: 10, fontWeight: "800" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 13, padding: 11 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1, gap: 3 },
  actionTitle: { fontSize: 11, fontWeight: "900" },
  actionSubtitle: { fontSize: 10, lineHeight: 14 },
  emptyText: { fontSize: 12, lineHeight: 18 },
  historyCard: { alignItems: "center", paddingVertical: 24, gap: 12 },
  historyIcon: { width: 66, height: 66, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  historyTitle: { fontSize: 15, fontWeight: "900", textAlign: "center" },
  historyCopy: { fontSize: 12, lineHeight: 19, textAlign: "center" },
  historyNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignSelf: "stretch" },
  historyNoteText: { fontSize: 10, textAlign: "center", flexShrink: 1 },
});
