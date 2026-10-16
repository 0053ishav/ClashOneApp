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
  const [hasEdited, setHasEdited] = useState(false);
  const status = getJsonInputStatus(value);

  const updateText = (text: string) => {
    setHasEdited(true);
    onChangeText(text);
  };

  const pasteFromClipboard = async () => {
    if (disabled || isPasting) return;

    try {
      setIsPasting(true);
      const clipboardText = await Clipboard.getStringAsync();

      // Don't erase valid existing input if the clipboard is empty.
      if (!clipboardText?.trim()) {
        onPasteError("empty");
        return;
      }

      setHasEdited(true);
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
    setHasEdited(false);
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
              styles.iconButton,
              pressed && styles.pressed,
              (disabled || !value) && styles.disabled,
            ]}
          >
            <Ionicons name="refresh-outline" size={19} color="#fca5a5" />
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
          onChangeText={updateText}
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

      {#if value.trim().length > 0}
      <View style={styles.statusRow} accessibilityLiveRegion="polite">
        <Ionicons
          name={status === "valid" ? "checkmark-circle" : "alert-circle"}
          size={15}
          color={status === "valid" ? "#4ade80" : "#fbbf24"}
        />
        <Text style={status === "valid" ? styles.validStatus : styles.pendingStatus}>
          {status === "valid"
            ? "Valid JSON syntax"
            : "JSON syntax needs checking"}
        </Text>
      </View>
      {:else}
      <Text style={styles.helperText}>
        Your text stays here if import fails. Reset clears it so you can start over.
      </Text>
      {/if}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
  },
  hint: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 17,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#475569",
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  previewContainer: {
    minHeight: 104,
    maxHeight: 156,
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 12,
    backgroundColor: "#111827",
    overflow: "hidden",
  },
  preview: {
    height: 154,
    color: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 11,
    lineHeight: 16,
    textAlignVertical: "top",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  validStatus: {
    color: "#4ade80",
    fontSize: 12,
  },
  pendingStatus: {
    color: "#fbbf24",
    fontSize: 12,
  },
  helperText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
});
