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
}: ConfirmModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            {cancelText ? (
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.confirmButton,
                destructive && styles.destructiveButton,
              ]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  styles.confirmText,
                  destructive && styles.destructiveText,
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modal: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1f2328",
  },

  message: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },

  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  cancelText: {
    color: "#6b7280",
    fontWeight: "600",
  },

  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#ffd33d",
    borderRadius: 12,
  },

  confirmText: {
    fontWeight: "700",
    color: "#000",
  },

  destructiveButton: {
    backgroundColor: "#fee2e2",
  },

  destructiveText: {
    color: "#b91c1c",
  },
});
