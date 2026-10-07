import { ConfirmModal } from "@/components/ConfirmModal";
import { importVillageJson } from "@/services/jsonImport/jsonImportService";
import { getSessionSource, track } from "@/utils/analytics/analytics";
import { emitWidgetUpdate } from "@/utils/widget/widgetEvents";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
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

  const handlePasteVillageData = async () => {
    if (isImporting) return;

    try {
      setIsImporting(true);
      track("json_importing", {
        source: getSessionSource(),
        trigger: "upload-json",
      });
      const clipboardText = await Clipboard.getStringAsync();

      if (!clipboardText?.trim()) {
        setModalTitle("Clipboard Empty");
        setModalMessage(
          "No village data found. Please copy data from the game's settings first.",
        );
        setModalVisible(true);
        return;
      }
      const result = await importVillageJson(clipboardText);

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
            ? `${result.activeCount} upgrades synced.\n${result.skippedExpired} expired upgrades were ignored.`
            : `${result.activeCount} upgrades synced.`,
        );
        setShouldReturnHome(true);
        setModalVisible(true);
        return;
      }
      track("json_imported", {
        source: getSessionSource(),
        trigger: "upload-json",
      });
    } catch (error: any) {
      console.error("IMPORT ERROR:", error);

      track("json_import_failed", {
        source: getSessionSource(),
        trigger: "upload-json",
      });

      if (error.message === "INVALID_JSON") {
        setModalTitle("Invalid Format");
        setModalMessage(
          "Clipboard content is not valid JSON. Make sure you copied the correct village export.",
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
      setShouldReturnHome(false);
      setModalVisible(true);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#fbbf24" />
            </Pressable>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Sync Village Data</Text>
              <Text style={styles.headerSubtitle}>
                Keep builder, lab, and pet progress up to date{" "}
              </Text>
            </View>
          </View>

          {/* Security Info */}
          <Animated.View style={[styles.card, styles.securityCard]}>
            <View style={styles.securityContent}>
              <View style={styles.securityIconBg}>
                <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
              </View>
              <View style={styles.securityText}>
                <Text style={styles.securityTitle}>Your data is safe</Text>
                <Text style={styles.securityDescription}>
                  Player data stays on your device. Never uploaded or shared.
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* How to Export */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="book" size={20} color="#fbbf24" />
              <Text style={styles.cardTitle}>How to Export</Text>
            </View>

            <View style={styles.steps}>
              {[
                "Open Clash of Clans",
                "Go to Settings → More Settings",
                'Scroll to Data Export and tap "Copy"',
                "Return here and paste village data",
              ].map((step, index) => (
                <View key={index} style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.step}>{step}</Text>
                </View>
              ))}
            </View>
          </View>

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
              <Text style={styles.uploadButtonText}>
                Open Game → Export Data
              </Text>
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <Pressable
              disabled={isImporting}
              style={({ pressed }) => [
                styles.uploadButton,
                pressed && styles.uploadButtonPressed,
                { opacity: isImporting ? 0.6 : 1 },
              ]}
              onPress={handlePasteVillageData}
            >
              <Ionicons name="clipboard-outline" size={20} color="#0f172a" />
              <Text style={styles.uploadButtonText}>
                {isImporting ? "Syncing..." : "Paste Village Data"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          {/* Disclaimer Section */}
          <View style={styles.disclaimerSection}>
            <Text style={styles.disclaimerTitle}>Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              Clash One is an unofficial fan-made companion app and is not
              affiliated with, endorsed, sponsored, or approved by Supercell.
            </Text>
            <Pressable
              onPress={() =>
                Linking.openURL("https://supercell.com/en/fan-content-policy/")
              }
            >
              <Text
                style={{
                  color: "#fbbf24",
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Fan Content Policy
                <Ionicons name="open-outline" size={14} color="#fbbf24" />
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
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
    backgroundColor: "#0f172a",
  },

  container: {
    paddingTop: 0,
    paddingBottom: 60,
  },

  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerContent: {
    flex: 1,
    gap: 4,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fbbf24",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },

  card: {
    marginHorizontal: 20,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  securityCard: {
    borderWidth: 1.5,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },

  securityContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  securityIconBg: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  securityText: {
    flex: 1,
    gap: 4,
  },

  securityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
  },

  securityDescription: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 18,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f1f5f9",
  },

  steps: {
    gap: 12,
  },

  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fbbf24",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 32,
  },

  stepNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },

  step: {
    fontSize: 14,
    color: "#cbd5e1",
    fontWeight: "500",
    flex: 1,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  infoContent: {
    flex: 1,
    gap: 2,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
  },

  infoDescription: {
    fontSize: 12,
    color: "#94a3b8",
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

  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#334155",
  },

  cancelButtonPressed: {
    opacity: 0.8,
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
  },

  disclaimerSection: {
    marginHorizontal: 20,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#fbbf24",
    backgroundColor: "rgba(251, 191, 36, 0.05)",
    borderRadius: 8,
  },

  disclaimerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fbbf24",
    marginBottom: 6,
  },

  disclaimerText: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 18,
  },
});
