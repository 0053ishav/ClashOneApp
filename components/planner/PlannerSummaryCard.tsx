import { StyleSheet, Text, View } from "react-native";
import { useHomeColors } from "@/theme/useHomeColors";
import type {
  ObservedActiveUpgrade,
  PlannedUpgradeItem,
  UpgradeProjection,
} from "@/types/planner";
import { getPlannerViewModel } from "@/utils/planner/plannerViewModel";

interface PlannerSummaryCardProps {
  items: readonly PlannedUpgradeItem[];
  projections: readonly UpgradeProjection[];
  liveUpgrades?: readonly ObservedActiveUpgrade[];
}

function formatFinish(timestamp: number | null): string {
  return timestamp === null
    ? "Not scheduled"
    : new Date(timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export function PlannerSummaryCard({
  items,
  projections,
  liveUpgrades = [],
}: PlannerSummaryCardProps) {
  const colors = useHomeColors();
  const styles = createStyles(colors);
  const summary = getPlannerViewModel(projections, items.length);
  const lanesInUse = new Set([
    ...items.map((item) => laneKey(item.lane)),
    ...liveUpgrades.map((upgrade) => laneKey(upgrade.lane)),
  ]).size;

  return (
    <View style={styles.card}>
      <View style={styles.cell}>
        <Text style={styles.label}>Queued actions</Text>
        <Text style={styles.value}>{items.length}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.label}>Projected finish estimate</Text>
        <Text style={styles.value}>
          {items.length === 0
            ? "No plan yet"
            : summary.unknownDurationCount > 0
              ? "Finish covers known work only"
            : summary.hasIncompleteWork
              ? "Estimate incomplete"
              : formatFinish(summary.projectedFinishMs)}
        </Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.label}>Lanes in use</Text>
        <Text style={styles.value}>{lanesInUse}</Text>
      </View>
      <Text style={styles.status}>
        {summary.scheduledProjections.length} scheduled · {summary.blockedCount} blocked · {summary.unknownCount} unknown
      </Text>
    </View>
  );
}

function laneKey(lane: PlannedUpgradeItem["lane"] | ObservedActiveUpgrade["lane"]): string {
  return lane.lane === "normal-builders" ? `normal-builders:${lane.builderIndex}` : lane.lane;
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
    },
    cell: { flex: 1, minWidth: 110, gap: 4 },
    label: { color: colors.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    value: { color: colors.textPrimary, fontSize: 14, fontWeight: "800" },
    status: { width: "100%", color: colors.textSecondary, fontSize: 12 },
  });
}
