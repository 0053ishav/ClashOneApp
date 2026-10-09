import { MAGIC_ITEMS } from "@/config/magicItems";
import {
  getMagicItemInventory,
  setMagicItemQuantity,
} from "@/services/magicItemService";
import { useAccountStore } from "@/stores/accountStore";
import type { MagicItem, MagicItemType } from "@/types/magicItem";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ITEM_GROUPS: { type: MagicItemType; title: string }[] = [
  { type: "potion", title: "Potions" },
  { type: "snack", title: "Snacks" },
  { type: "book", title: "Books" },
  { type: "hammer", title: "Hammers" },
];

const TYPE_COLORS: Record<MagicItemType, string> = {
  potion: "#60a5fa",
  snack: "#34d399",
  book: "#fbbf24",
  hammer: "#fb923c",
};

export default function MagicItemsScreen() {
  const router = useRouter();
  const activeTag = useAccountStore((state) => state.activeTag);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    if (!activeTag) {
      setQuantities({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const inventory = await getMagicItemInventory(activeTag);
      setQuantities(
        Object.fromEntries(inventory.map((entry) => [entry.itemId, entry.quantity])),
      );
    } catch {
      Alert.alert("Couldn't load inventory", "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTag]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const groupedItems = useMemo(
    () =>
      ITEM_GROUPS.map((group) => ({
        ...group,
        items: MAGIC_ITEMS.filter((item) => item.itemType === group.type),
      })),
    [],
  );

  const changeQuantity = async (item: MagicItem, delta: number) => {
    if (!activeTag || savingItemId) return;

    const current = quantities[item.id] ?? 0;
    const next = Math.max(0, current + delta);
    if (item.maxCapacity != null && next > item.maxCapacity) return;
    if (next === current) return;

    setSavingItemId(item.id);
    setQuantities((currentQuantities) => ({
      ...currentQuantities,
      [item.id]: next,
    }));

    try {
      await setMagicItemQuantity({
        accountTag: activeTag,
        itemId: item.id,
        quantity: next,
      });
    } catch {
      setQuantities((currentQuantities) => ({
        ...currentQuantities,
        [item.id]: current,
      }));
      Alert.alert("Couldn't save inventory", "Your previous quantity was restored.");
    } finally {
      setSavingItemId(null);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={21} color="#f8fafc" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Magic Items</Text>
          <Text style={styles.subtitle}>Track inventory for the selected village</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh inventory"
          onPress={() => void loadInventory()}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={19} color="#cbd5e1" />
        </Pressable>
      </View>

      {!activeTag ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={32} color="#64748b" />
          <Text style={styles.emptyTitle}>Connect a village first</Text>
          <Text style={styles.emptyBody}>
            Import your village data before tracking Magic Item inventory.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#fbbf24" />
          <Text style={styles.muted}>Loading inventory…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color="#93c5fd" />
            <Text style={styles.noticeText}>
              Quantities are tracked manually and saved separately for each account.
            </Text>
          </View>

          {groupedItems.map((group) => (
            <View key={group.type} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.items.map((item) => {
                const quantity = quantities[item.id] ?? 0;
                const isSaving = savingItemId === item.id;
                const atCapacity =
                  item.maxCapacity != null && quantity >= item.maxCapacity;

                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View
                      style={[
                        styles.itemIconWrap,
                        { borderColor: `${TYPE_COLORS[item.itemType]}55` },
                      ]}
                    >
                      {item.image ? (
                        <Image
                          source={{ uri: item.image }}
                          style={styles.itemIcon}
                          contentFit="contain"
                        />
                      ) : (
                        <Ionicons
                          name="sparkles"
                          size={24}
                          color={TYPE_COLORS[item.itemType]}
                        />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <Text style={styles.villageText}>
                        {item.villages
                          .map((village) =>
                            village === "home"
                              ? "Home Village"
                              : village === "builderBase"
                                ? "Builder Base"
                                : "Global",
                          )
                          .join(" · ")}
                      </Text>
                    </View>
                    <View style={styles.quantityControl}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove one ${item.name}`}
                        disabled={isSaving || quantity <= 0}
                        onPress={() => void changeQuantity(item, -1)}
                        style={({ pressed }) => [
                          styles.quantityButton,
                          (isSaving || quantity <= 0) && styles.disabled,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons name="remove" size={17} color="#f8fafc" />
                      </Pressable>
                      <Text style={styles.quantity}>{quantity}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add one ${item.name}`}
                        disabled={isSaving || atCapacity}
                        onPress={() => void changeQuantity(item, 1)}
                        style={({ pressed }) => [
                          styles.quantityButton,
                          (isSaving || atCapacity) && styles.disabled,
                          pressed && styles.pressed,
                        ]}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#fbbf24" />
                        ) : (
                          <Ionicons name="add" size={17} color="#f8fafc" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
  },
  headerText: { flex: 1, marginLeft: 12 },
  title: { fontSize: 20, fontWeight: "800", color: "#f8fafc" },
  subtitle: { marginTop: 3, fontSize: 11, color: "#94a3b8" },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 28 },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#172554",
    borderWidth: 1,
    borderColor: "#1e3a8a",
    marginBottom: 18,
  },
  noticeText: { flex: 1, color: "#bfdbfe", fontSize: 12, lineHeight: 17 },
  group: { marginBottom: 20 },
  groupTitle: {
    marginBottom: 9,
    color: "#fbbf24",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: "#111c31",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  itemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIcon: { width: 39, height: 39 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 12, fontWeight: "800", color: "#f8fafc" },
  itemDescription: { marginTop: 3, fontSize: 10, lineHeight: 14, color: "#94a3b8" },
  villageText: { marginTop: 4, fontSize: 9, color: "#64748b" },
  quantityControl: { alignItems: "center", gap: 4 },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#263449",
  },
  quantity: {
    minWidth: 22,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: "#f8fafc",
  },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.65 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: { marginTop: 12, color: "#f8fafc", fontSize: 16, fontWeight: "800" },
  emptyBody: { marginTop: 7, color: "#94a3b8", textAlign: "center", lineHeight: 20 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: "#94a3b8", fontSize: 12 },
  bottomSpacer: { height: 20 },
});
