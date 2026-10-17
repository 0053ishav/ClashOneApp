import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
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
import { JsonClipboardInput, type ClipboardPasteError } from "@/components/JsonClipboardInput";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface JsonImportScreenLayoutProps {
  headerEyebrow: string;
  headerTitle: string;
  headerIcon: IconName;
  introTitle: string;
  introDescription: string;
  exportTitle: string;
  exportSubtitle: string;
  exportSteps: string[];
  pasteTitle: string;
  pasteSubtitle: string;
  actionLabel: string;
  jsonText: string;
  onJsonTextChange: (value: string) => void;
  onPasteError: (error: ClipboardPasteError) => void;
  isImporting: boolean;
  onSync: () => void;
  onBack: () => void;
  onOpenGameError: () => void;
  showPrivacyCard?: boolean;
  showPrivacyFooter?: boolean;
  showCancel?: boolean;
  showDisclaimer?: boolean;
  footer?: ReactNode;
}

export function JsonImportScreenLayout({
  headerEyebrow,
  headerTitle,
  headerIcon,
  introTitle,
  introDescription,
  exportTitle,
  exportSubtitle,
  exportSteps,
  pasteTitle,
  pasteSubtitle,
  actionLabel,
  jsonText,
  onJsonTextChange,
  onPasteError,
  isImporting,
  onSync,
  onBack,
  onOpenGameError,
  showPrivacyCard = false,
  showPrivacyFooter = false,
  showCancel = false,
  showDisclaimer = false,
  footer,
}: JsonImportScreenLayoutProps) {
  const openClashSettings = async () => {
    try {
      await Linking.openURL("https://link.clashofclans.com/en/?action=OpenMoreSettings");
    } catch {
      onOpenGameError();
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={22} color="#f8fafc" />
          </Pressable>
          <View style={styles.topBarText}>
            <Text style={styles.eyebrow}>{headerEyebrow}</Text>
            <Text style={styles.topBarTitle}>{headerTitle}</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name={headerIcon} size={22} color="#fbbf24" />
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.title}>{introTitle}</Text>
          <Text style={styles.description}>{introDescription}</Text>
        </View>

        {showPrivacyCard ? (
          <View style={styles.privacyCard}>
            <View style={styles.privacyIcon}><Ionicons name="shield-checkmark" size={20} color="#4ade80" /></View>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Before you sync</Text>
              <Text style={styles.privacyDescription}>Use a fresh game export to refresh your village progress.</Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
          </View>
        ) : null}

        <View style={styles.exportCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}><Ionicons name="document-text-outline" size={18} color="#fbbf24" /></View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>{exportTitle}</Text>
              <Text style={styles.sectionSubtitle}>{exportSubtitle}</Text>
            </View>
          </View>
          <View style={styles.steps}>
            {exportSteps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" disabled={isImporting} style={({ pressed }) => [styles.openGameButton, pressed && styles.pressed, isImporting && styles.disabled]} onPress={openClashSettings}>
            <Ionicons name="game-controller-outline" size={18} color="#fbbf24" />
            <Text style={styles.openGameButtonText}>Open Clash of Clans</Text>
            <Ionicons name="arrow-up-right-box" size={16} color="#fbbf24" />
          </Pressable>
        </View>

        <View style={styles.importSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}><Ionicons name="clipboard-outline" size={18} color="#fbbf24" /></View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>{pasteTitle}</Text>
              <Text style={styles.sectionSubtitle}>{pasteSubtitle}</Text>
            </View>
          </View>
          <JsonClipboardInput value={jsonText} onChangeText={onJsonTextChange} disabled={isImporting} onPasteError={onPasteError} />
          <Pressable accessibilityRole="button" disabled={isImporting} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, isImporting && styles.disabled]} onPress={onSync}>
            {isImporting ? <ActivityIndicator color="#172033" /> : <>
              <Ionicons name="sync-outline" size={19} color="#172033" />
              <Text style={styles.primaryButtonText}>{actionLabel}</Text>
              <Ionicons name="arrow-forward" size={18} color="#172033" />
            </>}
          </Pressable>
          {showPrivacyFooter ? <View style={styles.privacyFooter}><Ionicons name="shield-checkmark-outline" size={15} color="#4ade80" /><Text style={styles.privacyFooterText}>Your export stays on your device</Text></View> : null}
          {showCancel ? <Pressable accessibilityRole="button" disabled={isImporting} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed, isImporting && styles.disabled]} onPress={onBack}><Text style={styles.cancelText}>Cancel</Text></Pressable> : null}
        </View>
        {showDisclaimer ? (
          <View style={styles.disclaimerSection}>
            <Text style={styles.disclaimerTitle}>Fan-made companion app</Text>
            <Text style={styles.disclaimerText}>Clash One is not affiliated with, endorsed, sponsored, or approved by Supercell.</Text>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL("https://supercell.com/en/fan-content-policy/")} style={({ pressed }) => [styles.policyLink, pressed && styles.pressed]}>
              <Text style={styles.policyLinkText}>Read the Fan Content Policy</Text>
              <Ionicons name="open-outline" size={14} color="#fbbf24" />
            </Pressable>
          </View>
        ) : null}
        {footer}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1220" },
  container: { flexGrow: 1, paddingTop: 12, paddingBottom: 36, paddingHorizontal: 20, gap: 22 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#172033", borderWidth: 1, borderColor: "#2b3850" },
  topBarText: { flex: 1, gap: 3 },
  eyebrow: { color: "#fbbf24", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  topBarTitle: { color: "#f8fafc", fontSize: 20, fontWeight: "800" },
  headerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(251,191,36,0.1)", borderWidth: 1, borderColor: "rgba(251,191,36,0.22)" },
  intro: { gap: 8 },
  title: { color: "#f8fafc", fontSize: 25, lineHeight: 31, fontWeight: "800", letterSpacing: -0.5 },
  description: { color: "#9aa8bd", fontSize: 14, lineHeight: 21 },
  privacyCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderRadius: 16, backgroundColor: "rgba(34,197,94,0.07)", borderWidth: 1, borderColor: "rgba(74,222,128,0.18)" },
  privacyIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(74,222,128,0.1)" },
  privacyContent: { flex: 1, gap: 3 },
  privacyTitle: { color: "#e2e8f0", fontSize: 13, fontWeight: "800" },
  privacyDescription: { color: "#91a39d", fontSize: 11, lineHeight: 16 },
  exportCard: { padding: 16, borderRadius: 20, backgroundColor: "#131e30", borderWidth: 1, borderColor: "#26344a", gap: 15 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(251,191,36,0.12)", alignItems: "center", justifyContent: "center" },
  sectionHeadingText: { flex: 1, gap: 3 },
  sectionTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
  sectionSubtitle: { color: "#8493aa", fontSize: 12, lineHeight: 17 },
  steps: { gap: 12 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  stepNumber: { width: 25, height: 25, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#26344a" },
  stepNumberText: { color: "#fbbf24", fontSize: 12, fontWeight: "800" },
  stepText: { flex: 1, color: "#cbd5e1", fontSize: 13, lineHeight: 19 },
  openGameButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "rgba(251,191,36,0.35)", backgroundColor: "rgba(251,191,36,0.07)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 14, marginTop: 1 },
  openGameButtonText: { color: "#fbbf24", fontSize: 14, fontWeight: "700", flex: 1 },
  importSection: { gap: 14 },
  primaryButton: { minHeight: 54, borderRadius: 16, paddingHorizontal: 18, backgroundColor: "#fbbf24", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: "#fbbf24", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  primaryButtonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: "#172033", fontSize: 15, fontWeight: "800", flex: 1, textAlign: "center" },
  privacyFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: -2 },
  privacyFooterText: { color: "#8493aa", fontSize: 12 },
  cancelButton: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  disclaimerSection: { paddingHorizontal: 2, paddingTop: 2, gap: 6 },
  disclaimerTitle: { color: "#8493aa", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  disclaimerText: { color: "#64748b", fontSize: 11, lineHeight: 16 },
  policyLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  policyLinkText: { color: "#fbbf24", fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
});
