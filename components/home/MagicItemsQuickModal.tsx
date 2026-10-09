import { MagicItemDialog } from "@/components/magicItems/MagicItemDialog";
import { MAGIC_ITEMS } from "@/config/magicItems";
import { activateClockTowerPotion } from "@/services/activateClockTowerPotion";
import { activateTimedMagicItem } from "@/services/activateTimedMagicItem";
import {
  getMagicItemInventory,
} from "@/services/magicItemService";
import { useAccountStore } from "@/stores/accountStore";
import type { Village } from "@/types/entity";
import type {
  MagicItem,
  MagicItemTarget,
} from "@/types/magicItem";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type MagicItemsQuickModalProps = {
  visible: boolean;
  village: Village;
  accountTag: string | null;
  onClose: () => void;
  onActivated: () => Promise<void>;
};

const SPEED_TARGETS: Readonly<Record<string, MagicItemTarget>> = {
  "builder-potion": "builders",
  "builder-bite": "builders",
  "research-potion": "research",
  "study-soup": "research",
  "pet-potion": "pet",
};

export function MagicItemsQuickModal({
  visible,
  village,
  accountTag,
  onClose,
  onActivated,
}: MagicItemsQuickModalProps) {
  const accounts = useAccountStore((state) => state.accounts);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [activeEffectIds, setActiveEffectIds] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [activatingItemId, setActivatingItemId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    item?: MagicItem;
    tone?: "confirm" | "success" | "error" | "info";
    confirmLabel?: string;
    onConfirm?: () => Promise<void>;
  } | null>(null);

  const accountName = accounts.find(
    (account) => account.tag === accountTag,
  )?.name;

  const loadItems = useCallback(async () => {
    if (!accountTag) {
      setQuantities({});
      setActiveEffectIds(new Set());
      return;
    }

    setIsLoading(true);
    try {
      const inventory = await getMagicItemInventory(accountTag);
      setQuantities(
        Object.fromEntries(
          inventory.map((entry) => [entry.itemId, entry.quantity]),
        ),
      );
      setActiveEffectIds(
        new Set(
          effects
            .filter(
              (effect) =>
                effect.expiresAt == null || effect.expiresAt > Date.now(),
            )
            .map((effect) => effect.itemId),
        ),
      );
    } catch {
      setDialog({
        title: "Inventory unavailable",
        message: "Could not load Magic Items. Please close and try again.",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [accountTag]);

  useEffect(() => {
    if (visible) void loadItems();
  }, [visible, loadItems]);

  const items = useMemo(
    () =>
      MAGIC_ITEMS.filter(
        (item) =>
          (item.itemType === "potion" || item.itemType === "snack") &&
          item.villages.includes(village),
      ),
    [village],
  );

  const activateNow = async (item: MagicItem) => {
    if (!accountTag || activatingItemId) return;
    if ((quantities[item.id] ?? 0) <= 0) {
      setDialog({
        title: "No items available",
        message: `Add ${item.name} to your tracked inventory first.`,
        item,
        tone: "info",
      });
      return;
    }

    setActivatingItemId(item.id);
    try {
      const now = Date.now();
      const effectId = `${item.id}-${now}-${Math.random().toString(36).slice(2, 8)}`;

      if (item.effect.type === "CLOCK_TOWER_BOOST") {
        const result = await activateClockTowerPotion({
          accountTag,
          itemId: item.id,
          village,
          now,
          effectId,
        });
        if (!result.activated) {
          setDialog({
            title: "Could not activate item",
            message: result.reason.replaceAll("-", " "),
            item,
            tone: "error",
          });
          return;
        }
      } else {
        const target = SPEED_TARGETS[item.id];
        if (!target) {
          setDialog({
            title: "Unavailable",
            message: "This item does not have an activation target yet.",
            item,
            tone: "info",
          });
          return;
        }
        const result = await activateTimedMagicItem({
          accountTag,
          itemId: item.id,
          village,
          target,
          now,
          effectId,
        });
        if (!result.activated) {
          setDialog({
            title: "Could not activate item",
            message: result.reason.replaceAll("-", " "),
            item,
            tone: "error",
          });
          return;
        }
      }

      await loadItems();
      await onActivated();
      setDialog({
        title: "Magic Item activated",
        message: `${item.name} is now active.`,
        item,
        tone: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error &&
        error.message === "MAGIC_ITEM_NOT_IN_INVENTORY"
          ? "Your inventory quantity changed. Refresh and try again."
          : "Please try again.";
      setDialog({
        title: "Could not activate item",
        message,
        item,
        tone: "error",
      });
    } finally {
      setActivatingItemId(null);
    }
  };

  const activate = (item: MagicItem) => {
    if (!accountTag || activatingItemId) return;
    if ((quantities[item.id] ?? 0) <= 0) {
      setDialog({
        title: "No items available",
        message: `Add ${item.name} to your tracked inventory first.`,
        item,
        tone: "info",
      });
      return;
    }
    setDialog({
      title: `Use ${item.name}?`,
      message:
        "This consumes one item from your tracked inventory and activates its effect for this village.",
      item,
      tone: "confirm",
      confirmLabel: "Use item",
      onConfirm: async () => {
        setDialog(null);
        await activateNow(item);
      },
    });
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <Pressable
            style={styles.scrim}
            onPress={onClose}
            accessibilityLabel="Close Magic Items"
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="sparkles" size={20} color="#fbbf24" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Potions & Snacks</Text>
                <Text style={styles.subtitle}>
                  {village === "home" ? "Home Village" : "Builder Base"}
                  {accountName ? ` · ${accountName}` : ""}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close Magic Items"
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={21} color="#cbd5e1" />
              </Pressable>
            </View>

            {!accountTag ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={30} color="#64748b" />
                <Text style={styles.emptyTitle}>Connect a village first</Text>
                <Text style={styles.emptyBody}>
                  Magic Items are tracked per account.
                </Text>
              </View>
            ) : isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color="#fbbf24" />
                <Text style={styles.muted}>Loading inventory…</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.content}>
                {items.map((item) => {
                  const quantity = quantities[item.id] ?? 0;
                  const active = activeEffectIds.has(item.id);
                  const isActivating = activatingItemId === item.id;
                  return (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemIconWrap}>
                        {item.image ? (
                          <Image
                            source={{ uri: item.image }}
                            style={styles.itemIcon}
                            contentFit="contain"
                          />
                        ) : (
                          <Ionicons name="sparkles" size={25} color="#fbbf24" />
                        )}
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.description} numberOfLines={2}>
                          {item.description}
                        </Text>
                        <Text style={styles.quantity}>
                          {quantity} available{active ? " · Active" : ""}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Activate ${item.name}`}
                        disabled={
                          quantity <= 0 || isActivating || !!activatingItemId
                        }
                        onPress={() => void activate(item)}
                        style={({ pressed }) => [
                          styles.activateButton,
                          (quantity <= 0 ||
                            isActivating ||
                            !!activatingItemId) &&
                            styles.disabled,
                          pressed && styles.pressed,
                        ]}
                      >
                        {isActivating ? (
                          <ActivityIndicator size="small" color="#0f172a" />
                        ) : (
                          <Text style={styles.activateText}>Use</Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
                <Text style={styles.footnote}>
                  Inventory is manual. Activating an item consumes one tracked
                  item and records its effect.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <MagicItemDialog
        visible={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        item={dialog?.item}
        tone={dialog?.tone}
        confirmLabel={dialog?.confirmLabel}
        onConfirm={
          dialog?.onConfirm ? () => void dialog.onConfirm?.() : undefined
        }
        onClose={() => setDialog(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.55)",
  },
  scrim: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: "82%",
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#334155",
    paddingBottom: 24,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#475569",
    marginTop: 9,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#422006",
    marginRight: 11,
  },
  headerText: { flex: 1 },
  title: { color: "#f8fafc", fontSize: 17, fontWeight: "800" },
  subtitle: { marginTop: 3, color: "#94a3b8", fontSize: 11 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, gap: 10 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    borderRadius: 14,
    backgroundColor: "#111c31",
    borderWidth: 1,
    borderColor: "#263449",
  },
  itemIconWrap: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIcon: { width: 38, height: 38 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { color: "#f8fafc", fontSize: 12, fontWeight: "800" },
  description: { marginTop: 3, color: "#94a3b8", fontSize: 10, lineHeight: 14 },
  quantity: { marginTop: 5, color: "#fbbf24", fontSize: 10, fontWeight: "700" },
  activateButton: {
    minWidth: 46,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#fbbf24",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  activateText: { color: "#0f172a", fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.65 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 9,
  },
  emptyTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "800" },
  emptyBody: { color: "#94a3b8", textAlign: "center", fontSize: 12 },
  loading: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  muted: { color: "#94a3b8", fontSize: 12 },
  footnote: { color: "#64748b", fontSize: 10, lineHeight: 15, marginTop: 4 },
});
