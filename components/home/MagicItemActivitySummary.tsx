import { getMagicItem } from "@/config/magicItems";
import { resolveUpgradeCompletionTime } from "@/engine/magicItems/resolveUpgradeCompletionTime";
import type { ActiveMagicEffect } from "@/types/magicItem";
import type { Upgrade } from "@/types/upgrade";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

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
      .filter((item) => {
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
