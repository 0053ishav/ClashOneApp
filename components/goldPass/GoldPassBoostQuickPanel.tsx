import { ENV } from "@/config/env";
import type {
  GoldPassBoostPercent,
  GoldPassBoostSettings,
} from "@/types/goldPass";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type GoldPassBoostButtonProps = {
  settings: GoldPassBoostSettings | null;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  expanded?: boolean;
};

function getPassIconUri(settings: GoldPassBoostSettings | null): string {
  const hasActiveBoost =
    (settings?.builderBoostPercent ?? 0) > 0 ||
    (settings?.researchBoostPercent ?? 0) > 0;

  return `${ENV.CDN_BASE}/v2/home/other/${hasActiveBoost ? "gold-pass" : "silver-pass"}.png`;
}

function getPassAccessibilityLabel(settings: GoldPassBoostSettings | null): string {
  const hasActiveBoost =
    (settings?.builderBoostPercent ?? 0) > 0 ||
    (settings?.researchBoostPercent ?? 0) > 0;
  const builder = settings?.builderBoostPercent ?? 0;
  const research = settings?.researchBoostPercent ?? 0;

  return `Configure ${hasActiveBoost ? "Gold Pass" : "Silver Pass"} boosts. Builder ${builder}%, Research ${research}%.`;
}

export function GoldPassBoostButton({
  settings,
  onPress,
  disabled = false,
  compact = false,
  expanded = false,
}: GoldPassBoostButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={getPassAccessibilityLabel(settings)}
      accessibilityHint="Choose Builder and Research upgrade-time discounts"
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.trigger,
        compact && styles.triggerCompact,
        disabled && styles.triggerDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Image
        source={{ uri: getPassIconUri(settings) }}
        style={[styles.triggerIcon, compact && styles.triggerIconCompact]}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    </Pressable>
  );
}

type GoldPassBoostQuickPanelProps = {
  visible: boolean;
  settings: GoldPassBoostSettings | null;
  loading: boolean;
  loadFailed: boolean;
  saving: boolean;
  onClose: () => void;
  onRetry: () => void;
  onSetBoth: (percent: GoldPassBoostPercent) => void;
  onSetBuilder: (percent: GoldPassBoostPercent) => void;
  onSetResearch: (percent: GoldPassBoostPercent) => void;
};

const PERCENTAGES: readonly GoldPassBoostPercent[] = [0, 10, 15, 20];

function getPassName(settings: GoldPassBoostSettings | null): string {
  return (settings?.builderBoostPercent ?? 0) > 0 ||
    (settings?.researchBoostPercent ?? 0) > 0
    ? "Gold Pass"
    : "Silver Pass";
}

