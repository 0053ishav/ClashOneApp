"use no memo";

import { ConfirmModal } from "@/components/ConfirmModal";
import { JsonImportScreenLayout } from "@/components/JsonImportScreenLayout";
import { type ClipboardPasteError } from "@/components/JsonClipboardInput";
import { importVillageJson } from "@/services/jsonImport/jsonImportService";
import { getSessionSource, track } from "@/utils/analytics/analytics";
import { emitWidgetUpdate } from "@/utils/widget/widgetEvents";
import { useRouter } from "expo-router";
import { useState } from "react";

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

  const handlePasteError = (error: ClipboardPasteError) => {
    setModalTitle(error === "empty" ? "Clipboard Empty" : "Clipboard Unavailable");
    setModalMessage(
      error === "empty"
        ? "No village data found. Copy the village export from the game first."
        : "Could not read the clipboard. Copy the village export again and retry.",
    );
    setModalVisible(true);
  };

  const handleOpenGameError = () => {
    setModalTitle("Unable to open Clash of Clans");
    setModalMessage("Please open the game manually and go to Settings → More Settings.");
    setModalVisible(true);
  };

  const handleImport = async () => {
    if (isImporting) return;
    try {
      setIsImporting(true);
      track("account_add_started", { source: getSessionSource(), trigger: "add-account" });
      if (!jsonText.trim()) {
        setModalTitle("JSON Missing");
        setModalMessage("Paste your copied village JSON into the preview before importing.");
        setModalVisible(true);
        return;
      }

      const result = await importVillageJson(jsonText);
      if (result.status === "NO_ACTIVE_BUILDERS") {
        await refreshWidget();
        setShouldNavigate(true);
        setTag(result.tag);
        setModalTitle("Village Synced");
        setModalMessage("No active builders found. All builders are currently free.");
        setModalVisible(true);
        return;
      }

      if (result.status === "SUCCESS") {
        await refreshWidget();
        setShouldNavigate(true);
        setTag(result.tag);
        setModalTitle(result.skippedExpired > 0 ? "Village Synced (Partial)" : "Village Synced");
        setModalMessage(
          result.skippedExpired > 0
            ? `${result.activeCount} upgrades synced.\n${result.skippedExpired} expired upgrades were ignored.`
            : `${result.activeCount} upgrades synced.`,
        );
        setModalVisible(true);
        return;
      }
      track("account_added", { source: getSessionSource(), trigger: "add-account" });
    } catch (error: unknown) {
      setShouldNavigate(false);
      track("account_add_failed", {
        error: error instanceof Error ? error.message : String(error),
        trigger: "add-account",
      });
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage === "INVALID_JSON") {
        setModalTitle("Invalid Format");
        setModalMessage("The pasted content is not valid JSON. Copy the correct village export and paste it again.");
      } else if (errorMessage === "INVALID_STRUCTURE") {
        setModalTitle("Invalid Village Data");
        setModalMessage("This does not appear to be valid Clash of Clans export data.");
      } else {
        setModalTitle("Import Failed");
        setModalMessage("Something went wrong while syncing your village.");
      }
      setModalVisible(true);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <JsonImportScreenLayout
        headerEyebrow="ACCOUNT SETUP"
        headerTitle="Add your village"
        headerIcon="sync-outline"
        introTitle="Your upgrades, in sync."
        introDescription="Import your Clash of Clans village export to start tracking builder, laboratory, and pet upgrades."
        exportTitle="1. Export village data"
        exportSubtitle="It only takes a moment"
        exportSteps={[
          "Open Clash of Clans settings",
          "Choose More Settings → Data Export",
          "Tap Copy, then return here",
        ]}
        pasteTitle="2. Add your JSON"
        pasteSubtitle="Paste the copied export below"
        actionLabel="Sync village"
        jsonText={jsonText}
        onJsonTextChange={setJsonText}
        onPasteError={handlePasteError}
        onOpenGameError={handleOpenGameError}
        isImporting={isImporting}
        onSync={handleImport}
        onBack={() => router.back()}
        showDisclaimer
      />
      <ConfirmModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmText="OK"
        cancelText=""
        onCancel={() => setModalVisible(false)}
        onConfirm={() => {
          setModalVisible(false);
          if (shouldNavigate) router.replace({ pathname: "/value", params: { tag } });
        }}
      />
    </>
  );
}
