import { Pressable, StyleSheet, Text, View } from "react-native";
import { useHomeColors } from "@/theme/useHomeColors";

export type PlannerSegment = "plan" | "add" | "details";

interface PlannerHeaderProps {
  accountName: string | null;
  activeTag: string | null;
  segment: PlannerSegment;
  onSegmentChange: (segment: PlannerSegment) => void;
}

const SEGMENTS: readonly { label: string; value: PlannerSegment }[] = [
  { label: "Plan", value: "plan" },
  { label: "Add", value: "add" },
  { label: "Details", value: "details" },
];

export function PlannerHeader({
  accountName,
  activeTag,
  segment,
  onSegmentChange,
}: PlannerHeaderProps) {
  const colors = useHomeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>CLASH ONE · HOME VILLAGE</Text>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Upgrade catalog</Text>
          <Text style={styles.subtitle}>Plan Home Village upgrades across your available lanes.</Text>
        </View>
        {activeTag && (
          <View accessibilityLabel={`Active account ${accountName ?? activeTag}`} style={styles.accountPill}>
            <Text numberOfLines={1} style={styles.accountName}>{accountName ?? activeTag}</Text>
            <Text style={styles.villageLabel}>Home Village</Text>
          </View>
        )}
      </View>
      <View style={styles.segmentControl} accessibilityRole="tablist" accessibilityLabel="Planner sections">
        {SEGMENTS.map((option) => {
          const selected = segment === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSegmentChange(option.value)}
              style={[styles.segment, selected && styles.selectedSegment]}
            >
              <Text style={[styles.segmentText, selected && styles.selectedSegmentText]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    container: { gap: 12 },
    eyebrow: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
    headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    headingCopy: { flex: 1, gap: 3 },
    title: { color: colors.textPrimary, fontSize: 26, fontWeight: "800" },
    subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    accountPill: {
      maxWidth: "48%",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 11,
      paddingVertical: 8,
      alignItems: "flex-end",
    },
    accountName: { color: colors.textPrimary, fontSize: 12, fontWeight: "800" },
    villageLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
    segmentControl: {
      flexDirection: "row",
      padding: 4,
      borderRadius: 12,
      backgroundColor: colors.surfaceRaised,
      gap: 4,
    },
    segment: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    selectedSegment: { backgroundColor: colors.gold },
    segmentText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
    selectedSegmentText: { color: colors.textDark },
  });
}
