import type { ReEngagementBoostSettings } from "@/types/reEngagementBoost";
import { ENV } from "@/config/env";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useState } from "react";

export type ReEngagementBoostDraft = {
  builderBoostPercent: number;
  builderDurationSeconds: number;
  researchBoostPercent: number;
  researchDurationSeconds: number;
};

type DurationParts = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

type ReEngagementBoostQuickPanelProps = {
  visible: boolean;
  settings: ReEngagementBoostSettings | null;
  loading: boolean;
  loadFailed: boolean;
  saving: boolean;
  onClose: () => void;
  onRetry: () => void;
  onSave: (draft: ReEngagementBoostDraft) => void | Promise<void>;
};

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function getRemainingSeconds(expiresAt: number | null, now: number): number {
  if (expiresAt == null || expiresAt <= now) return 0;
  return Math.max(0, Math.floor((expiresAt - now) / 1_000));
}

function splitDuration(totalSeconds: number): DurationParts {
  let remainder = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(remainder / DAY);
  remainder %= DAY;
  const hours = Math.floor(remainder / HOUR);
  remainder %= HOUR;
  const minutes = Math.floor(remainder / MINUTE);
  remainder %= MINUTE;

  return {
    days: String(days),
    hours: String(hours),
    minutes: String(minutes),
    seconds: String(remainder),
  };
}

