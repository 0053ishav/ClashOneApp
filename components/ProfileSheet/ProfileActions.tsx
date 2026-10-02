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
        color="#fbbf24"
        onPress={onSync}
      />

      <ActionRow
        label="Full profile"
        description="View all details"
        icon="person"
        color="#38bdf8"
        onPress={onOpenProfile}
      />

      <ActionRow
        label="Settings"
        description="App preferences"
        icon="settings"
        color="#f87171"
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

      <Ionicons name="chevron-forward" size={18} color="#64748b" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111c2e",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#263449",
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
    borderBottomColor: "#202d40",
  },

  rowPressed: {
    backgroundColor: "#172235",
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
    color: "#f1f5f9",
  },

  description: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
});