function PercentageChoices({
  label,
  selected,
  saving,
  onSelect,
}: {
  label: string;
  selected: GoldPassBoostPercent | null;
  saving: boolean;
  onSelect: (percent: GoldPassBoostPercent) => void;
}) {
  return (
    <View style={styles.percentageChoices}>
      {PERCENTAGES.map((percent) => {
        const selectedOption = selected === percent;
        return (
          <Pressable
            key={percent}
            accessibilityRole="button"
            accessibilityLabel={`Set ${label} to ${percent}%`}
            accessibilityState={{ selected: selectedOption, disabled: saving }}
            disabled={saving}
            onPress={() => onSelect(percent)}
            style={({ pressed }) => [
              styles.percentageChoice,
              selectedOption && styles.percentageChoiceSelected,
              saving && styles.choiceDisabled,
              pressed && !saving && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.percentageChoiceText,
                selectedOption && styles.percentageChoiceTextSelected,
              ]}
            >
              {percent}%
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BoostSelector({
  icon,
  label,
  helper,
  selected,
  saving,
  onSelect,
}: {
  icon: "builder-boost" | "research-boost";
  label: string;
  helper: string;
  selected: GoldPassBoostPercent;
  saving: boolean;
  onSelect: (percent: GoldPassBoostPercent) => void;
}) {
  return (
    <View style={styles.boostColumn}>
      <View style={styles.boostHeader}>
        <Image
          source={{ uri: `${ENV.CDN_BASE}/v2/home/other/${icon}.png` }}
          style={styles.boostIcon}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
        <View style={styles.boostHeaderText}>
          <Text style={styles.boostLabel}>{label}</Text>
          <Text style={styles.boostHelper}>{helper}</Text>
        </View>
      </View>
      <PercentageChoices
        label={label}
        selected={selected}
        saving={saving}
        onSelect={onSelect}
      />
    </View>
  );
}

/** A centered, compact pass-boost editor shared by Settings and Home. */
export function GoldPassBoostQuickPanel({
  visible,
  settings,
  loading,
  loadFailed,
  saving,
  onClose,
  onRetry,
  onSetBoth,
  onSetBuilder,
  onSetResearch,
}: GoldPassBoostQuickPanelProps) {
  const builder = settings?.builderBoostPercent ?? 0;
  const research = settings?.researchBoostPercent ?? 0;
  const selectedForBoth: GoldPassBoostPercent | null =
    builder === research ? builder : null;

  const close = onClose;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close pass boost settings"
          style={StyleSheet.absoluteFill}
          onPress={close}
        />
        <View style={styles.modalCard}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <Image
                source={{ uri: getPassIconUri(settings) }}
                style={styles.headerPassIcon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <View style={styles.headerCopy}>
                <Text style={styles.modalTitle}>Pass boosts</Text>
                <Text style={styles.modalSubtitle}>
                  {getPassName(settings)} · upgrade-time discounts
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close pass boost settings"
                hitSlop={8}
                onPress={close}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={18} color="#94a3b8" />
              </Pressable>
            </View>

            <Text style={styles.description}>
              Set your active Home Village perks manually and update them when they change or expire.
              Builder Boost applies to Home Village buildings, heroes, traps, walls, crafted defenses, halls, and guardians. Research Boost applies to Laboratory troops, spells, siege machines, and pets.
              Gold Pass perk percentages aren&apos;t in Clash of Clans API player data or village JSON, and imported remaining timers stay unchanged.
            </Text>

            {loading ? (
              <View style={styles.stateRow}>
                <ActivityIndicator size="small" color="#fbbf24" />
                <Text style={styles.stateText}>Loading saved boosts…</Text>
              </View>
            ) : loadFailed || !settings ? (
              <View style={styles.stateRow}>
                <Text style={styles.errorText}>
                  {loadFailed
                    ? "Couldn't load saved boosts."
                    : "Choose an account to configure boosts."}
                </Text>
                {loadFailed && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading pass boosts"
                    onPress={onRetry}
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                <View style={styles.setBothCard}>
                  <View style={styles.setBothHeader}>
                    <View style={styles.setBothText}>
                      <Text style={styles.setBothTitle}>Set both boosts</Text>
                      <Text style={styles.setBothSubtitle}>
                        Apply one percentage to Builder and Research.
                      </Text>
                    </View>
                    {saving && <ActivityIndicator size="small" color="#fbbf24" />}
                  </View>
                  <PercentageChoices
                    label="both boosts"
                    selected={selectedForBoth}
                    saving={saving}
                    onSelect={onSetBoth}
                  />
                </View>

                <View style={styles.sectionDivider} />

                <View style={styles.boostSelectorsRow}>
                  <BoostSelector
                    icon="builder-boost"
                    label="Builder Boost"
                    helper="Buildings"
                    selected={settings.builderBoostPercent}
                    saving={saving}
                    onSelect={onSetBuilder}
                  />

                  <View style={styles.boostColumnDivider} />

                  <BoostSelector
                    icon="research-boost"
                    label="Research Boost"
                    helper="Laboratory"
                    selected={settings.researchBoostPercent}
                    saving={saving}
                    onSelect={onSetResearch}
                  />
                </View>
              </>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerHint}>
                Changes save automatically for this village.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={close}
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.24)",
  },
  triggerCompact: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#111c2e",
    borderColor: "#263449",
  },
  triggerIcon: { width: 29, height: 29 },
  triggerIconCompact: { width: 25, height: 25 },
  triggerDisabled: { opacity: 0.4 },
  overlay: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.78)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "88%",
    borderRadius: 20,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  modalScroll: { flexShrink: 1 },
  modalContent: { padding: 18, gap: 15 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerPassIcon: { width: 42, height: 42 },
  headerCopy: { flex: 1, gap: 3 },
  modalTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },
  modalSubtitle: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  description: { color: "#94a3b8", fontSize: 11, lineHeight: 16 },
  setBothCard: {
    padding: 11,
    borderRadius: 13,
    backgroundColor: "#172238",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  setBothHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  setBothText: { flex: 1, minWidth: 0, gap: 3 },
  setBothTitle: { color: "#f1f5f9", fontSize: 13, fontWeight: "800" },
  setBothSubtitle: { color: "#94a3b8", fontSize: 10, lineHeight: 14 },
  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#27364d" },
  boostSelectorsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    zIndex: 1,
  },
  boostColumn: {
    flex: 1,
    minWidth: 0,
    gap: 10,
    paddingVertical: 4,
  },
  boostColumnDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "#27364d",
    marginVertical: 3,
  },
  boostIcon: { width: 34, height: 34 },
  boostHeader: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 38 },
  boostHeaderText: { flex: 1, minWidth: 0, gap: 3 },
  boostLabel: { color: "#e2e8f0", fontSize: 11, fontWeight: "800" },
  boostHelper: { color: "#64748b", fontSize: 9 },
  percentageChoices: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 3,
    width: "100%",
  },
  percentageChoice: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 1,
    borderRadius: 7,
    backgroundColor: "#0b1425",
    borderWidth: 1,
    borderColor: "#334155",
  },
  percentageChoiceSelected: {
    backgroundColor: "#fbbf24",
    borderColor: "#fbbf24",
  },
  choiceDisabled: { opacity: 0.55 },
  percentageChoiceText: {
    color: "#cbd5e1",
    fontSize: 9,
    fontWeight: "800",
  },
  percentageChoiceTextSelected: {
    color: "#0f172a",
    fontWeight: "900",
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
    paddingVertical: 6,
  },
  stateText: { color: "#cbd5e1", fontSize: 11 },
  errorText: { flex: 1, color: "#fca5a5", fontSize: 11, lineHeight: 16 },
  retryButton: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#1e293b",
  },
  retryText: { color: "#fbbf24", fontSize: 11, fontWeight: "800" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 3,
  },
  footerHint: { flex: 1, color: "#64748b", fontSize: 10, lineHeight: 14 },
  doneButton: {
    minWidth: 78,
    minHeight: 38,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#fbbf24",
  },
  doneButtonText: { color: "#0f172a", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.65 },
});
