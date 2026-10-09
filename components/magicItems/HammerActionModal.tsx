import { MAGIC_ITEMS } from "@/config/magicItems";
import type { MagicItem, MagicItemTarget } from "@/types/magicItem";
import type { Village } from "@/types/entity";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type HammerTargetOption = {
  id: string;
  name: string;
  target: MagicItemTarget;
  currentLevel: number;
  nextLevel: number;
  iconUri?: string;
  village: Village;
};

type HammerActionModalProps = {
  visible: boolean;
  village: Village;
  targets: HammerTargetOption[];
  inventory: Record<string, number>;
  onClose: () => void;
  /** UI hook for a future progression-engine integration; not wired yet. */
  onConfirm?: (item: MagicItem, target: HammerTargetOption) => void;
};

const TARGET_LABELS: Readonly<Record<string, string>> = {
  building: "Buildings",
  troop: "Troops",
  spell: "Spells",
  hero: "Heroes",
  pet: "Pets",
};

function isCompatible(item: MagicItem, target: HammerTargetOption): boolean {
  const appliesTo = item.effect.appliesTo ?? [];
  return (
    appliesTo.includes("any") ||
    appliesTo.includes(target.target) ||
    (appliesTo.includes("heroes-and-pets") &&
      (target.target === "hero" || target.target === "pet"))
  );
}

/**
 * Presentation-only Hammer selection UI.
 * The future progression tab can supply target options and connect onConfirm
 * to the progression application service once Hammer use is implemented.
 */
