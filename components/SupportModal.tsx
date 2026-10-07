import { ENV } from "@/config/env";
import { requestGalleryPermission } from "@/services/images/imagePicker";
import { convertImagesToBase64 } from "@/services/images/supportAttachmentService";
import { track } from "@/utils/analytics/analytics";
import { log } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ConfirmModal } from "./ConfirmModal";

type Props = {
  visible: boolean;
  onClose: () => void;
  debugInfo: string;
};

const CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Widget Issue",
  "Notification Issue",
  "Village Import",
  "General Feedback",
];

export function SupportModal({ visible, onClose, debugInfo }: Props) {
  const [category, setCategory] = useState("Bug Report");

  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");

  const [sending, setSending] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const [includeDebugInfo, setIncludeDebugInfo] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const sendEmail = async () => {
    if (sending) return;
    try {
      setSending(true);

      const supportId = Crypto.randomUUID();

      track("support_submitted", {
        support_id: supportId,
        category,
        app_version: Application.nativeApplicationVersion,
      });

      const screenshots = await convertImagesToBase64(attachments);
      const response = await fetch(ENV.BACKEND_EMAIL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supportId,
          replyEmail,
          category,
          message,
          debugInfo: includeDebugInfo ? debugInfo : undefined,
          screenshots,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error("Failed");
      }

      setMessage("");
      setAttachments([]);
      setShowSuccessModal(true);
    } catch (error) {
      log(error);
      setShowErrorModal(true);
    } finally {
      setSending(false);
    }
  };

  const pickImages = async () => {
    const granted = await requestGalleryPermission();

    if (!granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 3,
      quality: 0.7,
    });

    if (result.canceled) return;

    setAttachments((prev) =>
      [...prev, ...result.assets.map((asset) => asset.uri)].slice(0, 3),
    );
  };
  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.container}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              nestedScrollEnabled
              contentContainerStyle={{
                paddingBottom: 40,
              }}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Support & Feedback</Text>

                <Pressable onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </Pressable>
              </View>

              <Text style={styles.label}>Category</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setCategory(item);
                    }}
                    style={[
                      styles.chip,
                      category === item && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        category === item && styles.chipTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* <Text style={styles.label}>Subject</Text> */}

              {/* <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Short summary"
              placeholderTextColor="#64748b"
              style={styles.input}
            /> */}

              <Text style={styles.label}>Reply Email (Recommended)</Text>

              <TextInput
                value={replyEmail}
                onChangeText={setReplyEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@example.com"
                placeholderTextColor="#64748b"
                style={styles.input}
              />

              <Text style={styles.label}>Message</Text>

              <TextInput
                multiline
                value={message}
                onChangeText={setMessage}
                placeholder="Describe the issue or feedback..."
                placeholderTextColor="#64748b"
                style={styles.messageInput}
              />
              <Text
                style={{
                  color: "#64748b",
                  fontSize: 12,
                  marginTop: 6,
                  textAlign: "right",
                }}
              >
                {message.length}/1000
              </Text>

              {message.trim().length > 0 && (
                <Text
                  style={{
                    color: message.trim().length < 10 ? "#f59e0b" : "#22c55e",
                    fontSize: 12,
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {message.trim().length < 10
                    ? `${10 - message.trim().length} more characters required`
                    : "Ready to send"}
                </Text>
              )}

              <Text style={styles.label}>Screenshots (Optional)</Text>

              <Pressable
                style={styles.attachButton}
                onPress={pickImages}
                disabled={attachments.length >= 3}
              >
                <Ionicons name="image-outline" size={18} color="#fbbf24" />

                <Text style={styles.attachText}>
                  {attachments.length >= 3
                    ? "Maximum 3 screenshots"
                    : "Add Screenshots"}
                </Text>
              </Pressable>

              <Text style={styles.attachmentCount}>
                {attachments.length}/3 screenshots selected
              </Text>

              {attachments.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 12 }}
                >
                  {attachments.map((uri) => (
                    <View key={uri} style={styles.attachmentPreview}>
                      <Image
                        source={{ uri }}
                        style={styles.attachmentImage}
                        contentFit="cover"
                      />

                      <Pressable
                        style={styles.removeAttachmentButton}
                        onPress={() =>
                          setAttachments((prev) =>
                            prev.filter((item) => item !== uri),
                          )
                        }
                      >
                        <Ionicons name="close" size={12} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.label}>Privacy</Text>

              <View style={styles.privacyCard}>
                <Text style={styles.privacyText}>
                  Diagnostic information helps us investigate issues faster. You
                  can review exactly what will be shared before sending.
                </Text>

                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setIncludeDebugInfo(!includeDebugInfo)}
                >
                  <Ionicons
                    name={includeDebugInfo ? "checkbox" : "square-outline"}
                    size={22}
                    color="#fbbf24"
                  />

                  <Text style={styles.checkboxText}>
                    Include diagnostic information (Recommended)
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.debugButton}
                  onPress={() => setShowDebugInfo(true)}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#fbbf24"
                  />

                  <Text style={styles.debugText}>
                    Review Diagnostic Information
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.debugButton}
                  onPress={() => Clipboard.setStringAsync(debugInfo)}
                >
                  <Ionicons name="copy-outline" size={18} color="#fbbf24" />

                  <Text style={styles.debugText}>
                    Copy Diagnostic Information
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setConsentGiven(!consentGiven)}
              >
                <Ionicons
                  name={consentGiven ? "checkbox" : "square-outline"}
                  size={22}
                  color="#fbbf24"
                />

                <Text style={styles.checkboxText}>
                  I consent to Clash One processing the information I choose to
                  submit, including my message, optional diagnostic information
                  and any screenshots, to investigate my support request.
                </Text>
              </Pressable>

              <View style={styles.guidelines}>
                <Text style={styles.guidelineTitle}>Helpful Information</Text>

                <Text style={styles.guidelineText}>• What happened?</Text>

                <Text style={styles.guidelineText}>• What did you expect?</Text>

                <Text style={styles.guidelineText}>• Steps to reproduce</Text>

                <Text style={styles.guidelineText}>
                  • Screenshots help a lot.
                </Text>

                <Text style={styles.guidelineText}>
                  Diagnostic information helps us investigate issues faster.
                  Before sending, you can review exactly what information will
                  be shared. Only information required to troubleshoot your
                  request is included.
                </Text>
              </View>

              <Pressable
                disabled={
                  message.trim().length < 10 || sending || !consentGiven
                }
                style={[
                  styles.sendButton,
                  (message.trim().length < 10 || sending || !consentGiven) && {
                    opacity: 0.45,
                  },
                ]}
                onPress={sendEmail}
              >
                <Text style={styles.sendText}>
                  {sending ? "Sending Feedback..." : "Send Feedback"}
                </Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <View
                style={{
                  alignItems: "center",
                  marginTop: 24,
                  paddingTop: 20,
                  borderTopWidth: 1,
                  borderTopColor: "#1e293b",
                }}
              >
                <Text style={styles.aboutTitle}>Clash One</Text>

                <Text style={styles.aboutVersion}>
                  v{Application.nativeApplicationVersion}
                </Text>

                <Text
                  style={{
                    color: "#64748b",
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  support@clashwidget.online
                </Text>
                <Text
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    marginTop: 4,
                  }}
                >
                  We typically respond within 48 hours.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ConfirmModal
        visible={showSuccessModal}
        title="Feedback Sent"
        message="Thanks for helping improve Clash One. Your feedback has been sent successfully."
        confirmText="Done"
        cancelText=""
        onConfirm={() => {
          setShowSuccessModal(false);

          setMessage("");
          setCategory("Bug Report");
          setAttachments([]);
          setIncludeDebugInfo(true);
          setConsentGiven(false);
          setShowDebugInfo(false);
          onClose();
        }}
        onCancel={() => {}}
      />
      <ConfirmModal
        visible={showErrorModal}
        title="Failed to Send"
        message="We couldn't send your feedback right now. Please try again in a moment."
        confirmText="OK"
        cancelText=""
        onConfirm={() => {
          setShowErrorModal(false);
        }}
        onCancel={() => {}}
      />

      <Modal visible={showDebugInfo} animationType="slide">
        <View style={styles.debugContainer}>
          <View style={styles.debugHeader}>
            <Text style={styles.title}>Diagnostic Information</Text>

            <Pressable onPress={() => setShowDebugInfo(false)}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </Pressable>
          </View>
          <ScrollView>
            <Text style={styles.debugInfo}>{debugInfo}</Text>
          </ScrollView>

          <Pressable
            style={styles.debugButton}
            onPress={() => Clipboard.setStringAsync(debugInfo)}
          >
            <Ionicons name="copy-outline" size={18} color="#fbbf24" />

            <Text style={styles.debugText}>Copy Diagnostic Information</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  container: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fbbf24",
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#cbd5e1",
    marginBottom: 8,
    marginTop: 16,
  },

  privacyCard: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  privacyText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  checkboxText: {
    flex: 1,
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20,
  },

  debugContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },

  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  debugInfo: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1e293b",

    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  attachButton: {
    marginTop: 4,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 8,

    paddingVertical: 12,
    borderRadius: 12,

    borderWidth: 1,
    borderColor: "#334155",

    backgroundColor: "#1e293b",
  },

  attachText: {
    color: "#fbbf24",
    fontSize: 13,
    fontWeight: "600",
  },

  attachmentCount: {
    marginTop: 8,
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
  },

  attachmentPreview: {
    position: "relative",
    marginRight: 12,
    overflow: "visible",
    paddingTop: 8,
    paddingRight: 8,
  },

  attachmentImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },

  removeAttachmentButton: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderWidth: 2,
    borderColor: "#0f172a",
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },

  chipActive: {
    backgroundColor: "#fbbf24",
    borderColor: "#fbbf24",
  },

  chipText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },

  chipTextActive: {
    color: "#0f172a",
    fontWeight: "700",
  },

  input: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
  },

  messageInput: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingTop: 14,
    minHeight: 140,
    textAlignVertical: "top",
    fontSize: 14,
  },

  guidelines: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.15)",
  },

  guidelineTitle: {
    color: "#fbbf24",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 8,
  },

  guidelineText: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },

  debugButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
  },

  debugText: {
    color: "#fbbf24",
    fontSize: 13,
    fontWeight: "600",
  },

  sendButton: {
    marginTop: 20,
    backgroundColor: "#fbbf24",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  sendText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },

  cancelButton: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 14,
  },

  cancelText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },

  aboutTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fbbf24",
  },

  aboutVersion: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
});
