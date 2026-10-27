import type { ParsedArmyEntity } from "@/utils/profile/parseArmy";
import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { ProgressionQueries } from "@/services/progression/progressionQueries";
import { ResourceType } from "@/types/resource";
import { ResourceIcon, getResourceColor } from "@/components/ResourceCost";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface ProgressionCategory {
  key: string;
  title: string;
  items: ParsedArmyEntity[];
}

export interface ProgressionBreakdownSheetRef {
  present: (categoryKey?: string) => void;
  dismiss: () => void;
}

interface Props {
  categories: ProgressionCategory[];
}

const RESOURCE_LABELS: Record<number, string> = {
  [ResourceType.GOLD]: "Gold",
  [ResourceType.ELIXIR]: "Elixir",
  [ResourceType.DARK_ELIXIR]: "Dark Elixir",
  [ResourceType.BUILDER_GOLD]: "Builder Gold",
  [ResourceType.BUILDER_ELIXIR]: "Builder Elixir",
  [ResourceType.GEMS]: "Gems",
  [ResourceType.SEASON_POINTS]: "Season Points",
  [ResourceType.ORE]: "Ore",
  [ResourceType.GOLD_OR_ELIXIR]: "Gold / Elixir",
  [ResourceType.BUILDER_GOLD_OR_ELIXIR]: "Builder Gold / Elixir",
};

