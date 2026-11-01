import { useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useHomeColors } from "@/theme/useHomeColors";
import { getDefaultPlannerLane } from "@/services/planner/plannerQueueService";
import type {
  PlannerItemId,
  PlannedUpgradeItem,
  PlannerLaneAssignment,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";

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
  editingItemId: PlannerItemId | null;
  targetDrafts: Readonly<Record<string, string>>;
  laneDrafts: Readonly<Record<string, PlannerLaneAssignment>>;
  editErrors: Readonly<Record<string, string>>;
  pendingEdit: { itemId: PlannerItemId; projections: readonly UpgradeProjection[] } | null;
  onConfirmEdit: () => void;
  onCancelPreview: () => void;
  hasEditConflict: boolean;
  onTargetDraftChange: (itemId: PlannerItemId, value: string) => void;
  onLaneDraftChange: (itemId: PlannerItemId, lane: PlannerLaneAssignment) => void;
  onSaveEdit: (item: PlannedUpgradeItem) => void;
  onBeginEdit: (item: PlannedUpgradeItem) => void;
  onCancelEdit: () => void;
  onRemove: (itemId: PlannerItemId) => void;
  onAssignNextBuilder: (itemId: PlannerItemId) => void;
  onMove: (itemId: PlannerItemId, direction: -1 | 1) => void;
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
  editingItemId,
  targetDrafts,
  laneDrafts,
  editErrors,
  pendingEdit,
  onConfirmEdit,
  onCancelPreview,
  hasEditConflict,
  onTargetDraftChange,
  onLaneDraftChange,
  onSaveEdit,
  onBeginEdit,
  onCancelEdit,
  onRemove,
  onAssignNextBuilder,
  onMove,
}: PlannerQueueListProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const projectionByItemId = useMemo(
    () => new Map(projections.map((projection) => [projection.plannedItemId, projection])),
    [projections],
  );

  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>Upgrade queue</Text>
      <Text style={styles.body}>Planned upgrades are separate from live timers. Projections recalculate from the saved queue, validated progression data, current levels, and confirmed active timers.</Text>
      {!!projectionError && <Text accessibilityRole="alert" style={styles.warning}>{projectionError}</Text>}
      {!projectionError && isCalculating && <Text style={styles.muted}>Calculating schedule…</Text>}
      {queueBusy && <Text style={styles.muted}>Saving queue…</Text>}
      {!!queueError && <Text accessibilityRole="alert" style={styles.warning}>{queueError}</Text>}
      {items.length === 0 && <Text style={styles.muted}>No upgrades queued yet.</Text>}
      {items.map((queuedItem) => {
        const projection = projectionByItemId.get(queuedItem.id);
        const candidate = candidates.find((entry) => entry.candidateId === queuedItem.candidateId);
        const isEditing = editingItemId === queuedItem.id;
        return (
          <View key={queuedItem.id} style={styles.queueRow}>
            <View style={styles.itemTitleWrap}>
              <Text style={styles.itemName}>{itemNamesByCandidateId[queuedItem.candidateId] ?? queuedItem.candidateId}{queuedItem.structureInstanceId && structureInstanceNumbersById[queuedItem.structureInstanceId] !== undefined ? ` #${structureInstanceNumbersById[queuedItem.structureInstanceId]}` : ""}</Text>
              <Text style={styles.muted}>Target level {queuedItem.targetLevel} · {queuedItem.lane.lane === "normal-builders" ? `Builder ${queuedItem.lane.builderIndex}` : queuedItem.lane.lane}</Text>
              {isEditing && (
                <View style={styles.queueEditPanel}>
                  <Text style={styles.muted}>Target level</Text>
                  <TextInput
                    accessibilityLabel="Edit target level"
                    keyboardType="number-pad"
                    value={targetDrafts[queuedItem.id] ?? String(queuedItem.targetLevel)}
                    onChangeText={(value) => onTargetDraftChange(queuedItem.id, value)}
                    style={styles.levelInput}
                  />
                  {!candidate || getDefaultPlannerLane(candidate.category).lane !== "normal-builders" ? (
                    <Text style={styles.muted}>Lane is determined by the upgrade category.</Text>
                  ) : (
                    <View style={styles.laneChoiceRow}>
                      {Array.from({ length: builderCount }, (_, index) => index + 1).map((builderIndex) => {
                        const selectedLane = laneDrafts[queuedItem.id] ?? queuedItem.lane;
                        const selected = selectedLane.lane === "normal-builders" && selectedLane.builderIndex === builderIndex;
                        return (
                          <Pressable
                            key={builderIndex}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => onLaneDraftChange(queuedItem.id, { lane: "normal-builders", builderIndex })}
                            style={[styles.laneChoice, selected && styles.laneChoiceSelected]}
                          >
                            <Text style={[styles.removeButtonText, selected && styles.laneChoiceTextSelected]}>Builder {builderIndex}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  {!!editErrors[queuedItem.id] && <Text accessibilityRole="alert" style={styles.warning}>{editErrors[queuedItem.id]}</Text>}
              {pendingEdit?.itemId === queuedItem.id && (
                <View style={styles.queueEditPanel}>
                  <Text style={styles.itemName}>Schedule preview</Text>
                  <Text style={styles.body}>These are projected dates from the proposed queue. Nothing is saved until you confirm.</Text>
                  {pendingEdit.projections.map((preview) => {
                    const previewItem = items.find((item) => item.id === preview.plannedItemId);
                    if (!previewItem) return null;
                    return (
                      <Text key={preview.plannedItemId} style={preview.status === "scheduled" ? styles.body : styles.warning}>
                        {(itemNamesByCandidateId[previewItem.candidateId] ?? previewItem.candidateId) + ": " + formatProjection(preview)}
                      </Text>
                    );
                  })}
                  <View style={styles.queueActions}>
                    <Pressable accessibilityRole="button" disabled={queueBusy} onPress={onConfirmEdit} style={styles.applyButton}>
                      <Text style={styles.applyButtonText}>Confirm and save</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={queueBusy} onPress={onCancelPreview} style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>Cancel preview</Text>
                    </Pressable>
                  </View>
                </View>
              )}
                  <View style={styles.queueActions}>
                    <Pressable accessibilityRole="button" disabled={queueBusy || pendingEdit?.itemId === queuedItem.id} onPress={() => onSaveEdit(queuedItem)} style={styles.applyButton}>
                      <Text style={styles.applyButtonText}>Save changes</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={queueBusy} onPress={onCancelEdit} style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              <Text style={projection?.status === "scheduled" ? styles.body : styles.warning}>{formatProjection(projection)}</Text>
            </View>
            <View style={styles.queueActions}>
              {!isEditing && (
                <Pressable accessibilityRole="button" accessibilityLabel="Edit target level and lane" disabled={queueBusy || hasEditConflict || pendingEdit !== null} onPress={() => onBeginEdit(queuedItem)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>Edit</Text>
                </Pressable>
              )}
              {queuedItem.lane.lane === "normal-builders" && builderCount > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Assign upgrade to next builder; currently Builder ${queuedItem.lane.builderIndex}`}
                  disabled={queueBusy || pendingEdit !== null}
                  onPress={() => onAssignNextBuilder(queuedItem.id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Builder ↻</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" accessibilityLabel="Move upgrade earlier" disabled={queueBusy || pendingEdit !== null || queuedItem.order === 0} onPress={() => onMove(queuedItem.id, -1)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>↑</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Move upgrade later" disabled={queueBusy || pendingEdit !== null} onPress={() => onMove(queuedItem.id, 1)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>↓</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={queueBusy || pendingEdit !== null} onPress={() => onRemove(queuedItem.id)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatProjection(projection: UpgradeProjection | undefined): string {
  if (!projection) return "Schedule not calculated";
  if (projection.status === "scheduled") {
    return `Scheduled · starts ${new Date(projection.startsAtMs).toLocaleString()} · finishes ${new Date(projection.completesAtMs).toLocaleString()}`;
  }
  if (projection.status === "unknown") {
    const reason = projection.reasons[0];
    if (reason?.code === "estimate-unknown") {
      return `Unknown estimate · ${reason.estimate} data unavailable`;
    }
    if (reason?.code === "prerequisite-unknown") {
      return "Level unknown · enter or sync the prerequisite level to calculate this upgrade";
    }
    return "Unknown estimate";
  }
  const reason = projection.reasons[0];
  if (!reason) return "Blocked · reason unavailable";
  switch (reason.code) {
    case "candidate-unavailable": return "Blocked · progression candidate unavailable (sync game data or update this queue item)";
    case "lane-unavailable": return "Blocked · assigned lane is occupied or unavailable";
    case "lane-ineligible": return "Blocked · Goblin lane eligibility is not confirmed";
    case "prerequisite-unmet": return "Blocked · prerequisite level is not met or confirmed";
    case "prerequisite-unknown": return "Blocked · enter or sync the prerequisite level to calculate this upgrade";
    case "invalid-target-level": return "Blocked · target level is outside the validated candidate range";
    case "dependency-cycle": return "Blocked · planned upgrades contain a dependency cycle";
    case "estimate-unknown": return "Unknown estimate · game data is incomplete";
  }
}
function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    stateCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
    stateTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
    body: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    muted: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
    itemTitleWrap: { flex: 1 },
    itemName: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    warning: { color: colors.orangeLight, fontSize: 12, lineHeight: 17 },
    levelInput: { width: 64, color: colors.textPrimary, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, textAlign: "center" },
    applyButton: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
    applyButtonText: { color: colors.textDark, fontSize: 11, fontWeight: "800" },
    queueRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    queueActions: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
    queueEditPanel: { gap: 8, paddingTop: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
    laneChoiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    laneChoice: { borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
    laneChoiceSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
    laneChoiceTextSelected: { color: colors.textDark },
    removeButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
    removeButtonText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700" },
  });
}
