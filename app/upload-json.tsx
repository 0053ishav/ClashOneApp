import { ConfirmModal } from "@/components/ConfirmModal";
import {
  JsonClipboardInput,
  type ClipboardPasteError,
} from "@/components/JsonClipboardInput";
import { importVillageJson } from "@/services/jsonImport/jsonImportService";
import { getSessionSource, track } from "@/utils/analytics/analytics";
import { emitWidgetUpdate } from "@/utils/widget/widgetEvents";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

export default function UploadJsonScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [shouldReturnHome, setShouldReturnHome] = useState(false);
  const [jsonText, setJsonText] = useState("");

  useEffect(() => {
    track("screen_view", { screen: "upload_json" });
  }, []);

  const refreshWidget = async () => {
    emitWidgetUpdate();
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

  const handleImportVillageData = async () => {
    if (isImporting) return;

    if (!jsonText.trim()) {
      setModalTitle("JSON Missing");
      setModalMessage(
        "Paste your copied village JSON into the preview before syncing.",
      );
      setShouldReturnHome(false);
      setModalVisible(true);
      return;
    }

    try {
      setIsImporting(true);
      track("json_importing", {
        source: getSessionSource(),
        trigger: "upload-json",
      });
      const result = await importVillageJson(jsonText);

      if (result.status === "NO_ACTIVE_BUILDERS") {
        await refreshWidget();
        setModalTitle("Village Synced");
        setModalMessage(
          "No active builders found. All builders are currently free.",
        );
        setShouldReturnHome(true);
        setModalVisible(true);
        return;
      }

      if (result.status === "SUCCESS") {
        await refreshWidget();
        setModalTitle(
          result.skippedExpired > 0
            ? "Village Synced (Partial)"
            : "Village Synced",
        );
        setModalMessage(
          result.skippedExpired > 0
            ? result.activeCount + " upgrades synced.\n" + result.skippedExpired + " expired upgrades were ignored."
            : result.activeCount + " upgrades synced.",
        );
        setShouldReturnHome(true);
        setModalVisible(true);
        return;
      }

      track("json_imported", {
        source: getSessionSource(),
        trigger: "upload-json",
      });
    } catch (error: unknown) {
      console.error("IMPORT ERROR:", error);
      track("json_import_failed", {
        source: getSessionSource(),
        trigger: "upload-json",
      });

      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage === "INVALID_JSON") {
        setModalTitle("Invalid Format");
        setModalMessage(
          "The pasted content is not valid JSON. Copy the correct village export and paste it again.",
        );
      } else if (errorMessage === "INVALID_STRUCTURE") {
        setModalTitle("Invalid Village Data");
        setModalMessage(
          "This does not appear to be valid Clash of Clans export data.",
        );
      } else {
        setModalTitle("Import Failed");
        setModalMessage("Something went wrong while syncing your village.");
      }
      setShouldReturnHome(false);
      setModalVisible(true);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasteError = (error: ClipboardPasteError) => {
    setModalTitle(
      error === "empty" ? "Clipboard Empty" : "Clipboard Unavailable",
    );
    setModalMessage(
      error === "empty"
        ? "No village data found. Copy the village export from the game first."
        : "Could not read the clipboard. Copy the village export again and retry.",
    );
    setShouldReturnHome(false);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color="#f8fafc" />
          </Pressable>
          <View style={styles.topBarText}>
            <Text style={styles.eyebrow}>VILLAGE DATA</Text>
            <Text style={styles.topBarTitle}>Sync your progress</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="sync-outline" size={22} color="#fbbf24" />
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.title}>Bring your village up to date.</Text>
          <Text style={styles.description}>
            Import a fresh game export to refresh your active builder, lab, and
            pet upgrade timers.
          </Text>
        </View>

        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#4ade80" />
          </View>
          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>Private by design</Text>
            <Text style={styles.privacyDescription}>
              Your export is processed on your device and is not uploaded to our servers.
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
        </View>

        <View style={styles.exportCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="document-text-outline" size={18} color="#fbbf24" />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>First, copy your export</Text>
              <Text style={styles.sectionSubtitle}>From inside Clash of Clans</Text>
            </View>
          </View>

          <View style={styles.steps}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepText}>Open Settings → More Settings</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>Find Data Export and tap Copy</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isImporting}
            style={({ pressed }) => [
              styles.openGameButton,
              pressed && styles.pressed,
              isImporting && styles.disabled,
            ]}
            onPress={openClashSettings}
          >
            <Ionicons name="game-controller-outline" size={18} color="#fbbf24" />
            <Text style={styles.openGameButtonText}>Open Clash of Clans</Text>
            <Ionicons name="arrow-up-right" size={16} color="#fbbf24" />
          </Pressable>
        </View>

        <View style={styles.importSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="clipboard-outline" size={18} color="#fbbf24" />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Then paste your data</Text>
              <Text style={styles.sectionSubtitle}>Review the JSON before syncing</Text>
            </View>
          </View>

          <JsonClipboardInput
            value={jsonText}
            onChangeText={setJsonText}
            disabled={isImporting}
            onPasteError={handlePasteError}
          />

          <Pressable
            accessibilityRole="button"
            disabled={isImporting}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              isImporting && styles.disabled,
            ]}
            onPress={handleImportVillageData}
          >
            {isImporting ? (
              <ActivityIndicator color="#172033" />
            ) : (
              <>
                <Ionicons name="sync-outline" size={19} color="#172033" />
                <Text style={styles.primaryButtonText}>Sync village data</Text>
                <Ionicons name="arrow-forward" size={18} color="#172033" />
              </>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isImporting}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
              isImporting && styles.disabled,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerTitle}>Fan-made companion app</Text>
          <Text style={styles.disclaimerText}>
            Clash One is not affiliated with, endorsed, sponsored, or approved by Supercell.
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              Linking.openURL("https://supercell.com/en/fan-content-policy/")
            }
            style={({ pressed }) => [styles.policyLink, pressed && styles.pressed]}
          >
            <Text style={styles.policyLinkText}>Read the Fan Content Policy</Text>
            <Ionicons name="open-outline" size={14} color="#fbbf24" />
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmText="OK"
        cancelText={shouldReturnHome ? "Back to Home" : ""}
        onCancel={() => {
          setModalVisible(false);
          if (shouldReturnHome) router.back();
        }}
        onConfirm={() => {
          setModalVisible(false);
          if (shouldReturnHome) router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  container: {
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 20,
    gap: 22,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#172033",
    borderWidth: 1,
    borderColor: "#2b3850",
  },
  topBarText: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  topBarTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,0.1)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.22)",
  },
  intro: {
    gap: 8,
  },
  title: {
    color: "#f8fafc",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  description: {
    color: "#9aa8bd",
    fontSize: 14,
    lineHeight: 21,
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "rgba(34,197,94,0.07)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.18)",
  },
  privacyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,222,128,0.1)",
  },
  privacyContent: {
    flex: 1,
    gap: 3,
  },
  privacyTitle: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "800",
  },
  privacyDescription: {
    color: "#91a39d",
    fontSize: 11,
    lineHeight: 16,
  },
  exportCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#131e30",
    borderWidth: 1,
    borderColor: "#26344a",
    gap: 15,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(251,191,36,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeadingText: {
    flex: 1,
    gap: 3,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: "#8493aa",
    fontSize: 12,
    lineHeight: 17,
  },
  steps: {
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  stepNumber: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#26344a",
  },
  stepNumberText: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "800",
  },
  stepText: {
    flex: 1,
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 19,
  },
  openGameButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    backgroundColor: "rgba(251,191,36,0.07)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 14,
    marginTop: 1,
  },
  openGameButtonText: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  importSection: {
    gap: 14,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    backgroundColor: "#fbbf24",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#fbbf24",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  primaryButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },
  cancelButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  disclaimerSection: {
    paddingHorizontal: 2,
    paddingTop: 2,
    gap: 6,
  },
  disclaimerTitle: {
    color: "#8493aa",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  disclaimerText: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
  },
  policyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  policyLinkText: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
});
