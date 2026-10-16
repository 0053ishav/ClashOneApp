"use no memo";

import { ConfirmModal } from "@/components/ConfirmModal";
import {
  JsonClipboardInput,
  type ClipboardPasteError,
} from "@/components/JsonClipboardInput";
import { importVillageJson } from "@/services/jsonImport/jsonImportService";
import { getNotificationsEnabled } from "@/storage/notificationConfig";
import { getSessionSource, track } from "@/utils/analytics/analytics";
import { emitWidgetUpdate } from "@/utils/widget/widgetEvents";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddAccountScreen() {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [tag, setTag] = useState("");
  const [jsonText, setJsonText] = useState("");

  const [modalVisible, setModalVisible] = useState(false);

  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const refreshWidget = async () => {
    emitWidgetUpdate();
  };

  const handleImport = async () => {
    if (isImporting) return;

    try {
      setIsImporting(true);

      track("account_add_started", {
        source: getSessionSource(),
        trigger: "add-account",
      });

      const clipboardText = jsonText;

      if (!clipboardText.trim()) {
        setModalTitle("JSON Missing");
        setModalMessage(
          "Paste your copied village JSON into the preview before importing.",
        );
        setModalVisible(true);
        return;
      }
      // await cancelAllNotifications();
      const result = await importVillageJson(clipboardText);
      if (result.status === "NO_ACTIVE_BUILDERS") {
        await refreshWidget();
        setShouldNavigate(true);

        setTag(result.tag);
        setModalTitle("Village Synced");
        setModalMessage(
          "No active builders found. All builders are currently free.",
        );
        setModalVisible(true);
        return;
      }

      if (result.status === "SUCCESS") {
        await refreshWidget();
        setShouldNavigate(true);

        setTag(result.tag);
        if (getNotificationsEnabled()) {
          // await rescheduleAllBuilderNotifications();
        }

        setModalTitle(
          result.skippedExpired > 0
            ? "Village Synced (Partial)"
            : "Village Synced",
        );

        setModalMessage(
          result.skippedExpired > 0
            ? `${result.activeCount} upgrades synced.\n${result.skippedExpired} expired upgrades were ignored.`
            : `${result.activeCount} upgrades synced.`,
        );
        setModalVisible(true);
        return;
      }
      track("account_added", {
        source: getSessionSource(),
        trigger: "add-account",
      });
    } catch (error: any) {
      setShouldNavigate(false);

      track("account_add_failed", {
        error: error,
        trigger: "add-account",
      });

      if (error.message === "INVALID_JSON") {
        setModalTitle("Invalid Format");
        setModalMessage(
          "The pasted content is not valid JSON. Copy the correct village export and paste it again.",
        );
      } else if (error.message === "INVALID_STRUCTURE") {
        setModalTitle("Invalid Village Data");
        setModalMessage(
          "This does not appear to be valid Clash of Clans export data.",
        );
      } else {
        setModalTitle("Import Failed");
        setModalMessage("Something went wrong while syncing your village.");
      }
      setModalVisible(true);
    } finally {
      setIsImporting(false);
    }
  };

  const openClashSettings = async () => {
    const url = "https://link.clashofclans.com/en/?action=OpenMoreSettings";

    try {
      await Linking.openURL(url);
    } catch {
      setModalTitle("Unable to open Clash of Clans");
      setModalMessage(
        "Please open the game manually and go to Settings → More Settings.",
      );
      setModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* 🔹 Icon */}
        <View style={styles.iconWrapper}>
          <Image
            source={require("@/assets/images/clash/hammer.png")}
            style={styles.headerImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>

        {/* 🔹 Title */}
        <Text style={styles.title}>Add Your Village</Text>

        {/* 🔹 Description */}
        <Text style={styles.description}>
          Track upgrades automatically{"\n"}
          and never waste builder time
        </Text>

        {/* Open Game Button */}
        {/* Open Game Button */}
        <View style={styles.buttonGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.uploadButton,
              pressed && styles.uploadButtonPressed,
            ]}
            onPress={openClashSettings}
          >
            <Ionicons name="open-outline" size={20} color="#0f172a" />
            <Text style={styles.uploadButtonText}>Open Game → Export Data</Text>
          </Pressable>
        </View>

        <JsonClipboardInput
          value={jsonText}
          onChangeText={setJsonText}
          disabled={isImporting}
          onPasteError={(error: ClipboardPasteError) => {
            setModalTitle(
              error === "empty" ? "Clipboard Empty" : "Clipboard Unavailable",
            );
            setModalMessage(
              error === "empty"
                ? "No village data found. Copy the village export from the game first."
                : "Could not read the clipboard. Copy the village export again and retry.",
            );
            setModalVisible(true);
          }}
        />

        {/* 🔹 CTA */}
        <View style={styles.buttonGroup}>
          <Pressable
            onPress={handleImport}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          >
            {isImporting ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.ctaText}>Upload JSON</Text>
            )}
          </Pressable>
        </View>

        {/* 🔹 Trust */}
        <View style={styles.trustBox}>
          <Text style={styles.trustTitle}>How it works:</Text>
          <Text style={styles.trustText}>
            • Export from Clash of Clans{"\n"}• Upload here{"\n"}• Start
            tracking instantly
          </Text>
        </View>

        {/* 🔹 Micro trust */}
        <Text style={styles.microTrust}>No login required</Text>
        {/* <Text style={styles.microTrust}>
          No login required • Data stays on device
        </Text> */}
      </ScrollView>
      <ConfirmModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmText="OK"
        cancelText={""}
        onCancel={() => {
          setModalVisible(false);
          // if (shouldReturnHome) router.back();
        }}
        onConfirm={() => {
          setModalVisible(false);
          if (!shouldNavigate) return;
          router.replace({
            pathname: "/value",
            params: { tag },
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 24,
  },

  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },

  headerImage: {
    width: 100,
    height: 100,
    transform: [{ rotate: "270deg" }],
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fbbf24",
    textAlign: "center",
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },

  buttonGroup: {
    marginHorizontal: 20,
    marginTop: 8,
    gap: 10,
  },

  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  uploadButtonPressed: {
    opacity: 0.85,
  },

  uploadButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },

  cta: {
    height: 52,
    backgroundColor: "#fbbf24",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },

  error: {
    color: "#f87171",
    textAlign: "center",
    marginTop: 12,
    fontSize: 13,
  },

  trustBox: {
    marginTop: 28,
    alignItems: "center",
  },

  trustTitle: {
    fontSize: 13,
    color: "#cbd5e1",
    marginBottom: 6,
  },

  trustText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },

  microTrust: {
    marginTop: 20,
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
  },
});