function getDurationSeconds(parts: DurationParts): number | null {
  const values = [parts.days, parts.hours, parts.minutes, parts.seconds];
  if (values.some((value) => value.trim() === "")) return null;

  const [days, hours, minutes, seconds] = values.map(Number);
  if (
    !Number.isSafeInteger(days) ||
    !Number.isSafeInteger(hours) ||
    !Number.isSafeInteger(minutes) ||
    !Number.isSafeInteger(seconds) ||
    days < 0 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  const duration = days * DAY + hours * HOUR + minutes * MINUTE + seconds;
  return Number.isSafeInteger(duration) ? duration : null;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "Inactive";
  const duration = splitDuration(seconds);
  const parts = [
    Number(duration.days) > 0 ? `${duration.days}d` : null,
    Number(duration.hours) > 0 ? `${duration.hours}h` : null,
    Number(duration.minutes) > 0 ? `${duration.minutes}m` : null,
    Number(duration.seconds) > 0 ? `${duration.seconds}s` : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(" ") : "Less than 1 second";
}

function NumericField({
  label,
  value,
  onChange,
  maxLength = 9,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={(next) => onChange(next.replace(/[^0-9]/g, "").slice(0, maxLength))}
        keyboardType="number-pad"
        maxLength={maxLength}
        selectTextOnFocus
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#64748b"
      />
    </View>
  );
}

function DurationEditor({
  prefix,
  parts,
  onChange,
}: {
  prefix: string;
  parts: DurationParts;
  onChange: (next: DurationParts) => void;
}) {
  const fields: { key: keyof DurationParts; label: string; maxLength: number }[] = [
    { key: "days", label: "Days", maxLength: 7 },
    { key: "hours", label: "Hours", maxLength: 2 },
    { key: "minutes", label: "Minutes", maxLength: 2 },
    { key: "seconds", label: "Seconds", maxLength: 2 },
  ];

  return (
    <View style={styles.durationRow}>
      {fields.map(({ key, label, maxLength }) => (
        <NumericField
          key={key}
          label={label}
          value={parts[key]}
          maxLength={maxLength}
          accessibilityLabel={`${prefix} boost duration ${label.toLowerCase()}`}
          onChange={(value) => onChange({ ...parts, [key]: value })}
        />
      ))}
    </View>
  );
}

function BoostEditor({
  title,
  description,
  target,
  percent,
  onPercentChange,
  duration,
  onDurationChange,
  remainingSeconds,
}: {
  title: string;
  description: string;
  target: "builder" | "research";
  percent: string;
  onPercentChange: (value: string) => void;
  duration: DurationParts;
  onDurationChange: (next: DurationParts) => void;
  remainingSeconds: number;
}) {
  return (
    <View style={styles.boostCard}>
      <View style={styles.boostHeader}>
        <View style={styles.boostIcon}>
          <Image
            source={{
              uri: `${ENV.CDN_BASE}/v2/home/other/${target === "builder" ? "builder-head.png" : "research.png"}`,
            }}
            contentFit="contain"
            style={styles.boostIconImage}
          />
        </View>
        <View style={styles.boostHeaderText}>
          <Text style={styles.boostTitle}>{title}</Text>
          <Text style={styles.boostDescription}>{description}</Text>
        </View>
        <View style={[styles.statusPill, remainingSeconds > 0 && styles.statusPillActive]}>
          <Text style={[styles.statusText, remainingSeconds > 0 && styles.statusTextActive]}>
            {remainingSeconds > 0 ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <Text style={styles.remainingText}>
        Remaining: {formatRemaining(remainingSeconds)}
      </Text>

      <View style={styles.percentRow}>
        <Text style={styles.sectionLabel}>Boost percentage</Text>
        <View style={styles.percentInputWrap}>
          <TextInput
            accessibilityLabel={`${title} percentage`}
            value={percent}
            onChangeText={(next) => onPercentChange(next.replace(/[^0-9]/g, "").slice(0, 3))}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
            style={styles.percentInput}
            placeholder="0"
            placeholderTextColor="#64748b"
          />
          <Text style={styles.percentSuffix}>%</Text>
        </View>
      </View>
      <Text style={styles.helperText}>Enter any whole percentage from 0 to 100.</Text>

      <Text style={styles.sectionLabel}>Duration to set</Text>
      <DurationEditor prefix={title} parts={duration} onChange={onDurationChange} />
      <Text style={styles.helperText}>Set duration to 0 to deactivate this boost.</Text>
    </View>
  );
}

/** Account-scoped manual control for time-limited return-to-game boosts. */
export function ReEngagementBoostButton({
  onPress,
  disabled = false,
  expanded = false,
}: {
  onPress: () => void;
  disabled?: boolean;
  expanded?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Configure re-engagement boosts"
      accessibilityHint="Set Builder and Research return-to-game boost percentages and durations"
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.trigger,
        disabled && styles.disabled,
        expanded && styles.triggerExpanded,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Image
        source={{ uri: `${ENV.CDN_BASE}/v2/home/other/villager-intro.png` }}
        contentFit="contain"
        style={styles.triggerIconImage}
      />
    </Pressable>
  );
}

export function ReEngagementBoostQuickPanel({
  visible,
  settings,
  loading,
  loadFailed,
  saving,
  onClose,
  onRetry,
  onSave,
}: ReEngagementBoostQuickPanelProps) {
  const [now, setNow] = useState(Date.now());
  const [builderPercent, setBuilderPercent] = useState("0");
  const [researchPercent, setResearchPercent] = useState("0");
  const [builderDuration, setBuilderDuration] = useState<DurationParts>(() => splitDuration(0));
  const [researchDuration, setResearchDuration] = useState<DurationParts>(() => splitDuration(0));

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible || !settings) return;
    const timestamp = Date.now();
    setNow(timestamp);
    setBuilderPercent(String(settings.builderBoostPercent));
    setResearchPercent(String(settings.researchBoostPercent));
    setBuilderDuration(splitDuration(
      getRemainingSeconds(settings.builderBoostExpiresAt, timestamp),
    ));
    setResearchDuration(splitDuration(
      getRemainingSeconds(settings.researchBoostExpiresAt, timestamp),
    ));
  }, [visible, settings]);

  const builderSeconds = settings
    ? getRemainingSeconds(settings.builderBoostExpiresAt, now)
    : 0;
  const researchSeconds = settings
    ? getRemainingSeconds(settings.researchBoostExpiresAt, now)
    : 0;

  const parsedBuilderPercent = builderPercent.trim() === "" ? null : Number(builderPercent);
  const parsedResearchPercent = researchPercent.trim() === "" ? null : Number(researchPercent);
  const builderDurationSeconds = getDurationSeconds(builderDuration);
  const researchDurationSeconds = getDurationSeconds(researchDuration);
  const isDraftValid =
    parsedBuilderPercent !== null &&
    Number.isSafeInteger(parsedBuilderPercent) &&
    parsedBuilderPercent >= 0 &&
    parsedBuilderPercent <= 100 &&
    parsedResearchPercent !== null &&
    Number.isSafeInteger(parsedResearchPercent) &&
    parsedResearchPercent >= 0 &&
    parsedResearchPercent <= 100 &&
    builderDurationSeconds !== null &&
    researchDurationSeconds !== null;

  const handleSave = () => {
    if (
      !isDraftValid ||
      parsedBuilderPercent === null ||
      parsedResearchPercent === null ||
      builderDurationSeconds === null ||
      researchDurationSeconds === null
    ) {
      return;
    }

    await onSave({
      builderBoostPercent: parsedBuilderPercent,
      builderDurationSeconds,
      researchBoostPercent: parsedResearchPercent,
      researchDurationSeconds,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close re-engagement boost settings"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.modalCard}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Image
                  source={{ uri: `${ENV.CDN_BASE}/v2/home/other/villager-intro.png` }}
                  contentFit="contain"
                  style={styles.modalHeaderIconImage}
                />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.modalTitle}>Re-engagement boosts</Text>
                <Text style={styles.modalSubtitle}>Return-to-game upgrade discounts</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close re-engagement boost settings"
                hitSlop={8}
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={19} color="#94a3b8" />
              </Pressable>
            </View>

            <Text style={styles.intro}>
              Enter the perks shown in Clash of Clans when you return after being inactive.
              These reduce eligible upgrade cost and duration, like Gold Pass, and are saved
              separately for each account. Only Home Village upgrades qualify; pets use Research.
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
                    ? "Couldn't load saved re-engagement boosts."
                    : "Choose an account to configure boosts."}
                </Text>
                {loadFailed && (
                  <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                <BoostEditor
                  title="Builder Boost"
                  description="Home Village buildings, heroes, traps, crafted defenses, halls, and guardians."
                  target="builder"
                  percent={builderPercent}
                  onPercentChange={setBuilderPercent}
                  duration={builderDuration}
                  onDurationChange={setBuilderDuration}
                  remainingSeconds={builderSeconds}
                />
                <BoostEditor
                  title="Research Boost"
                  description="Home Village troops, spells, siege machines, and pets."
                  target="research"
                  percent={researchPercent}
                  onPercentChange={setResearchPercent}
                  duration={researchDuration}
                  onDurationChange={setResearchDuration}
                  remainingSeconds={researchSeconds}
                />

                <Text style={styles.helperText}>
                  Expiry is stored as an absolute timestamp, so the remaining duration continues
                  counting down while the app is closed. Re-engagement boosts stack multiplicatively
                  with Gold Pass and Hammer Jam.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save re-engagement boost settings"
                  accessibilityState={{ disabled: saving || !isDraftValid }}
                  disabled={saving || !isDraftValid}
                  onPress={handleSave}
                  style={({ pressed }) => [
                    styles.saveButton,
                    (saving || !isDraftValid) && styles.saveButtonDisabled,
                    pressed && !saving && styles.pressed,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#0f172a" />
                      <Text style={styles.saveButtonText}>Save boosts</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  triggerIconImage: { width: 28, height: 28 },
  modalHeaderIconImage: { width: 32, height: 32 },
  boostIconImage: { width: 28, height: 28 },
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
  triggerExpanded: {
    borderColor: "#fbbf24",
    backgroundColor: "rgba(251,191,36,0.15)",
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.78 },
  overlay: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.78)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "94%",
    borderRadius: 22,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  scroll: { flexGrow: 0 },
  modalContent: { padding: 18, gap: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  modalHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(251,191,36,0.10)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: 2 },
  modalTitle: { color: "#f8fafc", fontSize: 19, fontWeight: "800" },
  modalSubtitle: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#1e293b",
  },
  intro: { color: "#94a3b8", fontSize: 12, lineHeight: 18 },
  boostCard: {
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#263449",
    backgroundColor: "#111c2e",
    gap: 11,
  },
  boostHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  boostIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "rgba(251,191,36,0.10)",
  },
  boostHeaderText: { flex: 1, gap: 2 },
  boostTitle: { color: "#f1f5f9", fontSize: 14, fontWeight: "800" },
  boostDescription: { color: "#94a3b8", fontSize: 11, lineHeight: 15 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: "#1e293b",
  },
  statusPillActive: { backgroundColor: "rgba(52,211,153,0.14)" },
  statusText: { color: "#94a3b8", fontSize: 10, fontWeight: "800" },
  statusTextActive: { color: "#34d399" },
  remainingText: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  percentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  percentInputWrap: {
    width: 88,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 9,
    backgroundColor: "#0b1220",
  },
  percentInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
    paddingVertical: 7,
    textAlign: "right",
  },
  percentSuffix: { color: "#94a3b8", fontSize: 14, fontWeight: "700", marginLeft: 4 },
  helperText: { color: "#64748b", fontSize: 11, lineHeight: 16 },
  durationRow: { flexDirection: "row", gap: 7 },
  field: { flex: 1, gap: 5 },
  fieldLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "700" },
  input: {
    color: "#f8fafc",
    backgroundColor: "#0b1220",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 9,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 3,
    paddingVertical: 8,
  },
  stateRow: { alignItems: "center", gap: 10, paddingVertical: 24 },
  stateText: { color: "#94a3b8", fontSize: 12 },
  errorText: { color: "#fca5a5", fontSize: 12, textAlign: "center" },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#1e293b",
  },
  retryText: { color: "#fbbf24", fontWeight: "800", fontSize: 12 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#fbbf24",
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: "#0f172a", fontSize: 13, fontWeight: "900" },
});
