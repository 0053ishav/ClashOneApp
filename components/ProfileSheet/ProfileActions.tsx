import { HOME_COLORS } from "@/theme/home";
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
  return (
    <View style={styles.container}>
      <ActionRow
        label="Sync profile"
        description="Update from Clash API"
        icon="sync"
        color={HOME_COLORS.gold}
        onPress={onSync}
      />

      <ActionRow
        label="Full profile"
        description="View all details"
        icon="person"
        color={HOME_COLORS.blue}
        onPress={onOpenProfile}
      />

      <ActionRow
        label="Settings"
        description="App preferences"
        icon="settings"
        color={HOME_COLORS.dangerLight}
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
}

function ActionRow({
  label,
  description,
  icon,
  color,
  onPress,
  last,
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

      <Ionicons name="chevron-forward" size={18} color={HOME_COLORS.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: HOME_COLORS.surfaceDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: HOME_COLORS.borderStrong,
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
    borderBottomColor: HOME_COLORS.borderMuted,
  },

  rowPressed: {
    backgroundColor: HOME_COLORS.surfaceRaised,
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
    color: HOME_COLORS.textPrimary,
  },

  description: {
    fontSize: 11,
    color: HOME_COLORS.textMuted,
    fontWeight: "500",
  },
});
