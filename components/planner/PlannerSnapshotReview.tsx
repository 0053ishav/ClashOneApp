import { Pressable, StyleSheet, Text, View } from "react-native";
import { useHomeColors } from "@/theme/useHomeColors";

export interface PlannerSnapshotReviewProps {
  visible: boolean;
  lastJsonSyncAtMs: number | undefined;
  snapshotAtMs: number | null | undefined;
  busy: boolean;
  onReviewAndRecalculate: () => void;
}

export function PlannerSnapshotReview({
  visible,
  lastJsonSyncAtMs,
  snapshotAtMs,
  busy,
  onReviewAndRecalculate,
}: PlannerSnapshotReviewProps) {
  const colors = useHomeColors();
  const styles = createStyles(colors);

  if (!visible) return null;

  const message = lastJsonSyncAtMs === undefined
    ? "The latest village snapshot has no recorded sync time. Sync account data before recalculating. Your saved queue has not been changed."
    : snapshotAtMs === null || snapshotAtMs === undefined
      ? "This plan has no recorded snapshot baseline. Review the current import before calculating estimates. Your saved queue remains unchanged."
      : `A newer village import exists (last sync ${new Date(lastJsonSyncAtMs).toLocaleString()}). Review it before recalculating. Your saved queue remains unchanged.`;

  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>Village snapshot needs review</Text>
      <Text style={styles.body}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Review snapshot and recalculate plan"
        disabled={busy || lastJsonSyncAtMs === undefined}
        onPress={onReviewAndRecalculate}
        style={[styles.applyButton, (busy || lastJsonSyncAtMs === undefined) && styles.disabledButton]}
      >
        <Text style={styles.applyButtonText}>{busy ? "Recording review…" : "Review snapshot & recalculate"}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    stateCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16 },
    stateTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
    body: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
    applyButton: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, marginTop: 12 },
    applyButtonText: { color: colors.textDark, fontSize: 11, fontWeight: "800" },
    disabledButton: { opacity: 0.5 },
  });
}
