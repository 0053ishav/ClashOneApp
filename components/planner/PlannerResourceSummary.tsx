import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getResourceColor } from "@/components/ResourceCost";
import { useHomeColors } from "@/theme/useHomeColors";
import { ResourceType } from "@/types/resource";
import type { PlannerViewModel } from "@/utils/planner/plannerViewModel";

interface PlannerResourceSummaryProps {
  viewModel: PlannerViewModel;
}

export function PlannerResourceSummary({ viewModel }: PlannerResourceSummaryProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const totals = [
    { resource: ResourceType.GOLD, label: "Gold", amount: viewModel.resourceTotals.gold },
    { resource: ResourceType.ELIXIR, label: "Elixir", amount: viewModel.resourceTotals.elixir },
    { resource: ResourceType.DARK_ELIXIR, label: "Dark elixir", amount: viewModel.resourceTotals.darkElixir },
  ].filter((entry) => entry.amount > 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Resource summary</Text>
      <Text style={styles.subtitle}>Known costs for scheduled upgrades only.</Text>
      <View
        accessibilityLabel={`Partial resource total, ${viewModel.unknownScheduledCostCount} unknown`}
        accessibilityRole="progressbar"
        style={styles.bar}
      >
        {totals.map((entry) => (
          <View
            key={entry.resource}
            style={[
              styles.segment,
              { flex: 1, backgroundColor: getResourceColor(entry.resource, colors) },
            ]}
          />
        ))}
        {viewModel.unknownScheduledCostCount > 0 && (
          <View
            style={[
              styles.segment,
              styles.unknownSegment,
              { flex: 1 },
            ]}
          />
        )}
        {totals.length === 0 && viewModel.unknownScheduledCostCount === 0 && (
          <View style={styles.emptySegment} />
        )}
      </View>
      {totals.map((entry) => (
        <View key={entry.resource} style={styles.totalRow}>
          <View style={[styles.dot, { backgroundColor: getResourceColor(entry.resource, colors) }]} />
          <Text style={styles.label}>{entry.label}</Text>
          <Text style={styles.value}>{formatResource(entry.amount)}</Text>
        </View>
      ))}
      <Text style={styles.partial}>
        Partial total, {viewModel.unknownScheduledCostCount} unknown
      </Text>
    </View>
  );
}

function formatResource(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      gap: 9,
    },
    title: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
    subtitle: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
    bar: {
      height: 14,
      flexDirection: "row",
      overflow: "hidden",
      borderRadius: 7,
      backgroundColor: colors.background,
    },
    segment: { minWidth: 2 },
    unknownSegment: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.textMuted,
    },
    emptySegment: { flex: 1, backgroundColor: colors.surfaceRaised },
    totalRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    dot: { width: 9, height: 9, borderRadius: 5 },
    label: { flex: 1, color: colors.textSecondary, fontSize: 12 },
    value: { color: colors.textPrimary, fontSize: 12, fontWeight: "700" },
    partial: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  });
}
