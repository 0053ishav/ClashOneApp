import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConfirmModal } from "@/components/ConfirmModal";
import { getDefaultPlannerLane } from "@/services/planner/plannerQueueService";
import { useHomeColors } from "@/theme/useHomeColors";
import type {
  PlannerLaneAssignment,
  PlannedUpgradeItem,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";
import { getPlannerViewModel } from "@/utils/planner/plannerViewModel";

interface PlannerQueueEditSheetProps {
  visible: boolean;
  item: PlannedUpgradeItem | null;
  candidate: ProgressionCandidate | undefined;
  name: string;
  itemsBefore: readonly PlannedUpgradeItem[];
  itemsAfter: readonly PlannedUpgradeItem[];
  projectionsBefore: readonly UpgradeProjection[];
  projectionsAfter: readonly UpgradeProjection[];
  targetDraft: string;
  laneDraft: PlannerLaneAssignment | undefined;
  orderDraft: number | undefined;
  builderCount: number;
  maximumTargetLevel: number;
  editError: string | undefined;
  queueError: string | null;
  queueBusy: boolean;
  previewing: boolean;
  saving: boolean;
  onTargetChange: (value: string) => void;
  onLaneChange: (lane: PlannerLaneAssignment) => void;
  onMove: (direction: -1 | 1) => void;
  onSave: () => void;
  onConfirmSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

function laneKey(lane: PlannerLaneAssignment): string {
  return lane.lane === "normal-builders"
    ? `normal-builders:${lane.builderIndex}`
    : lane.lane;
}

function laneLabel(lane: PlannerLaneAssignment): string {
  return lane.lane === "normal-builders"
    ? `Builder ${lane.builderIndex}`
    : lane.lane === "pets"
      ? "Pet House"
      : lane.lane === "laboratory"
        ? "Laboratory"
        : lane.lane;
}

function eligibleLanes(
  candidate: ProgressionCandidate | undefined,
  builderCount: number,
): PlannerLaneAssignment[] {
  if (!candidate) return [];
  const defaultLane = getDefaultPlannerLane(candidate.category);
  if (defaultLane.lane !== "normal-builders") return [defaultLane];
  return Array.from({ length: Math.max(0, builderCount) }, (_, index) => ({
    lane: "normal-builders" as const,
    builderIndex: index + 1,
  }));
}

function dateLabel(projection: UpgradeProjection | undefined): string {
  if (projection?.status !== "scheduled") return "Not scheduled";
  return new Date(projection.startsAtMs).toLocaleString();
}

function finishLabel(timestampMs: number | null): string {
  return timestampMs === null ? "Not scheduled" : new Date(timestampMs).toLocaleString();
}

export function PlannerQueueEditSheet({
  visible,
  item,
  candidate,
  name,
  itemsBefore,
  itemsAfter,
  projectionsBefore,
  projectionsAfter,
  targetDraft,
  laneDraft,
  orderDraft,
  builderCount,
  maximumTargetLevel,
  editError,
  queueError,
  queueBusy,
  previewing,
  saving,
  onTargetChange,
  onLaneChange,
  onMove,
  onSave,
  onConfirmSave,
  onCancel,
  onRemove,
}: PlannerQueueEditSheetProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => {
    if (!visible) setConfirmRemove(false);
  }, [visible]);
  const choices = eligibleLanes(candidate, builderCount);
  const selectedLane = laneDraft ?? item?.lane;
  const targetLevel = Number(targetDraft);
  const minimumLevel = candidate ? candidate.currentLevel + 1 : 1;
  const maximumLevel = maximumTargetLevel;
  const canDecrement = Number.isSafeInteger(targetLevel) && targetLevel > minimumLevel;
  const canIncrement = Number.isSafeInteger(targetLevel) && targetLevel < maximumLevel;
  const originalItem = item;
  const revisedItem = item ? itemsAfter.find((entry) => entry.id === item.id) : undefined;
  const currentOrder = originalItem?.order ?? 0;
  const desiredOrder = orderDraft ?? currentOrder;
  const afterSameLaneCount = revisedItem
    ? itemsAfter.filter((entry) => laneKey(entry.lane) === laneKey(revisedItem.lane)).length
    : 0;
  const beforeModel = getPlannerViewModel(projectionsBefore, itemsBefore.length);
  const afterModel = getPlannerViewModel(projectionsAfter, itemsAfter.length);
  const beforeById = new Map(projectionsBefore.map((projection) => [projection.plannedItemId, projection]));
  const beforeItemById = new Map(itemsBefore.map((entry) => [entry.id, entry]));
  const afterItemById = new Map(itemsAfter.map((entry) => [entry.id, entry]));
  const changedStarts = projectionsAfter.filter((after) => {
    const before = beforeById.get(after.plannedItemId);
    if (before?.status !== "scheduled" && after.status !== "scheduled") return false;
    return dateLabel(before) !== dateLabel(after);
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{previewing ? "BEFORE SAVING" : "EDIT PLANNED UPGRADE"}</Text>
              <Text style={styles.title}>{name}</Text>
              <Text style={styles.subtitle}>
                Level {candidate?.currentLevel ?? "unknown"} → {targetDraft || "—"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel upgrade edit"
              disabled={queueBusy}
              onPress={onCancel}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {!previewing && (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Target level</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease target level"
                    disabled={queueBusy || !canDecrement}
                    onPress={() => onTargetChange(String(targetLevel - 1))}
                    style={styles.stepperButton}
                  >
                    <Text style={styles.stepperText}>−</Text>
                  </Pressable>
                  <Text style={styles.targetValue}>{targetDraft}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase target level"
                    disabled={queueBusy || !canIncrement}
                    onPress={() => onTargetChange(String(targetLevel + 1))}
                    style={styles.stepperButton}
                  >
                    <Text style={styles.stepperText}>+</Text>
                  </Pressable>
                </View>
                <Text style={styles.muted}>Available range: {minimumLevel}–{maximumLevel}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Eligible lane</Text>
                {choices.length === 0 ? (
                  <Text style={styles.warning}>No eligible lane is available for this account.</Text>
                ) : (
                  <View style={styles.choices}>
                    {choices.map((lane) => {
                      const selected = selectedLane !== undefined &&
                        laneKey(selectedLane) === laneKey(lane);
                      return (
                        <Pressable
                          key={laneKey(lane)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          disabled={queueBusy}
                          onPress={() => onLaneChange(lane)}
                          style={[styles.choice, selected && styles.selectedChoice]}
                        >
                          <Text style={[styles.choiceText, selected && styles.selectedChoiceText]}>
                            {laneLabel(lane)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Queue position</Text>
                <Text style={styles.body}>
                  {selectedLane ? laneLabel(selectedLane) : "Lane"} · {desiredOrder + 1} of {Math.max(1, afterSameLaneCount)}
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={queueBusy || desiredOrder <= 0}
                    onPress={() => onMove(-1)}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Move earlier</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={queueBusy || desiredOrder >= afterSameLaneCount - 1}
                    onPress={() => onMove(1)}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Move later</Text>
                  </Pressable>
                </View>
              </View>

              {!!editError && <Text accessibilityRole="alert" style={styles.warning}>{editError}</Text>}
              {!!queueError && <Text accessibilityRole="alert" style={styles.warning}>{queueError}</Text>}
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={queueBusy}
                  onPress={onSave}
                  style={[styles.primaryButton, queueBusy && styles.disabled]}
                >
                  <Text style={styles.primaryText}>Review before saving</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={queueBusy}
                  onPress={() => setConfirmRemove(true)}
                  style={[styles.removeButton, queueBusy && styles.disabled]}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </>
          )}

          {previewing && item && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Before saving</Text>
              <View style={styles.finishBox}>
                <Text style={styles.label}>Plan finish</Text>
                <Text style={styles.body}>Before: {finishLabel(beforeModel.projectedFinishMs)}</Text>
                <Text style={styles.body}>After: {finishLabel(afterModel.projectedFinishMs)}</Text>
                <Text style={styles.body}>
                  Finish change: {formatFinishDelta(beforeModel.projectedFinishMs, afterModel.projectedFinishMs)}
                </Text>
              </View>
              <Text style={styles.label}>Changed start dates</Text>
              {changedStarts.length === 0 ? (
                <Text style={styles.body}>No other start dates change.</Text>
              ) : changedStarts.map((after) => {
                const id = after.plannedItemId;
                const before = beforeById.get(id);
                const beforeItem = beforeItemById.get(id);
                const afterItem = afterItemById.get(id);
                const movedItem = afterItem ?? beforeItem;
                const sharedLane = movedItem !== undefined && revisedItem !== undefined &&
                  laneKey(movedItem.lane) === laneKey(revisedItem.lane);
                return (
                  <View key={id} style={styles.changeRow}>
                    <Text style={styles.body}>
                      {beforeItem?.candidateId ?? afterItem?.candidateId ?? "Upgrade"}
                    </Text>
                    <Text style={styles.muted}>
                      {dateLabel(before)} → {dateLabel(after)}
                    </Text>
                    {id !== item.id && (
                      <Text style={styles.reason}>
                        {sharedLane ? "Reason: shares the same lane." : "Reason: queue order or a prerequisite changed."}
                      </Text>
                    )}
                  </View>
                );
              })}
              {!!editError && <Text accessibilityRole="alert" style={styles.warning}>{editError}</Text>}
              {!!queueError && <Text accessibilityRole="alert" style={styles.warning}>{queueError}</Text>}
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={queueBusy}
                  onPress={onConfirmSave}
                  style={[styles.primaryButton, queueBusy && styles.disabled]}
                >
                  <Text style={styles.primaryText}>{saving ? "Saving…" : "Save"}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={queueBusy}
                  onPress={onCancel}
                  style={[styles.secondaryButton, queueBusy && styles.disabled]}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={queueBusy}
                  onPress={() => setConfirmRemove(true)}
                  style={[styles.removeButton, queueBusy && styles.disabled]}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <ConfirmModal
        visible={confirmRemove}
        title="Remove upgrade?"
        message={`Remove ${name} from the plan?`}
        confirmText="Remove"
        cancelText="Cancel"
        destructive
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
      />
    </Modal>
  );
}

function formatFinishDelta(before: number | null, after: number | null): string {
  if (before === null || after === null) {
    return before === after ? "No change" : "Unknown";
  }
  const difference = after - before;
  if (difference === 0) return "No change";
  const hours = Math.round(Math.abs(difference) / 3_600_000);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const value = days > 0
    ? `${days}d ${remainingHours}h`
    : `${hours}h`;
  return difference > 0 ? `Later by ${value}` : `Earlier by ${value}`;
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, padding: 18, paddingBottom: 32, gap: 12 },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    headerCopy: { flex: 1, gap: 4 },
    eyebrow: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    title: { color: colors.textPrimary, fontSize: 21, fontWeight: "800" },
    subtitle: { color: colors.textSecondary, fontSize: 13 },
    closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
    closeText: { color: colors.textPrimary, fontSize: 24, lineHeight: 27 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
    sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "800" },
    stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
    stepperButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
    stepperText: { color: colors.textPrimary, fontSize: 23, fontWeight: "700" },
    targetValue: { minWidth: 48, color: colors.textPrimary, fontSize: 23, fontWeight: "800", textAlign: "center" },
    muted: { color: colors.textMuted, fontSize: 11 },
    choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    choice: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 12 },
    selectedChoice: { backgroundColor: colors.gold, borderColor: colors.gold },
    choiceText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    selectedChoiceText: { color: colors.textDark },
    body: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    primaryButton: { minHeight: 46, justifyContent: "center", backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 16 },
    primaryText: { color: colors.textDark, fontSize: 12, fontWeight: "800" },
    secondaryButton: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 12 },
    secondaryText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    removeButton: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: colors.danger, borderRadius: 9, paddingHorizontal: 12 },
    removeText: { color: colors.danger, fontSize: 12, fontWeight: "700" },
    disabled: { opacity: 0.5 },
    warning: { color: colors.orangeLight, fontSize: 12, lineHeight: 17 },
    finishBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, gap: 4 },
    label: { color: colors.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
    changeRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 3 },
    reason: { color: colors.textMuted, fontSize: 11 },
  });
}
