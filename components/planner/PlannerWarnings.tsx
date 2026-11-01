import { Pressable, StyleSheet, Text, View } from "react-native";
import { useHomeColors } from "@/theme/useHomeColors";

export interface PlannerWarningCounts {
  unknownDurations: number;
  blocked: number;
  missingLevels: number;
  staleSnapshot: boolean;
}

interface PlannerWarningsProps extends PlannerWarningCounts {
  accountEditConflict: boolean;
  editingAccountTag: string | null;
  queueError: string | null;
  projectionError: string | null;
  onUnknownDurationsPress: () => void;
  onBlockedPress: () => void;
  onMissingLevelsPress: () => void;
  onStaleSnapshotPress: () => void;
}

export function PlannerWarnings({
  unknownDurations,
  blocked,
  missingLevels,
  staleSnapshot,
  accountEditConflict,
  editingAccountTag,
  queueError,
  projectionError,
  onUnknownDurationsPress,
  onBlockedPress,
  onMissingLevelsPress,
  onStaleSnapshotPress,
}: PlannerWarningsProps) {
  const colors = useHomeColors();
  const styles = createStyles(colors);
  const hasWarnings = unknownDurations > 0 || blocked > 0 || missingLevels > 0 || staleSnapshot;
  if ((!accountEditConflict || !editingAccountTag) && !queueError && !projectionError && !hasWarnings) {
    return null;
  }

  return (
    <View style={styles.strip}>
      {accountEditConflict && editingAccountTag && (
        <Text style={styles.conflict}>
          Unsaved edit for {editingAccountTag} is preserved. Switch back to save or cancel it; editing another account is disabled until you resolve this draft.
        </Text>
      )}
      {hasWarnings && (
        <View style={styles.counts}>
          {unknownDurations > 0 && (
            <WarningCount
              label="Unknown durations"
              count={unknownDurations}
              onPress={onUnknownDurationsPress}
              styles={styles}
            />
          )}
          {blocked > 0 && (
            <WarningCount
              label="Blocked"
              count={blocked}
              onPress={onBlockedPress}
              styles={styles}
            />
          )}
          {missingLevels > 0 && (
            <WarningCount
              label="Missing levels"
              count={missingLevels}
              onPress={onMissingLevelsPress}
              styles={styles}
            />
          )}
          {staleSnapshot && (
            <Pressable
              accessibilityRole="button"
              onPress={onStaleSnapshotPress}
              style={styles.warningChip}
            >
              <Text style={styles.warningText}>Snapshot needs review</Text>
            </Pressable>
          )}
        </View>
      )}
      {!!queueError && <Text accessibilityRole="alert" style={styles.error}>{queueError}</Text>}
      {!!projectionError && <Text accessibilityRole="alert" style={styles.error}>{projectionError}</Text>}
    </View>
  );
}

function WarningCount({
  label,
  count,
  onPress,
  styles,
}: {
  label: string;
  count: number;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${count}`}
      onPress={onPress}
      style={styles.warningChip}
    >
      <Text style={styles.warningText}>{count} {label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    strip: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 7,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 8,
    },
    counts: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    warningChip: {
      minHeight: 36,
      justifyContent: "center",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.orangeLight,
      backgroundColor: colors.background,
      paddingHorizontal: 10,
    },
    warningText: { color: colors.orangeLight, fontSize: 11, fontWeight: "700" },
    conflict: { color: colors.orangeLight, fontSize: 12, lineHeight: 17 },
    error: { width: "100%", color: colors.orangeLight, fontSize: 12, lineHeight: 17 },
  });
}
