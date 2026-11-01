import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useHomeColors } from "@/theme/useHomeColors";
import { PlannerSnapshotReview } from "@/components/planner/PlannerSnapshotReview";
import { PlannerResourceSummary } from "@/components/planner/PlannerResourceSummary";
import type {
  ObservedActiveUpgrade,
  PlannedUpgradeItem,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";
import { getPlannerViewModel } from "@/utils/planner/plannerViewModel";
import type { PlannerSnapshotReviewProps } from "@/components/planner/PlannerSnapshotReview";

interface PlannerDetailsViewProps {
  items: readonly PlannedUpgradeItem[];
  projections: readonly UpgradeProjection[];
  candidates: readonly ProgressionCandidate[];
  entityNamesById: Readonly<Record<string, string>>;
  liveUpgrades: readonly ObservedActiveUpgrade[];
  builderCount: number;
  snapshotReview: PlannerSnapshotReviewProps;
}

function laneKey(lane: PlannedUpgradeItem["lane"] | ObservedActiveUpgrade["lane"]): string {
  return lane.lane === "normal-builders"
    ? `normal-builders:${lane.builderIndex}`
    : lane.lane;
}

function laneLabel(lane: PlannedUpgradeItem["lane"]): string {
  return lane.lane === "normal-builders" ? `Builder ${lane.builderIndex}` : lane.lane;
}

export function PlannerDetailsView({
  items,
  projections,
  candidates,
  entityNamesById,
  liveUpgrades,
  builderCount,
  snapshotReview,
}: PlannerDetailsViewProps) {
  const colors = useHomeColors();
  const styles = createStyles(colors);
  const viewModel = getPlannerViewModel(projections, items.length);
  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.candidateId, candidate])),
    [candidates],
  );
  const projectionByItemId = useMemo(
    () => new Map(projections.map((projection) => [projection.plannedItemId, projection])),
    [projections],
  );
  const laneEntries = useMemo(() => {
    const groups = new Map<string, { label: string; items: PlannedUpgradeItem[] }>();
    for (const item of [...items].sort((a, b) => a.order - b.order || a.createdAtMs - b.createdAtMs)) {
      const key = laneKey(item.lane);
      const group = groups.get(key) ?? { label: laneLabel(item.lane), items: [] };
      group.items.push(item);
      groups.set(key, group);
    }
    return [...groups.values()];
  }, [items]);
  const activeLaneCount = new Set([
    ...items.map((item) => laneKey(item.lane)),
    ...liveUpgrades.map((upgrade) => laneKey(upgrade.lane)),
  ]).size;
  return (
    <View style={styles.container}>
      <PlannerSnapshotReview {...snapshotReview} />

      <View style={styles.card}>
        <Text style={styles.title}>Plan details</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCell}>
            <Text style={styles.label}>Queued actions</Text>
            <Text style={styles.value}>{items.length}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.label}>Live timers locked</Text>
            <Text style={styles.value}>{liveUpgrades.length}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.label}>Active lanes</Text>
            <Text style={styles.value}>{activeLaneCount}</Text>
          </View>
        </View>
        {laneEntries.length > 0 && (
          <View style={styles.laneList}>
            {laneEntries.map((lane) => (
              <View key={lane.label} style={styles.laneRow}>
                <Text style={styles.body}>{lane.label}</Text>
                <Text style={styles.body}>{lane.items.length} {lane.items.length === 1 ? "upgrade" : "upgrades"}</Text>
              </View>
            ))}
          </View>
        )}
        {laneEntries.length > 0 && (
          <View style={styles.sequence}>
            <Text style={styles.sectionTitle}>Upgrade sequence</Text>
            {laneEntries.map((lane) => (
              <View key={`${lane.label}-sequence`} style={styles.sequenceLane}>
                <Text style={styles.label}>{lane.label}</Text>
                {lane.items.map((item, index) => {
                  const candidate = candidateById.get(item.candidateId);
                  const name = candidate
                    ? entityNamesById[candidate.entityId] ?? item.candidateId
                    : item.candidateId;
                  const projection = projectionByItemId.get(item.id);
                  const startDate = projection?.status === "scheduled"
                    ? new Date(projection.startsAtMs).toLocaleString()
                    : "Not scheduled";
                  return (
                    <View key={item.id} style={styles.sequenceRow}>
                      <Text style={styles.body}>{index + 1}. {name} → level {item.targetLevel}</Text>
                      <Text style={styles.muted}>Starts {startDate}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
        <Text style={styles.assumption}>
          Scheduling follows queue order within each lane. Different lanes may progress in parallel. Live timers reserve their lanes and are never changed by this plan.
        </Text>
        <View style={styles.sequence}>
          <Text style={styles.sectionTitle}>Assumptions</Text>
          <Text style={styles.body}>No boosts are applied to upgrade durations.</Text>
          <Text style={styles.body}>Builder count: {builderCount} from the saved account profile.</Text>
          <Text style={styles.body}>Live timers occupy their lane until their recorded completion time.</Text>
        </View>
      </View>

      <PlannerResourceSummary viewModel={viewModel} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    container: { gap: 12 },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    title: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
    sectionTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
    summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    summaryCell: { flex: 1, minWidth: 90, gap: 4 },
    label: { color: colors.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    value: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
    body: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    muted: { color: colors.textMuted, fontSize: 11 },
    laneList: { gap: 6 },
    laneRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    sequence: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 8 },
    sequenceLane: { gap: 3 },
    sequenceRow: { gap: 2 },
    assumption: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  });
}
