import { useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useHomeColors } from "@/theme/useHomeColors";
import type {
  PlannerItemId,
  PlannedUpgradeItem,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";

export type PlannerQueueFilter = "all" | "blocked" | "unknown-duration";

export interface PlannerQueueListProps {
  items: readonly PlannedUpgradeItem[];
  projections: readonly UpgradeProjection[];
  candidates: readonly ProgressionCandidate[];
  itemNamesByCandidateId: Readonly<Record<string, string>>;
  structureInstanceNumbersById: Readonly<Record<string, number>>;
  builderCount: number;
  queueBusy: boolean;
  queueError: string | null;
  projectionError: string | null;
  isCalculating: boolean;
  statusFilter?: PlannerQueueFilter;
  editBusy?: boolean;
  onLayout?: (layoutY: number) => void;
  onBeginEdit: (item: PlannedUpgradeItem) => void;
  onRemove: (itemId: PlannerItemId) => void;
  onAssignNextBuilder: (itemId: PlannerItemId) => void;
  onMove: (itemId: PlannerItemId, direction: -1 | 1) => void;
}

function laneKey(lane: PlannedUpgradeItem["lane"]): string {
  return lane.lane === "normal-builders"
    ? `normal-builders:${lane.builderIndex}`
    : lane.lane;
}

function laneLabel(lane: PlannedUpgradeItem["lane"]): string {
  return lane.lane === "normal-builders" ? `Builder ${lane.builderIndex}` : lane.lane;
}

function projectionStatus(projection: UpgradeProjection | undefined): {
  label: string;
  kind: "scheduled" | "blocked" | "unknown" | "pending";
} {
  if (!projection) return { label: "Not calculated", kind: "pending" };
  if (projection.status === "scheduled") return { label: "Scheduled", kind: "scheduled" };
  if (projection.status === "blocked") return { label: "Blocked", kind: "blocked" };
  return { label: "Unknown", kind: "unknown" };
}

export function PlannerQueueList({
  items,
  projections,
  candidates,
  itemNamesByCandidateId,
  structureInstanceNumbersById,
  builderCount,
  queueBusy,
  queueError,
  projectionError,
  isCalculating,
  statusFilter = "all",
  editBusy = false,
  onLayout,
  onBeginEdit,
  onRemove,
  onAssignNextBuilder,
  onMove,
}: PlannerQueueListProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [removeTarget, setRemoveTarget] = useState<PlannerItemId | null>(null);
  const projectionByItemId = useMemo(
    () => new Map(projections.map((projection) => [projection.plannedItemId, projection])),
    [projections],
  );
  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.candidateId, candidate])),
    [candidates],
  );
  const visibleItems = items.filter((item) => {
    if (statusFilter === "all") return true;
    const projection = projectionByItemId.get(item.id);
    return statusFilter === "blocked"
      ? projection?.status === "blocked"
      : projection?.status === "unknown" &&
        projection.reasons.some(
          (reason) => reason.code === "estimate-unknown" && reason.estimate === "duration",
        );
  });
  const removeItem = items.find((item) => item.id === removeTarget);
  const actionsDisabled = queueBusy || editBusy;

  return (
    <View
      style={styles.stateCard}
      onLayout={(event: LayoutChangeEvent) => onLayout?.(event.nativeEvent.layout.y)}
    >
      <View style={styles.header}>
        <Text style={styles.stateTitle}>Upgrade queue</Text>
        <Text style={styles.muted}>{visibleItems.length} / {items.length}</Text>
      </View>
      <Text style={styles.body}>
        Planned upgrades are separate from live timers. Projections recalculate from the saved queue, validated progression data, current levels, and confirmed active timers.
      </Text>
      {!!projectionError && <Text accessibilityRole="alert" style={styles.warning}>{projectionError}</Text>}
      {!projectionError && isCalculating && <Text style={styles.muted}>Calculating schedule…</Text>}
      {queueBusy && <Text style={styles.muted}>Saving queue…</Text>}
      {!!queueError && <Text accessibilityRole="alert" style={styles.warning}>{queueError}</Text>}
      {visibleItems.length === 0 && (
        <Text style={styles.muted}>
          {statusFilter === "all"
            ? "No upgrades queued yet."
            : statusFilter === "unknown-duration"
              ? "No unknown-duration upgrades in this plan."
              : "No blocked upgrades in this plan."}
        </Text>
      )}
      {visibleItems.map((queuedItem) => {
        const projection = projectionByItemId.get(queuedItem.id);
        const candidate = candidateById.get(queuedItem.candidateId);
        const status = projectionStatus(projection);
        const name = itemNamesByCandidateId[queuedItem.candidateId] ?? queuedItem.candidateId;
        const instanceNumber = queuedItem.structureInstanceId
          ? structureInstanceNumbersById[queuedItem.structureInstanceId]
          : undefined;
        const sameLaneItems = items
          .filter((item) => laneKey(item.lane) === laneKey(queuedItem.lane))
          .sort((left, right) => left.order - right.order || left.createdAtMs - right.createdAtMs);
        const orderIndex = sameLaneItems.findIndex((item) => item.id === queuedItem.id);
        return (
          <View key={queuedItem.id} style={styles.queueRow}>
            <View style={styles.queueCopy}>
              <Text numberOfLines={1} style={styles.itemName}>
                {name}{instanceNumber !== undefined ? ` #${instanceNumber}` : ""}
              </Text>
              <Text style={styles.muted}>
                Level {candidate?.currentLevel ?? "unknown"} → {queuedItem.targetLevel} · {laneLabel(queuedItem.lane)}
              </Text>
              {projection?.status === "scheduled" && (
                <Text style={styles.muted}>
                  Starts {new Date(projection.startsAtMs).toLocaleDateString()}
                </Text>
              )}
            </View>
            <View style={[styles.statusChip, styles[`${status.kind}Chip`]]}>
              <Text style={[styles.statusText, styles[`${status.kind}Text`]]}>{status.label}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit planned upgrade"
                disabled={actionsDisabled || editBusy}
                onPress={() => onBeginEdit(queuedItem)}
                style={styles.actionButton}
              >
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
              {queuedItem.lane.lane === "normal-builders" && builderCount > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Assign upgrade to next builder; currently Builder ${queuedItem.lane.builderIndex}`}
                  disabled={actionsDisabled}
                  onPress={() => onAssignNextBuilder(queuedItem.id)}
                  style={styles.iconButton}
                >
                  <Text style={styles.actionText}>↻</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Move upgrade earlier"
                disabled={actionsDisabled || orderIndex <= 0}
                onPress={() => onMove(queuedItem.id, -1)}
                style={styles.iconButton}
              >
                <Text style={styles.actionText}>↑</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Move upgrade later"
                disabled={actionsDisabled || orderIndex < 0 || orderIndex >= sameLaneItems.length - 1}
                onPress={() => onMove(queuedItem.id, 1)}
                style={styles.iconButton}
              >
                <Text style={styles.actionText}>↓</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove planned upgrade"
                disabled={actionsDisabled}
                onPress={() => setRemoveTarget(queuedItem.id)}
                style={styles.iconButton}
              >
                <Text style={styles.actionText}>×</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <ConfirmModal
        visible={removeItem !== undefined}
        title="Remove upgrade?"
        message={removeItem ? `Remove ${itemNamesByCandidateId[removeItem.candidateId] ?? removeItem.candidateId} from the plan?` : ""}
        confirmText="Remove"
        cancelText="Cancel"
        destructive
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) onRemove(removeTarget);
          setRemoveTarget(null);
        }}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    stateCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      gap: 8,
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    stateTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
    body: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    muted: { color: colors.textMuted, fontSize: 11 },
    warning: { color: colors.orangeLight, fontSize: 12, lineHeight: 17 },
    queueRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 7,
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    queueCopy: { flex: 1, minWidth: 110, gap: 2 },
    itemName: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
    statusChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
    scheduledChip: { borderColor: colors.success, backgroundColor: colors.success + "18" },
    blockedChip: { borderColor: colors.danger, backgroundColor: colors.danger + "18" },
    unknownChip: { borderColor: colors.textMuted, backgroundColor: colors.background },
    pendingChip: { borderColor: colors.border, backgroundColor: colors.background },
    statusText: { fontSize: 10, fontWeight: "800" },
    scheduledText: { color: colors.success },
    blockedText: { color: colors.danger },
    unknownText: { color: colors.textMuted },
    pendingText: { color: colors.textMuted },
    actions: { flexDirection: "row", alignItems: "center", gap: 3 },
    actionButton: {
      minHeight: 40,
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 9,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    actionText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700" },
  });
}
