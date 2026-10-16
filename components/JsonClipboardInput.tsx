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

export function JsonClipboardInput({
  value,
  onChangeText,
  onPasteError,
  disabled = false,
}: JsonClipboardInputProps) {
  const [isPasting, setIsPasting] = useState(false);

  const pasteFromClipboard = async () => {
    if (disabled || isPasting) return;

    try {
      setIsPasting(true);
      const clipboardText = await Clipboard.getStringAsync();

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Village JSON</Text>
          <Text style={styles.hint}>
            Tap the box or paste button to load clipboard data. This preview is read-only.
          </Text>
        </View>
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

      <TextInput
        accessibilityLabel="Read-only village JSON preview"
        value={value}
        editable={false}
        showSoftInputOnFocus={false}
        multiline
        scrollEnabled
        onPressIn={pasteFromClipboard}
        placeholder="Your copied village JSON will appear here..."
        placeholderTextColor="#64748b"
        style={styles.preview}
      />

      <Pressable
        accessibilityRole="button"
        disabled={disabled || isPasting}
        onPress={pasteFromClipboard}
        style={({ pressed }) => [
          styles.pasteButton,
          pressed && styles.pressed,
          (disabled || isPasting) && styles.disabled,
        ]}
      >
        {isPasting ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Ionicons name="clipboard-outline" size={20} color="#0f172a" />
        )}
        <Text style={styles.pasteButtonText}>
          {isPasting ? "Reading Clipboard..." : "Paste JSON"}
        </Text>
      </Pressable>
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
  preview: {
    minHeight: 104,
    maxHeight: 156,
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 12,
    backgroundColor: "#111827",
    color: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 11,
    lineHeight: 16,
    textAlignVertical: "top",
  },
  pasteButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#334155",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pasteButtonText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.55,
  },
});
