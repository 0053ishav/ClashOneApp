import { getMagicItem } from "@/config/magicItems";
import { resolveUpgradeCompletionTime } from "@/engine/magicItems/resolveUpgradeCompletionTime";
import type { ActiveMagicEffect, MagicItem } from "@/types/magicItem";
import type { Upgrade } from "@/types/upgrade";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Village } from "@/types/entity";

type MagicItemActivitySummaryProps = {
  effects: ActiveMagicEffect[];
  upgrades: Upgrade[];
  now?: number;
};

export function formatSavedDuration(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

export function MagicItemTimeSaved({ milliseconds }: { milliseconds?: number }) {
  if (!milliseconds || milliseconds <= 0) return null;
  return (
    <View style={styles.savedInline}>
      <Ionicons name="flash" size={11} color="#34d399" />
      <Text style={styles.savedInlineText}>Saved {formatSavedDuration(milliseconds)}</Text>
    </View>
  );
}

export function MagicItemActivitySummary({
  effects,
  upgrades,
  now = Date.now(),
}: MagicItemActivitySummaryProps) {
  const activeItems = useMemo(() => {
    const seen = new Set<string>();
    return effects
      .filter((effect) => effect.expiresAt == null || effect.expiresAt > now)
      .map((effect) => getMagicItem(effect.itemId))
      .filter((item): item is MagicItem => {
        if (!item || (item.itemType !== "potion" && item.itemType !== "snack")) return false;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
  }, [effects, now]);

  const totalSavedMs = upgrades.reduce(
    (total, upgrade) => total + (upgrade.magicItemTimeSavedMs ?? 0),
    0,
  );

  const itemSavedMs = useMemo(() => {
    const savedByItem = new Map<string, number>();
    for (const item of activeItems) {
      const itemEffects = effects.filter((effect) => effect.itemId === item.id);
      const saved = upgrades.reduce((total, upgrade) => {
        if (upgrade.isCompleted) return total;
        const target = upgrade.upgradeType === "BUILDER"
          ? "builders"
          : upgrade.upgradeType === "LAB"
            ? "research"
            : upgrade.upgradeType === "PET" ? "pet" : null;
        if (!target || !item.villages.includes(upgrade.village)) return total;
        const baseDurationMs = upgrade.durationMinutes * 60_000;
        const projectedEndTime = resolveUpgradeCompletionTime({
          baseDurationMs,
          startedAt: upgrade.startTime,
          effects: itemEffects,
          target,
          village: upgrade.village,
        });
        const baselineEndTime = upgrade.startTime + baseDurationMs;
        return total + Math.max(0, baselineEndTime - projectedEndTime);
      }, 0);
      savedByItem.set(item.id, saved);
    }
    return savedByItem;
  }, [activeItems, effects, upgrades]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={17} color="#fbbf24" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Potion & Snack Effects</Text>
          <Text style={styles.subtitle}>Across both villages</Text>
        </View>
        <View style={styles.savedTotal}>
          <Text style={styles.savedLabel}>TOTAL SAVED</Text>
          <Text style={styles.savedValue}>{formatSavedDuration(totalSavedMs)}</Text>
        </View>
      </View>

      {activeItems.length > 0 ? (
        <View style={styles.items}>
          {activeItems.map((item) => (
            <View key={item.id} style={styles.itemChip}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.itemImage} contentFit="contain" />
              ) : (
                <Ionicons name="sparkles" size={16} color="#fbbf24" />
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemSaved}>Saved {formatSavedDuration(itemSavedMs.get(item.id) ?? 0)}</Text>
              </View>
              <View style={styles.activeDot} />
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No potions or snacks are currently active.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 14, marginTop: 2, marginBottom: 12, padding: 13, borderRadius: 15, backgroundColor: "#111c31", borderWidth: 1, borderColor: "#263449" },
  header: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(251,191,36,0.1)" },
  headerText: { flex: 1 },
  title: { color: "#f8fafc", fontSize: 12, fontWeight: "900" },
  subtitle: { color: "#64748b", fontSize: 9, marginTop: 3 },
  savedTotal: { alignItems: "flex-end" },
  savedLabel: { color: "#64748b", fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  savedValue: { color: "#34d399", fontSize: 15, fontWeight: "900", marginTop: 2 },
  items: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  itemChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 7, borderRadius: 9, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#263449", maxWidth: "100%" },
  itemImage: { width: 20, height: 20 },
  itemDetails: { flexShrink: 1 },
  itemName: { color: "#cbd5e1", fontSize: 9, fontWeight: "700" },
  itemSaved: { color: "#34d399", fontSize: 8, fontWeight: "800", marginTop: 1 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" },
  emptyText: { marginTop: 11, color: "#94a3b8", fontSize: 10 },
  savedInline: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  savedInlineText: { color: "#34d399", fontSize: 9, fontWeight: "700" },
});


type MagicItemActivityPopupProps = {
  visible: boolean;
  village: Village;
  totalSavedMs: number;
  items: MagicItem[];
  error?: string;
  onClose: () => void;
};

export function MagicItemActivityPopup({
  visible,
  village,
  totalSavedMs,
  items,
  error,
  onClose,
}: MagicItemActivityPopupProps) {
  const villageName = village === "home" ? "Home Village" : "Builder Base";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={popupStyles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close Potion and Snack activity"
          style={popupStyles.scrim}
          onPress={onClose}
        />
        <View style={popupStyles.dialog}>
          <View style={popupStyles.topRow}>
            <View style={popupStyles.heroIcon}>
              <Ionicons name="flash" size={22} color="#34d399" />
            </View>
            <View style={popupStyles.heading}>
              <Text style={popupStyles.title}>Magic Item Activity</Text>
              <Text style={popupStyles.subtitle}>{villageName} · Potions & Snacks</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={10}
              style={popupStyles.closeButton}
            >
              <Ionicons name="close" size={18} color="#94a3b8" />
            </Pressable>
          </View>

          <View style={popupStyles.totalCard}>
            <View>
              <Text style={popupStyles.totalLabel}>TOTAL TIME SAVED</Text>
              <Text style={popupStyles.totalValue}>{formatSavedDuration(totalSavedMs)}</Text>
            </View>
            <View style={popupStyles.totalIcon}>
              <Ionicons name="time-outline" size={23} color="#34d399" />
            </View>
          </View>

          <View style={popupStyles.sectionHeader}>
            <Text style={popupStyles.sectionTitle}>ACTIVE EFFECTS</Text>
            <View style={popupStyles.countBadge}>
              <Text style={popupStyles.countText}>{items.length}</Text>
            </View>
          </View>

          {error ? (
            <View style={popupStyles.emptyState}>
              <Ionicons name="alert-circle-outline" size={23} color="#fb7185" />
              <Text style={popupStyles.emptyText}>{error}</Text>
            </View>
          ) : items.length > 0 ? (
            <ScrollView style={popupStyles.list} contentContainerStyle={popupStyles.listContent}>
              {items.map((item) => (
                <View key={item.id} style={popupStyles.itemRow}>
                  <View style={popupStyles.itemIcon}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={popupStyles.itemImage} contentFit="contain" />
                    ) : (
                      <Ionicons name="sparkles" size={20} color="#fbbf24" />
                    )}
                  </View>
                  <View style={popupStyles.itemInfo}>
                    <Text style={popupStyles.itemName}>{item.name}</Text>
                    <Text style={popupStyles.itemDescription} numberOfLines={2}>{item.description}</Text>
                  </View>
                  <View style={popupStyles.activeStatus}>
                    <View style={popupStyles.activeDot} />
                    <Text style={popupStyles.activeText}>ACTIVE</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={popupStyles.emptyState}>
              <View style={popupStyles.emptyIcon}>
                <Ionicons name="flask-outline" size={22} color="#64748b" />
              </View>
              <Text style={popupStyles.emptyTitle}>No active effects</Text>
              <Text style={popupStyles.emptyText}>Use a potion or snack to speed up your progression.</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [popupStyles.doneButton, pressed && popupStyles.pressed]}
          >
            <Text style={popupStyles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const popupStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 22, backgroundColor: "rgba(2,6,23,0.76)" },
  scrim: { ...StyleSheet.absoluteFillObject },
  dialog: { width: "100%", maxWidth: 410, maxHeight: "78%", padding: 18, borderRadius: 22, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIcon: { width: 43, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(52,211,153,0.1)", borderWidth: 1, borderColor: "rgba(52,211,153,0.22)" },
  heading: { flex: 1, minWidth: 0 },
  title: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  subtitle: { color: "#94a3b8", fontSize: 10, marginTop: 4, fontWeight: "600" },
  closeButton: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  totalCard: { marginTop: 17, padding: 15, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(52,211,153,0.08)", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  totalLabel: { color: "#6ee7b7", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  totalValue: { color: "#34d399", fontSize: 27, fontWeight: "900", marginTop: 5 },
  totalIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(52,211,153,0.1)", alignItems: "center", justifyContent: "center" },
  sectionHeader: { marginTop: 19, marginBottom: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: "#94a3b8", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  countBadge: { minWidth: 23, height: 23, paddingHorizontal: 6, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#1e293b" },
  countText: { color: "#e2e8f0", fontSize: 10, fontWeight: "900" },
  list: { flexGrow: 0, flexShrink: 1, maxHeight: 230 },
  listContent: { gap: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 13, backgroundColor: "#111c31", borderWidth: 1, borderColor: "#263449" },
  itemIcon: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#0b1425" },
  itemImage: { width: 34, height: 34 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { color: "#f1f5f9", fontSize: 12, fontWeight: "800" },
  itemDescription: { color: "#94a3b8", fontSize: 9, lineHeight: 13, marginTop: 3 },
  activeStatus: { flexDirection: "row", alignItems: "center", gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" },
  activeText: { color: "#34d399", fontSize: 8, fontWeight: "900", letterSpacing: 0.3 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 22, paddingHorizontal: 18, borderRadius: 14, backgroundColor: "#111c31", borderWidth: 1, borderColor: "#263449" },
  emptyIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#0b1425", alignItems: "center", justifyContent: "center", marginBottom: 9 },
  emptyTitle: { color: "#e2e8f0", fontSize: 12, fontWeight: "800", marginTop: 8 },
  emptyText: { color: "#94a3b8", fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 5 },
  doneButton: { marginTop: 16, height: 43, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#fbbf24" },
  doneText: { color: "#0f172a", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});