function formatCost(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

function summarize(items: ParsedArmyEntity[]) {
  const costs = new Map<number, number>();
  let remainingLevels = 0;
  let remainingEntities = 0;

  for (const item of items) {
    const remaining = Math.max(0, item.maxLevel - item.level);
    remainingLevels += remaining;
    if (remaining > 0) remainingEntities += 1;
    const progression = ProgressionQueries.getProgression(item.dataId);
    const levels = item.isSuperTroop ? progression?.superTroop?.levels : progression?.levels;
    for (let level = item.level + 1; level <= item.maxLevel; level += 1) {
      const cost = levels?.[level]?.cost;
      if (cost == null || !Number.isFinite(cost)) continue;
      const resource = progression?.resource ?? ResourceType.ELIXIR;
      costs.set(resource, (costs.get(resource) ?? 0) + cost);
    }
  }

  return { remainingLevels, remainingEntities, costs };
}

const ProgressionBreakdownSheet = forwardRef<ProgressionBreakdownSheetRef, Props>(
  function ProgressionBreakdownSheet({ categories }, ref) {
    const colors = useHomeColors();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const sheetRef = useRef<BottomSheetModal>(null);
    const [expanded, setExpanded] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      present: (categoryKey) => {
        setSelectedCategory(categoryKey ?? null);
        setExpanded(categoryKey ? [categoryKey] : []);
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }), []);

    const visibleCategories = selectedCategory
      ? categories.filter((category) => category.key === selectedCategory)
      : categories;
    const visibleItems = visibleCategories.flatMap((category) => category.items);
    const overall = summarize(visibleItems);

    const renderBackdrop = (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} pressBehavior="close" />
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["58%", "90%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheet}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerIcon}><Ionicons name="trending-up" size={18} color={colors.gold} /></View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Remaining progression</Text>
              <Text style={styles.subtitle}>Estimated costs from your current levels</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Levels left</Text>
              <Text style={styles.summaryValue}>{overall.remainingLevels}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>To upgrade</Text>
              <Text style={styles.summaryValue}>{overall.remainingEntities}</Text>
            </View>
          </View>
          <View style={styles.costCard}>
            <Text style={styles.sectionTitle}>Estimated total cost</Text>
            {overall.costs.size === 0 ? (
              <Text style={styles.muted}>Cost data is unavailable for these entities.</Text>
            ) : Array.from(overall.costs.entries()).map(([resource, cost]) => (
              <View key={resource} style={styles.costRow}>
                <View style={styles.resourceLabelGroup}>
                  <ResourceIcon resource={resource as ResourceType} size={20} background />
                  <Text style={[styles.costLabel, { color: getResourceColor(resource as ResourceType, colors) }]}>{RESOURCE_LABELS[resource] ?? "Resource"}</Text>
                </View>
                <Text style={[styles.costValue, { color: getResourceColor(resource as ResourceType, colors) }]}>{formatCost(cost)}</Text>
              </View>
            ))}
          </View>

          {visibleCategories.map((category) => {
            const summary = summarize(category.items);
            const isExpanded = expanded.includes(category.key);
            return (
              <View key={category.key} style={styles.category}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={() => setExpanded((current) => isExpanded ? current.filter((key) => key !== category.key) : [...current, category.key])}
                  style={styles.categoryHeader}
                >
                  <View style={styles.categoryCopy}>
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                    <Text style={styles.muted}>{summary.remainingLevels} levels · {summary.remainingEntities} entities</Text>
                  </View>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                </Pressable>
                {isExpanded && category.items.map((item) => {
                  const remaining = Math.max(0, item.maxLevel - item.level);
                  const detail = summarize([item]);
                  return (
                    <View key={`${category.key}-${item.dataId}-${item.village}-${item.name}`} style={styles.entityRow}>
                      <Image
                        accessibilityLabel={item.name}
                        source={{ uri: resolveEntityIcon(item.dataId, { village: item.village, level: item.level, isSuperTroop: item.isSuperTroop }) }}
                        style={styles.entityIcon}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={120}
                      />
                      <View style={styles.entityCopy}>
                        <Text style={styles.entityName}>{item.name}</Text>
                        <Text style={styles.muted}>Level {item.level}/{item.maxLevel} · {remaining} levels left</Text>
                      </View>
                      <View style={styles.entityCost}>
                        {Array.from(detail.costs.entries()).map(([resource, cost]) => (
                          <View key={resource} style={styles.entityResourceCost}>
                            <ResourceIcon resource={resource as ResourceType} size={14} />
                            <Text style={[styles.entityCostText, { color: getResourceColor(resource as ResourceType, colors) }]}>{formatCost(cost)}</Text>
                          </View>
                        ))}
                        {remaining === 0 && <Text style={styles.maxedText}>MAX</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
          <Text style={styles.disclaimer}>Costs are estimates from the bundled progression dataset. Event discounts and special modifiers are not applied.</Text>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

export default ProgressionBreakdownSheet;

const createStyles = (colors: HomeColors) => StyleSheet.create({
  sheet: { backgroundColor: colors.surfaceDark },
  handleIndicator: { backgroundColor: colors.textMuted },
  content: { paddingHorizontal: 18, paddingBottom: 36, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.textSecondary, fontSize: 12 },
  summaryCard: { flexDirection: "row", backgroundColor: colors.surfaceRaised, borderRadius: 14, padding: 14 },
  summaryCell: { flex: 1, gap: 5 },
  summaryLabel: { color: colors.textSecondary, fontSize: 12 },
  summaryValue: { color: colors.gold, fontSize: 24, fontWeight: "900", fontVariant: ["tabular-nums"] },
  summaryDivider: { width: 1, backgroundColor: colors.borderStrong, marginHorizontal: 12 },
  costCard: { backgroundColor: colors.surfaceRaised, borderRadius: 14, padding: 14, gap: 10 },
  sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "800" },
  costRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resourceLabelGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  costLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  costValue: { color: colors.gold, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  category: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  categoryHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  categoryCopy: { flex: 1, gap: 4 },
  categoryTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "800" },
  muted: { color: colors.textSecondary, fontSize: 11 },
  entityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  entityIcon: { width: 42, height: 42, borderRadius: 9, backgroundColor: colors.surfaceRaised },
  entityCopy: { flex: 1, gap: 4 },
  entityName: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
  entityCost: { alignItems: "flex-end", gap: 3 },
  entityResourceCost: { flexDirection: "row", alignItems: "center", gap: 4 },
  entityCostText: { color: colors.gold, fontSize: 11, fontWeight: "700" },
  maxedText: { color: colors.success, fontSize: 10, fontWeight: "900" },
  disclaimer: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
});

