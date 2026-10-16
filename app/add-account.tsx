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
            <Text style={styles.eyebrow}>ACCOUNT SETUP</Text>
            <Text style={styles.topBarTitle}>Add your village</Text>
          </View>
          <View style={styles.headerIcon}>
            <Image
              source={require("@/assets/images/clash/hammer.png")}
              style={styles.headerImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.title}>Your upgrades, in sync.</Text>
          <Text style={styles.description}>
            Import your Clash of Clans village export to start tracking builder,
            laboratory, and pet upgrades.
          </Text>
        </View>

        <View style={styles.stepsCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="cloud-download-outline" size={18} color="#fbbf24" />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>1. Export village data</Text>
              <Text style={styles.sectionSubtitle}>It only takes a moment</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <Text style={styles.stepText}>Open Clash of Clans settings</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <Text style={styles.stepText}>Choose More Settings → Data Export</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <Text style={styles.stepText}>Tap Copy, then return here</Text>
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
            <Ionicons name="open-outline" size={18} color="#fbbf24" />
            <Text style={styles.openGameButtonText}>Open Clash of Clans</Text>
            <Ionicons name="arrow-up-right" size={16} color="#fbbf24" />
          </Pressable>
        </View>

        <View style={styles.importSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="code-slash-outline" size={18} color="#fbbf24" />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>2. Add your JSON</Text>
              <Text style={styles.sectionSubtitle}>Paste the copied export below</Text>
            </View>
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

          <Pressable
            accessibilityRole="button"
            disabled={isImporting}
            onPress={handleImport}
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
              isImporting && styles.disabled,
            ]}
          >
            {isImporting ? (
              <ActivityIndicator color="#172033" />
            ) : (
              <>
                <Ionicons name="sync-outline" size={19} color="#172033" />
                <Text style={styles.ctaText}>Sync village</Text>
                <Ionicons name="arrow-forward" size={18} color="#172033" />
              </>
            )}
          </Pressable>
          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#4ade80" />
            <Text style={styles.privacyText}>Your export stays on your device</Text>
          </View>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmText="OK"
        cancelText={""}
        onCancel={() => {
          setModalVisible(false);
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
    backgroundColor: "#0b1220",
  },
  container: {
    flexGrow: 1,
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
  headerImage: {
    width: 38,
    height: 38,
    transform: [{ rotate: "270deg" }],
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
  stepsCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#131e30",
    borderWidth: 1,
    borderColor: "#26344a",
    gap: 14,
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
    marginTop: 2,
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
  cta: {
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
  ctaPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: -2,
  },
  privacyText: {
    color: "#8493aa",
    fontSize: 12,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
});