export function HammerActionModal({
  visible,
  village,
  targets,
  inventory,
  onClose,
  onConfirm,
}: HammerActionModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const hammers = useMemo(
    () =>
      MAGIC_ITEMS.filter(
        (item) =>
          item.itemType === "hammer" &&
          item.villages.includes(village) &&
          (inventory[item.id] ?? 0) > 0,
      ),
    [inventory, village],
  );

  const selectedHammer = hammers.find((item) => item.id === selectedItemId) ?? null;
  const compatibleTargets = targets.filter(
    (target) => target.village === village && selectedHammer != null && isCompatible(selectedHammer, target),
  );
  const selectedTarget =
    compatibleTargets.find((target) => target.id === selectedTargetId) ?? null;

  const close = () => {
    setSelectedItemId(null);
    setSelectedTargetId(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={close} accessibilityLabel="Close Hammer selection" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="hammer" size={22} color="#fb923c" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Use a Hammer</Text>
              <Text style={styles.subtitle}>
                {village === "home" ? "Home Village" : "Builder Base"} · UI preview
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={close} style={styles.closeButton}>
              <Ionicons name="close" size={21} color="#cbd5e1" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.sectionTitle}>1. Select a Hammer</Text>
            {hammers.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="hammer-outline" size={27} color="#64748b" />
                <Text style={styles.emptyText}>No Hammers in tracked inventory</Text>
                <Text style={styles.emptySubtext}>Add quantities in Magic Items inventory.</Text>
              </View>
            ) : (
              hammers.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedItemId === item.id }}
                  onPress={() => {
                    setSelectedItemId(item.id);
                    setSelectedTargetId(null);
                  }}
                  style={[
                    styles.itemRow,
                    selectedItemId === item.id && styles.itemRowSelected,
                  ]}
                >
                  <View style={styles.itemIconWrap}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.itemIcon} contentFit="contain" />
                    ) : (
                      <Ionicons name="hammer" size={23} color="#fb923c" />
                    )}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                  <Text style={styles.quantity}>×{inventory[item.id] ?? 0}</Text>
                  {selectedItemId === item.id && (
                    <Ionicons name="checkmark-circle" size={18} color="#fb923c" />
                  )}
                </Pressable>
              ))
            )}

            <Text style={styles.sectionTitle}>2. Select an upgrade target</Text>
            {!selectedHammer ? (
              <Text style={styles.helperText}>Choose a Hammer to see compatible targets.</Text>
            ) : compatibleTargets.length === 0 ? (
              <Text style={styles.helperText}>No compatible next-level targets are available for this village.</Text>
            ) : (
              compatibleTargets.map((target) => (
                <Pressable
                  key={target.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedTargetId === target.id }}
                  onPress={() => setSelectedTargetId(target.id)}
                  style={[
                    styles.targetRow,
                    selectedTargetId === target.id && styles.targetRowSelected,
                  ]}
                >
                  {target.iconUri ? (
                    <Image source={{ uri: target.iconUri }} style={styles.targetIcon} contentFit="contain" />
                  ) : (
                    <View style={styles.targetIconFallback}>
                      <Ionicons name="cube-outline" size={19} color="#cbd5e1" />
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.itemName}>{target.name}</Text>
                    <Text style={styles.itemDescription}>
                      {TARGET_LABELS[target.target] ?? target.target} · Level {target.currentLevel} → {target.nextLevel}
                    </Text>
                  </View>
                  {selectedTargetId === target.id && (
                    <Ionicons name="checkmark-circle" size={18} color="#fb923c" />
                  )}
                </Pressable>
              ))
            )}

            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={18} color="#fdba74" />
              <Text style={styles.noticeText}>
                This is the Hammer UI only. Confirm is intentionally disabled until the progression engine can safely apply the level and cost changes.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!selectedHammer || !selectedTarget || !onConfirm}
              onPress={() => {
                if (selectedHammer && selectedTarget && onConfirm) {
                  onConfirm(selectedHammer, selectedTarget);
                }
              }}
              style={[
                styles.confirmButton,
                (!selectedHammer || !selectedTarget || !onConfirm) && styles.disabled,
              ]}
            >
              <Ionicons name="hammer" size={17} color="#0f172a" />
              <Text style={styles.confirmText}>Confirm Hammer Use</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,6,23,0.6)" },
  scrim: { ...StyleSheet.absoluteFillObject },
  sheet: { maxHeight: "88%", backgroundColor: "#0f172a", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: "#334155", paddingBottom: 22 },
  handle: { alignSelf: "center", width: 38, height: 4, borderRadius: 4, backgroundColor: "#475569", marginTop: 9, marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  headerIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(251,146,60,0.12)", marginRight: 11 },
  headerText: { flex: 1 },
  title: { color: "#f8fafc", fontSize: 17, fontWeight: "800" },
  subtitle: { marginTop: 3, color: "#94a3b8", fontSize: 11 },
  closeButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 10 },
  sectionTitle: { color: "#fbbf24", fontSize: 12, fontWeight: "900", marginTop: 8, marginBottom: 2 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: "#111c31", borderWidth: 1, borderColor: "#263449" },
  itemRowSelected: { borderColor: "#fb923c", backgroundColor: "#1c2432" },
  itemIconWrap: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  itemIcon: { width: 36, height: 36 },
  rowText: { flex: 1, minWidth: 0 },
  itemName: { color: "#f8fafc", fontSize: 12, fontWeight: "800" },
  itemDescription: { marginTop: 3, color: "#94a3b8", fontSize: 10, lineHeight: 14 },
  quantity: { color: "#fb923c", fontSize: 12, fontWeight: "900" },
  targetRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: "#111c31", borderWidth: 1, borderColor: "#263449" },
  targetRowSelected: { borderColor: "#fb923c", backgroundColor: "#1c2432" },
  targetIcon: { width: 40, height: 40 },
  targetIconFallback: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  empty: { padding: 20, alignItems: "center", gap: 7, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#334155" },
  emptyText: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  emptySubtext: { color: "#64748b", fontSize: 10, textAlign: "center" },
  helperText: { color: "#64748b", fontSize: 11, lineHeight: 16, paddingVertical: 8 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11, borderRadius: 10, backgroundColor: "#431407", borderWidth: 1, borderColor: "#7c2d12", marginTop: 5 },
  noticeText: { flex: 1, color: "#fed7aa", fontSize: 10, lineHeight: 15 },
  confirmButton: { minHeight: 42, marginTop: 6, borderRadius: 11, backgroundColor: "#fb923c", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmText: { color: "#0f172a", fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.35 },
});
