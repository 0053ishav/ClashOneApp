import { ENV } from "@/config/env";
import type {
  GoldPassBoostPercent,
  GoldPassBoostSettings,
} from "@/types/goldPass";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
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
type DropdownId = "both" | "builder" | "research";

function getPassName(settings: GoldPassBoostSettings | null): string {
  return (settings?.builderBoostPercent ?? 0) > 0 ||
    (settings?.researchBoostPercent ?? 0) > 0
    ? "Gold Pass"
    : "Silver Pass";
}

function PercentageDropdown({
  label,
  selected,
  expanded,
  saving,
  onToggle,
  onSelect,
}: {
  label: string;
  selected: GoldPassBoostPercent | null;
  expanded: boolean;
  saving: boolean;
  onToggle: () => void;
  onSelect: (percent: GoldPassBoostPercent) => void;
}) {
  return (
    <View style={styles.dropdownContainer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected == null ? "not matching" : `${selected}% selected`}`}
        accessibilityHint="Open percentage choices"
        accessibilityState={{ expanded, disabled: saving }}
        disabled={saving}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          expanded && styles.dropdownTriggerExpanded,
          saving && styles.dropdownDisabled,
          pressed && !saving && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.dropdownValue,
            selected == null && styles.dropdownPlaceholder,
          ]}
        >
          {selected == null ? "Choose…" : `${selected}%`}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={expanded ? "#fbbf24" : "#94a3b8"}
        />
      </Pressable>

      {expanded && (
        <View style={styles.dropdownMenu}>
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
                  styles.dropdownOption,
                  selectedOption && styles.dropdownOptionSelected,
                  pressed && !saving && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    selectedOption && styles.dropdownOptionTextSelected,
                  ]}
                >
                  {percent}%
                </Text>
                {selectedOption && (
                  <Ionicons name="checkmark" size={15} color="#0f172a" />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function BoostSelector({
  icon,
  label,
  helper,
  selected,
  expanded,
  saving,
  onToggle,
  onSelect,
}: {
  icon: "builder-boost" | "research-boost";
  label: string;
  helper: string;
  selected: GoldPassBoostPercent;
  expanded: boolean;
  saving: boolean;
  onToggle: () => void;
  onSelect: (percent: GoldPassBoostPercent) => void;
}) {
  return (
    <View style={styles.boostRow}>
      <Image
        source={{ uri: `${ENV.CDN_BASE}/v2/home/other/${icon}.png` }}
        style={styles.boostIcon}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      <View style={styles.boostContent}>
        <View style={styles.boostHeader}>
          <Text style={styles.boostLabel}>{label}</Text>
          <Text style={styles.boostHelper}>{helper}</Text>
        </View>
        <PercentageDropdown
          label={label}
          selected={selected}
          expanded={expanded}
          saving={saving}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      </View>
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
  const [expandedDropdown, setExpandedDropdown] = useState<DropdownId | null>(
    null,
  );

  const builder = settings?.builderBoostPercent ?? 0;
  const research = settings?.researchBoostPercent ?? 0;
  const selectedForBoth: GoldPassBoostPercent | null =
    builder === research ? builder : null;

  const close = () => {
    setExpandedDropdown(null);
    onClose();
  };

  const select = (
    dropdown: DropdownId,
    percent: GoldPassBoostPercent,
  ) => {
    setExpandedDropdown(null);
    if (dropdown === "both") {
      onSetBoth(percent);
    } else if (dropdown === "builder") {
      onSetBuilder(percent);
    } else {
      onSetResearch(percent);
    }
  };

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
              Set your current perks manually. They're not included in village JSON;
              imported remaining timers stay unchanged.
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
                  <View style={styles.setBothText}>
                    <Text style={styles.setBothTitle}>Set both boosts</Text>
                    <Text style={styles.setBothSubtitle}>
                      Apply one percentage to Builder and Research.
                    </Text>
                  </View>
                  {saving && <ActivityIndicator size="small" color="#fbbf24" />}
                  <PercentageDropdown
                    label="both boosts"
                    selected={selectedForBoth}
                    expanded={expandedDropdown === "both"}
                    saving={saving}
                    onToggle={() =>
                      setExpandedDropdown((current) =>
                        current === "both" ? null : "both",
                      )
                    }
                    onSelect={(percent) => select("both", percent)}
                  />
                </View>

                <View style={styles.sectionDivider} />

                <BoostSelector
                  icon="builder-boost"
                  label="Builder Boost"
                  helper="Buildings"
                  selected={settings.builderBoostPercent}
                  expanded={expandedDropdown === "builder"}
                  saving={saving}
                  onToggle={() =>
                    setExpandedDropdown((current) =>
                      current === "builder" ? null : "builder",
                    )
                  }
                  onSelect={(percent) => select("builder", percent)}
                />

                <View style={styles.sectionDivider} />

                <BoostSelector
                  icon="research-boost"
                  label="Research Boost"
                  helper="Laboratory & pets"
                  selected={settings.researchBoostPercent}
                  expanded={expandedDropdown === "research"}
                  saving={saving}
                  onToggle={() =>
                    setExpandedDropdown((current) =>
                      current === "research" ? null : "research",
                    )
                  }
                  onSelect={(percent) => select("research", percent)}
                />
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
  setBothText: { gap: 3 },
  setBothTitle: { color: "#f1f5f9", fontSize: 13, fontWeight: "800" },
  setBothSubtitle: { color: "#94a3b8", fontSize: 10, lineHeight: 14 },
  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#27364d" },
  boostRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  boostIcon: { width: 42, height: 42 },
  boostContent: { flex: 1, gap: 8 },
  boostHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 6,
  },
  boostLabel: { color: "#e2e8f0", fontSize: 12, fontWeight: "800" },
  boostHelper: { color: "#64748b", fontSize: 10 },
  dropdownContainer: { gap: 5 },
  dropdownTrigger: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#111c2e",
    borderWidth: 1,
    borderColor: "#334155",
  },
  dropdownTriggerExpanded: {
    borderColor: "#fbbf24",
    backgroundColor: "#172238",
  },
  dropdownDisabled: { opacity: 0.55 },
  dropdownValue: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  dropdownPlaceholder: { color: "#94a3b8", fontSize: 11 },
  dropdownMenu: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: "#0b1425",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 3,
  },
  dropdownOption: {
    minHeight: 37,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 11,
    borderRadius: 7,
  },
  dropdownOptionSelected: { backgroundColor: "#fbbf24" },
  dropdownOptionText: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  dropdownOptionTextSelected: { color: "#0f172a", fontWeight: "900" },
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
