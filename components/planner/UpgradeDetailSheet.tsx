import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useHomeColors } from "@/theme/useHomeColors";
import type {
  PlannerBlockReason,
  PlannedUpgradeItem,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";

interface UpgradeDetailSheetProps {
  visible: boolean;
  item: PlannedUpgradeItem;
  candidate: ProgressionCandidate | undefined;
  projection: UpgradeProjection | undefined;
  name: string;
  queueBusy: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

function laneLabel(item: PlannedUpgradeItem): string {
  const lane = item.lane;
  switch (lane.lane) {
    case "normal-builders": return `Builder ${lane.builderIndex}`;
    case "laboratory": return "Laboratory";
    case "pets": return "Pet House";
    case "goblin-builder": return "Goblin Builder";
    case "goblin-laboratory": return "Goblin Laboratory";
  }
}

function blockerLabel(reason: PlannerBlockReason | undefined): string {
  if (!reason) return "No blocker reason was provided by the scheduler.";
  switch (reason.code) {
    case "prerequisite-unmet": return "A required upgrade level is not met or confirmed.";
    case "lane-unavailable": return `${reason.lane} is occupied or unavailable.`;
    case "lane-ineligible": return reason.detail;
    case "estimate-unknown": return `The ${reason.estimate} estimate is unknown (${reason.reason}).`;
    case "invalid-target-level": return `Target level ${reason.targetLevel} is outside the validated range.`;
    case "candidate-unavailable": return "This upgrade is missing from the current progression catalog.";
    case "dependency-cycle": return "The queue contains a dependency cycle.";
  }
}

function costLabel(candidate: ProgressionCandidate | undefined, projection: UpgradeProjection | undefined): string {
  const estimate = projection?.status === "scheduled" ? projection.estimate : candidate?.estimate;
  if (!estimate || estimate.cost.status === "unknown") return "Cost unknown";
  const cost = estimate.cost.value;
  const parts = [
    cost.gold ? `${new Intl.NumberFormat().format(cost.gold)} Gold` : null,
    cost.elixir ? `${new Intl.NumberFormat().format(cost.elixir)} Elixir` : null,
    cost.darkElixir ? `${new Intl.NumberFormat().format(cost.darkElixir)} Dark Elixir` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "No resource cost recorded";
}

function statusLabel(projection: UpgradeProjection | undefined): string {
  if (!projection) return "Not calculated";
  if (projection.status === "scheduled") return "Scheduled";
  if (projection.status === "blocked") return "Blocked";
  return "Estimate unknown";
}

export function UpgradeDetailSheet({
  visible,
  item,
  candidate,
  projection,
  name,
  queueBusy,
  onClose,
  onEdit,
  onRemove,
}: UpgradeDetailSheetProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["62%", "88%"], []);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const status = statusLabel(projection);
  const start = projection?.status === "scheduled" ? new Date(projection.startsAtMs).toLocaleString() : null;
  const finish = projection?.status === "scheduled" ? new Date(projection.completesAtMs).toLocaleString() : null;
  const blocker = projection && projection.status !== "scheduled" ? blockerLabel(projection.reasons[0]) : null;

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior="interactive"
      accessibilityViewIsModal
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>UPGRADE DETAILS</Text>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle}>Level {candidate?.currentLevel ?? "unknown"} → {item.targetLevel}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close upgrade details"
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={8}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <Text style={styles.fieldLabel}>Schedule status</Text>
          <Text style={styles.statusValue}>{status}</Text>
        </View>
        <DetailRow label="Lane" value={laneLabel(item)} />
        <DetailRow label="Start" value={start ?? "Not scheduled"} />
        <DetailRow label="Finish" value={finish ?? "Finish unknown"} />
        <DetailRow label="Estimated cost" value={costLabel(candidate, projection)} />
        {blocker ? (
          <View style={styles.blockerCard}>
            <Text style={styles.blockerTitle}>Why this is not scheduled</Text>
            <Text style={styles.blockerText}>{blocker}</Text>
          </View>
        ) : null}
        <Text style={styles.note}>Dates and costs come from the planner scheduler and validated game data. Unknown values are not guessed.</Text>
        <View style={styles.actions}>
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit planned upgrade"
              disabled={queueBusy}
              onPress={onEdit}
              style={[styles.primaryButton, queueBusy && styles.disabledButton]}
            >
              <Text style={styles.primaryButtonText}>Edit upgrade</Text>
            </Pressable>
          ) : null}
          {onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove upgrade from plan"
              disabled={queueBusy}
              onPress={onRemove}
              style={[styles.secondaryButton, queueBusy && styles.disabledButton]}
            >
              <Text style={styles.secondaryButtonText}>Remove from plan</Text>
            </Pressable>
          ) : null}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderColor: colors.border,
      borderWidth: 1,
    },
    handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
    headerCopy: { flex: 1, gap: 4 },
    eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    title: { color: colors.textPrimary, fontSize: 19, fontWeight: "800" },
    subtitle: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
    closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
    closeText: { color: colors.textPrimary, fontSize: 24, lineHeight: 27 },
    content: { gap: 13, paddingHorizontal: 18, paddingBottom: 32 },
    statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surfaceRaised },
    fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
    statusValue: { color: colors.gold, fontSize: 12, fontWeight: "800" },
    detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    fieldValue: { flex: 1, color: colors.textPrimary, fontSize: 12, fontWeight: "600", textAlign: "right" },
    blockerCard: { gap: 5, borderRadius: 10, padding: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.orangeLight },
    blockerTitle: { color: colors.orangeLight, fontSize: 12, fontWeight: "800" },
    blockerText: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    note: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 },
    primaryButton: { flexGrow: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.gold },
    primaryButtonText: { color: colors.textDark, fontSize: 12, fontWeight: "800" },
    secondaryButton: { flexGrow: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
    secondaryButtonText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    disabledButton: { opacity: 0.5 },
  });
}
