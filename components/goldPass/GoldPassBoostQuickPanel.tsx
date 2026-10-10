import { ENV } from "@/config/env";
import type {
  GoldPassBoostPercent,
  GoldPassBoostSettings,
} from "@/types/goldPass";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

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
  const isGoldPass =
    (settings?.builderBoostPercent ?? 0) > 0 ||
    (settings?.researchBoostPercent ?? 0) > 0;
  const builder = settings?.builderBoostPercent ?? 0;
  const research = settings?.researchBoostPercent ?? 0;

  return `Configure ${isGoldPass ? "Gold Pass" : "Silver Pass"} boosts. Builder ${builder}%, Research ${research}%.`;
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
    <View style={styles.choices}>
      {PERCENTAGES.map((percent) => {
        const isSelected = selected === percent;
        return (
          <Pressable
            key={percent}
            accessibilityRole="button"
            accessibilityLabel={`Set ${label} to ${percent}%`}
            accessibilityState={{ selected: isSelected, disabled: saving }}
            disabled={saving}
            onPress={() => onSelect(percent)}
            style={({ pressed }) => [
              styles.choice,
              isSelected && styles.choiceSelected,
              saving && styles.choiceDisabled,
              pressed && !saving && styles.pressed,
            ]}
          >
            <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>
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
  selected,
  saving,
  onSelect,
}: {
  icon: "builder-boost" | "research-boost";
  label: string;
  selected: GoldPassBoostPercent;
  saving: boolean;
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
          <Text style={styles.boostValue}>{selected}%</Text>
        </View>
        <PercentageChoices
          label={label}
          selected={selected}
          saving={saving}
          onSelect={onSelect}
        />
      </View>
    </View>
  );
}

/**
 * Inline, non-modal quick panel shared by Settings and Home. It uses the
 * player's manually saved account settings because Gold Pass percentages
 * are not included in the village JSON export.
 */
export function GoldPassBoostQuickPanel({
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
  const isGoldPass =
    (settings?.builderBoostPercent ?? 0) > 0 ||
    (settings?.researchBoostPercent ?? 0) > 0;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Image
          source={{ uri: getPassIconUri(settings) }}
          style={styles.panelPassIcon}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
        <View style={styles.panelHeading}>
          <Text style={styles.panelTitle}>Pass boosts</Text>
          <Text style={styles.panelSubtitle}>
            {isGoldPass ? "Gold Pass configured" : "Silver Pass · no boosts selected"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close pass boosts"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={17} color="#94a3b8" />
        </Pressable>
      </View>

      <Text style={styles.helperText}>
        Set your current perks manually. They're not included in village JSON, and
        imported remaining timers are kept unchanged.
      </Text>

      {loading ? (
        <View style={styles.stateRow}>
          <ActivityIndicator size="small" color="#fbbf24" />
          <Text style={styles.stateText}>Loading saved boosts…</Text>
        </View>
      ) : loadFailed || !settings ? (
        <View style={styles.stateRow}>
          <Text style={styles.errorText}>
            {loadFailed ? "Couldn't load saved boosts." : "Choose an account to configure boosts."}
          </Text>
          {loadFailed && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading pass boosts"
              onPress={onRetry}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <View style={styles.setBothRow}>
            <View style={styles.setBothHeader}>
              <Text style={styles.sectionLabel}>SET BOTH</Text>
              {saving && <Text style={styles.savingText}>Saving…</Text>}
            </View>
            <PercentageChoices
              label="both pass boosts"
              selected={
                settings.builderBoostPercent === settings.researchBoostPercent
                  ? settings.builderBoostPercent
                  : null
              }
              saving={saving}
              onSelect={onSetBoth}
            />
          </View>
          <BoostSelector
            icon="builder-boost"
            label="Builder Boost"
            selected={settings.builderBoostPercent}
            saving={saving}
            onSelect={onSetBuilder}
          />
          <View style={styles.panelDivider} />
          <BoostSelector
            icon="research-boost"
            label="Research Boost"
            selected={settings.researchBoostPercent}
            saving={saving}
            onSelect={onSetResearch}
          />
        </>
      )}
    </View>
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
  panel: {
    marginTop: 8,
    marginHorizontal: 14,
    padding: 13,
    borderRadius: 15,
    backgroundColor: "#111c2e",
    borderWidth: 1,
    borderColor: "#34445c",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
    gap: 10,
  },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  panelPassIcon: { width: 34, height: 34 },
  panelHeading: { flex: 1, gap: 2 },
  panelTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "800" },
  panelSubtitle: { color: "#94a3b8", fontSize: 10 },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  helperText: { color: "#94a3b8", fontSize: 10, lineHeight: 15 },
  setBothRow: { gap: 6 },
  setBothHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { color: "#64748b", fontSize: 9, letterSpacing: 0.7, fontWeight: "800" },
  savingText: { color: "#fbbf24", fontSize: 10, fontWeight: "700" },
  choices: { flexDirection: "row", gap: 6 },
  choice: {
    flex: 1,
    minWidth: 0,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 2,
    backgroundColor: "#0b1425",
    borderWidth: 1,
    borderColor: "#334155",
  },
  choiceSelected: { backgroundColor: "#fbbf24", borderColor: "#fbbf24" },
  choiceDisabled: { opacity: 0.55 },
  choiceText: { color: "#cbd5e1", fontSize: 11, fontWeight: "800" },
  choiceTextSelected: { color: "#0f172a" },
  boostRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  boostIcon: { width: 32, height: 32 },
  boostContent: { flex: 1, gap: 7 },
  boostHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  boostLabel: { color: "#e2e8f0", fontSize: 12, fontWeight: "700" },
  boostValue: { color: "#fbbf24", fontSize: 12, fontWeight: "900" },
  panelDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#334155" },
  stateRow: { flexDirection: "row", alignItems: "center", gap: 9, flexWrap: "wrap" },
  stateText: { color: "#cbd5e1", fontSize: 11 },
  errorText: { color: "#fca5a5", fontSize: 11, flex: 1 },
  retryButton: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8, backgroundColor: "#1e293b" },
  retryText: { color: "#fbbf24", fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.65 },
});
