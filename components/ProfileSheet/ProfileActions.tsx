import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type IconName = keyof typeof Ionicons.glyphMap;

interface ProfileActionsProps {
  onSync: () => void;
  onSetting: () => void;
  onOpenProfile: () => void;
}

export default function ProfileActions({
  onSync,
  onSetting,
  onOpenProfile,
}: ProfileActionsProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <ActionRow
        label="Sync profile"
        description="Update from Clash API"
        icon="sync"
        color={colors.gold}
        colors={colors}
        styles={styles}
        onPress={onSync}
      />

      <ActionRow
        label="Full profile"
        description="View all details"
        icon="person"
        color={colors.blue}
        colors={colors}
        styles={styles}
        onPress={onOpenProfile}
      />

      <ActionRow
        label="Settings"
        description="App preferences"
        icon="settings"
        color={colors.dangerLight}
        colors={colors}
        styles={styles}
        onPress={onSetting}
        last
      />
    </View>
  );
}

interface ActionRowProps {
  label: string;
  description: string;
  icon: IconName;
  color: string;
  onPress: () => void;
  last?: boolean;
  colors: HomeColors;
  styles: ReturnType<typeof createStyles>;
}

function ActionRow({
  label,
  description,
  icon,
  color,
  onPress,
  last,
  colors,
  styles,
}: ActionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.iconChip, { backgroundColor: color + "26" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function createStyles(colors: HomeColors) {
  return StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: "hidden",
  },

  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },

  rowPressed: {
    backgroundColor: colors.surfaceRaised,
  },

  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  textContainer: {
    flex: 1,
    gap: 2,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  description: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  });
}
