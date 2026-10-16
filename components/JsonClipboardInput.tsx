import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export type ClipboardPasteError = "empty" | "unavailable";

interface JsonClipboardInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onPasteError: (error: ClipboardPasteError) => void;
  disabled?: boolean;
}

type JsonInputStatus = "empty" | "valid" | "invalid";

function getJsonInputStatus(value: string): JsonInputStatus {
  if (!value.trim()) return "empty";

  try {
    JSON.parse(value);
    return "valid";
  } catch {
    return "invalid";
  }
}

export function JsonClipboardInput({
  value,
  onChangeText,
  onPasteError,
  disabled = false,
}: JsonClipboardInputProps) {
  const [isPasting, setIsPasting] = useState(false);
  const status = getJsonInputStatus(value);

  const pasteFromClipboard = async () => {
    if (disabled || isPasting) return;

    try {
      setIsPasting(true);
      const clipboardText = await Clipboard.getStringAsync();

      // Don't erase existing input if the clipboard is empty.
      if (!clipboardText?.trim()) {
        onPasteError("empty");
        return;
      }

      onChangeText(clipboardText);
    } catch {
      onPasteError("unavailable");
    } finally {
      setIsPasting(false);
    }
  };

  const resetInput = () => {
    if (disabled || !value) return;
    onChangeText("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Village JSON</Text>
          <Text style={styles.hint}>
            Paste with the clipboard icon, or tap the box to paste manually.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset JSON input"
            accessibilityHint="Clears the JSON textbox"
            disabled={disabled || !value}
            onPress={resetInput}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.pressed,
              (disabled || !value) && styles.disabled,
            ]}
          >
            <Ionicons name="refresh-outline" size={16} color="#fca5a5" />
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Paste JSON from clipboard"
            disabled={disabled || isPasting}
            onPress={pasteFromClipboard}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
              (disabled || isPasting) && styles.disabled,
            ]}
          >
            {isPasting ? (
              <ActivityIndicator color="#fbbf24" size="small" />
            ) : (
              <Ionicons name="clipboard-outline" size={20} color="#fbbf24" />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.previewContainer}>
        <TextInput
          accessibilityLabel="Village JSON input"
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          multiline
          scrollEnabled
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholder="Paste or type your village JSON here..."
          placeholderTextColor="#64748b"
          style={styles.preview}
        />
      </View>

      {value.trim().length > 0 ? (
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          <Ionicons
            name={status === "valid" ? "checkmark-circle" : "alert-circle"}
            size={15}
            color={status === "valid" ? "#4ade80" : "#fbbf24"}
          />
          <Text
            style={
              status === "valid" ? styles.validStatus : styles.pendingStatus
            }
          >
            {status === "valid"
              ? "Valid JSON syntax"
              : "JSON syntax needs checking"}
          </Text>
        </View>
      ) : (
        <Text style={styles.helperText}>
          Your text stays here if import fails. Reset clears it so you can start over.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    padding: 14,
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#131e30",
    borderWidth: 1,
    borderColor: "#2b3850",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  title: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
  },
  hint: {
    color: "#8493aa",
    fontSize: 11,
    lineHeight: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    backgroundColor: "rgba(251,191,36,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  resetButton: {
    minHeight: 40,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#35435a",
    backgroundColor: "#1a2639",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  resetText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "700",
  },
  previewContainer: {
    minHeight: 126,
    maxHeight: 178,
    borderWidth: 1,
    borderColor: "#35435a",
    borderRadius: 13,
    backgroundColor: "#0b1220",
    overflow: "hidden",
  },
  preview: {
    height: 154,
    color: "#dbe4f0",
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 12,
    lineHeight: 18,
    textAlignVertical: "top",
    fontFamily: "monospace",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  validStatus: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "600",
  },
  pendingStatus: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "600",
  },
  helperText: {
    color: "#8493aa",
    fontSize: 11,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
});
