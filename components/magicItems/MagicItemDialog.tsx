import type { MagicItem } from "@/types/magicItem";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type MagicItemDialogChoice = {
  item: MagicItem;
  quantity?: number;
};

type MagicItemDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  item?: MagicItem;
  choices?: MagicItemDialogChoice[];
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "confirm" | "success" | "error" | "info";
  busy?: boolean;
  onConfirm?: (item?: MagicItem) => void;
  onClose: () => void;
};

const EMPTY_CHOICES: MagicItemDialogChoice[] = [];

const TONE_COLOR = {
  confirm: "#fbbf24",
  success: "#34d399",
  error: "#fb7185",
  info: "#60a5fa",
} as const;

export function MagicItemDialog({
  visible,
  title,
  message,
  item,
  choices = EMPTY_CHOICES,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "confirm",
  busy = false,
  onConfirm,
  onClose,
}: MagicItemDialogProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const accent = TONE_COLOR[tone];
  const selectedChoice = choices.find((choice) => choice.item.id === selectedItemId);

  useEffect(() => {
    if (visible) setSelectedItemId(choices[0]?.item.id ?? null);
    else setSelectedItemId(null);
  }, [visible, title, choices]);

  const confirm = () => {
    if (busy) return;
    onConfirm?.(selectedChoice?.item ?? item);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close Magic Item dialog" />
        <View style={styles.dialog}>
          <View style={[styles.iconHalo, { borderColor: `${accent}55`, backgroundColor: `${accent}16` }]}>
            {item?.image ? (
              <Image source={{ uri: item.image }} style={styles.heroImage} contentFit="contain" />
            ) : (
              <Ionicons name="sparkles" size={28} color={accent} />
            )}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {choices.length > 0 && (
            <ScrollView style={styles.choices} contentContainerStyle={styles.choicesContent}>
              {choices.map(({ item: choiceItem, quantity }) => {
                const selected = selectedItemId === choiceItem.id;
                return (
                  <Pressable
                    key={choiceItem.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedItemId(choiceItem.id)}
                    style={[styles.choice, selected && { borderColor: accent, backgroundColor: `${accent}12` }]}
                  >
                    <View style={styles.choiceIcon}>
                      {choiceItem.image ? (
                        <Image source={{ uri: choiceItem.image }} style={styles.choiceImage} contentFit="contain" />
                      ) : (
                        <Ionicons name="sparkles" size={22} color={accent} />
                      )}
                    </View>
                    <View style={styles.choiceText}>
                      <Text style={styles.choiceTitle}>{choiceItem.name}</Text>
                      <Text style={styles.choiceDescription} numberOfLines={2}>{choiceItem.description}</Text>
                    </View>
                    {quantity != null && <Text style={[styles.quantity, { color: accent }]}>×{quantity}</Text>}
                    {selected && <Ionicons name="checkmark-circle" size={18} color={accent} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              disabled={busy}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed, busy && styles.disabled]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            {onConfirm && (
              <Pressable
                accessibilityRole="button"
                onPress={confirm}
                disabled={busy || (choices.length > 0 && !selectedChoice)}
                style={({ pressed }) => [
                  styles.confirmButton,
                  { backgroundColor: accent },
                  (busy || (choices.length > 0 && !selectedChoice)) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {busy ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.confirmText}>{confirmLabel}</Text>}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(2,6,23,0.76)" },
  scrim: { ...StyleSheet.absoluteFillObject },
  dialog: { width: "100%", maxWidth: 420, maxHeight: "82%", padding: 20, borderRadius: 22, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155", alignItems: "center" },
  iconHalo: { width: 68, height: 68, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  heroImage: { width: 52, height: 52 },
  title: { color: "#f8fafc", fontSize: 17, fontWeight: "900", textAlign: "center" },
  message: { marginTop: 7, color: "#cbd5e1", fontSize: 12, lineHeight: 18, textAlign: "center" },
  choices: { width: "100%", maxHeight: 250, marginTop: 14 },
  choicesContent: { gap: 8 },
  choice: { flexDirection: "row", alignItems: "center", gap: 9, padding: 9, borderRadius: 12, borderWidth: 1, borderColor: "#263449", backgroundColor: "#111c31" },
  choiceIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  choiceImage: { width: 34, height: 34 },
  choiceText: { flex: 1, minWidth: 0 },
  choiceTitle: { color: "#f8fafc", fontSize: 11, fontWeight: "800" },
  choiceDescription: { marginTop: 3, color: "#94a3b8", fontSize: 9, lineHeight: 13 },
  quantity: { fontSize: 11, fontWeight: "900" },
  actions: { flexDirection: "row", width: "100%", gap: 9, marginTop: 18 },
  cancelButton: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#1e293b" },
  cancelText: { color: "#cbd5e1", fontSize: 12, fontWeight: "800" },
  confirmButton: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  confirmText: { color: "#0f172a", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
