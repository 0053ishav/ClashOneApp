import type { ReEngagementBoostSettings } from "@/types/reEngagementBoost";
import { ConfirmModal } from "@/components/ConfirmModal";
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
  onDelete: () => Promise<boolean>;
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
  target,
  percent,
  onPercentChange,
  duration,
  onDurationChange,
  remainingSeconds,
}: {
  title: string;
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
          <Text style={styles.remainingText}>
            {remainingSeconds > 0 ? formatRemaining(remainingSeconds) + " left" : "Inactive"}
          </Text>
        </View>
      </View>

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
      <Text style={styles.sectionLabel}>Duration</Text>
      <DurationEditor prefix={title} parts={duration} onChange={onDurationChange} />
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
  onDelete,
}: ReEngagementBoostQuickPanelProps) {
  const [now, setNow] = useState(Date.now());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  const handleSave = async () => {
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

  const confirmDelete = () => setShowDeleteConfirm(true);

  const handleDelete = async () => {
    const deleted = await onDelete();
    if (deleted) {
      setShowDeleteConfirm(false);
      onClose();
    }
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
                <Text style={styles.modalSubtitle}>Configure boosts for this account</Text>
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
                  target="builder"
                  percent={builderPercent}
                  onPercentChange={setBuilderPercent}
                  duration={builderDuration}
                  onDurationChange={setBuilderDuration}
                  remainingSeconds={builderSeconds}
                />
                <BoostEditor
                  title="Research Boost"
                  target="research"
                  percent={researchPercent}
                  onPercentChange={setResearchPercent}
                  duration={researchDuration}
                  onDurationChange={setResearchDuration}
                  remainingSeconds={researchSeconds}
                />


                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete saved re-engagement boosts"
                  accessibilityState={{ disabled: saving }}
                  disabled={saving}
                  onPress={confirmDelete}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    saving && styles.saveButtonDisabled,
                    pressed && !saving && styles.pressed,
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color="#f87171" />
                  <Text style={styles.deleteButtonText}>Delete boosts</Text>
                </Pressable>

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
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete re-engagement boosts?"
        message="This removes both saved boosts for the current account. This cannot be undone."
        confirmText="Delete"
        destructive
        variant="dark"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => void handleDelete()}
      />
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
  modalContent: { padding: 16, gap: 12 },
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
  boostCard: {
    paddingVertical: 10,
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#263449",
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
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
    backgroundColor: "rgba(248,113,113,0.08)",
  },
  deleteButtonText: { color: "#f87171", fontSize: 12, fontWeight: "800" },
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
