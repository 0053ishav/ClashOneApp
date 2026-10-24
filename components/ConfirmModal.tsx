import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  variant?: "default" | "dark";
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
  variant = "default",
}: ConfirmModalProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.overlay, variant === "dark" && styles.darkOverlay]}>
        <View style={[styles.modal, variant === "dark" && styles.darkModal]}>
          <Text style={[styles.title, variant === "dark" && styles.darkTitle]}>{title}</Text>
          <Text style={[styles.message, variant === "dark" && styles.darkMessage]}>{message}</Text>

          <View style={styles.buttonRow}>
            {cancelText ? (
              <Pressable
                style={[styles.cancelButton, variant === "dark" && styles.darkCancelButton]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelText, variant === "dark" && styles.darkCancelText]}>
                  {cancelText}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.confirmButton,
                destructive && styles.destructiveButton,
                variant === "dark" && styles.darkConfirmButton,
                variant === "dark" && destructive && styles.darkDestructiveButton,
              ]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  styles.confirmText,
                  destructive && styles.destructiveText,
                  variant === "dark" && styles.darkConfirmText,
                  variant === "dark" && destructive && styles.darkDestructiveText,
                ]}
              >
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modal: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },

  darkOverlay: {
    backgroundColor: "rgba(2, 6, 23, 0.78)",
  },

  darkModal: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: colors.textPrimary,
  },

  message: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },

  darkTitle: { color: "#f8fafc" },
  darkMessage: { color: "#94a3b8", lineHeight: 20 },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },

  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  darkCancelButton: {
    borderRadius: 12,
    backgroundColor: "#1e293b",
  },

  cancelText: {
    color: "#6b7280",
    fontWeight: "600",
  },

  darkCancelText: { color: "#cbd5e1" },

  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#ffd33d",
    borderRadius: 12,
  },

  confirmText: {
    fontWeight: "700",
    color: colors.textDark,
  },

  darkConfirmButton: {
    backgroundColor: "#fbbf24",
  },
  darkConfirmText: { color: "#0f172a" },

  destructiveButton: {
    backgroundColor: `${colors.danger}1F`,
  },

  destructiveText: {
    color: colors.danger,
  },

  darkDestructiveButton: {
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.35)",
  },
  darkDestructiveText: { color: "#f87171" },
});
