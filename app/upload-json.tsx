import { ConfirmModal } from "@/components/ConfirmModal";
import { JsonImportScreenLayout } from "@/components/JsonImportScreenLayout";
import { type ClipboardPasteError } from "@/components/JsonClipboardInput";
import { importVillageJson } from "@/services/jsonImport/jsonImportService";
import { getSessionSource, track } from "@/utils/analytics/analytics";
import { emitWidgetUpdate } from "@/utils/widget/widgetEvents";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

export default function UploadJsonScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [shouldReturnHome, setShouldReturnHome] = useState(false);
  const [jsonText, setJsonText] = useState("");

  useEffect(() => {
    track("screen_view", { screen: "upload_json" });
  }, []);

  const refreshWidget = async () => {
    emitWidgetUpdate();
  };

  const handleOpenGameError = () => {
    setModalTitle("Unable to open Clash of Clans");
    setModalMessage("Please open the game manually and go to Settings → More Settings.");
    setShouldReturnHome(false);
    setModalVisible(true);
  };

  const handlePasteError = (error: ClipboardPasteError) => {
    setModalTitle(error === "empty" ? "Clipboard Empty" : "Clipboard Unavailable");
    setModalMessage(
      error === "empty"
        ? "No village data found. Copy the village export from the game first."
        : "Could not read the clipboard. Copy the village export again and retry.",
    );
    setShouldReturnHome(false);
    setModalVisible(true);
  };

  const handleImportVillageData = async () => {
    if (isImporting) return;
    if (!jsonText.trim()) {
      setModalTitle("JSON Missing");
      setModalMessage("Paste your copied village JSON into the preview before syncing.");
      setShouldReturnHome(false);
      setModalVisible(true);
      return;
    }

    try {
      setIsImporting(true);
      track("json_importing", { source: getSessionSource(), trigger: "upload-json" });
      const result = await importVillageJson(jsonText);

      if (result.status === "NO_ACTIVE_BUILDERS") {
        await refreshWidget();
        setModalTitle("Village Synced");
        setModalMessage("No active builders found. All builders are currently free.");
        setShouldReturnHome(true);
        setModalVisible(true);
        return;
      }

      if (result.status === "SUCCESS") {
        await refreshWidget();
        setModalTitle(result.skippedExpired > 0 ? "Village Synced (Partial)" : "Village Synced");
        setModalMessage(
          result.skippedExpired > 0
            ? `${result.activeCount} upgrades synced.\n${result.skippedExpired} expired upgrades were ignored.`
            : `${result.activeCount} upgrades synced.`,
        );
        setShouldReturnHome(true);
        setModalVisible(true);
        return;
      }

      track("json_imported", { source: getSessionSource(), trigger: "upload-json" });
    } catch (error: unknown) {
      console.error("IMPORT ERROR:", error);
      track("json_import_failed", { source: getSessionSource(), trigger: "upload-json" });
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
      setShouldReturnHome(false);
      setModalVisible(true);
    } finally {
      setIsImporting(false);
    }
  };

  const returnHome = () => {
    setModalVisible(false);
    if (shouldReturnHome) router.back();
  };

  return (
    <>
      <JsonImportScreenLayout
        headerEyebrow="VILLAGE DATA"
        headerTitle="Sync your progress"
        headerIcon="sync-outline"
        introTitle="Bring your village up to date."
        introDescription="Import a fresh game export to refresh your active builder, lab, and pet upgrade timers."
        exportTitle="First, copy your export"
        exportSubtitle="From inside Clash of Clans"
        exportSteps={[
          "Open Settings → More Settings",
          "Find Data Export and tap Copy",
        ]}
        pasteTitle="Then paste your data"
        pasteSubtitle="Review the JSON before syncing"
        actionLabel="Sync village data"
        jsonText={jsonText}
        onJsonTextChange={setJsonText}
        onPasteError={handlePasteError}
        onOpenGameError={handleOpenGameError}
        isImporting={isImporting}
        onSync={handleImportVillageData}
        onBack={() => router.back()}
        showCancel
        showDisclaimer
      />
      <ConfirmModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmText="OK"
        cancelText={shouldReturnHome ? "Back to Home" : ""}
        onCancel={returnHome}
        onConfirm={returnHome}
      />
    </>
  );
}
