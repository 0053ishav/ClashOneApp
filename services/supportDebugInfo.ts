import { getNotificationsEnabled } from "@/storage/notificationConfig";
import { useAccountStore } from "@/stores/accountStore";
import { usePremiumStore } from "@/stores/premiumStore";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Localization from "expo-localization";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

export async function buildSupportInfo() {
  const state = useAccountStore.getState();
  const notificationsEnabled =
    getNotificationsEnabled?.() ?? false;
  const notificationPermissions =
    await Notifications.getPermissionsAsync();

  const accountCount = Object.keys(state.profilesByTag ?? {}).length;
  const isPremium = usePremiumStore.getState().isPremium;

  // Report only the most recent sync timestamp across accounts. Do not
  // include or select an account identifier in support diagnostics.
  const syncTimestamps = Object.values(state.lastJsonSyncMap ?? {}).filter(
    (timestamp): timestamp is number =>
      typeof timestamp === "number" && Number.isFinite(timestamp),
  );
  const lastSync = syncTimestamps.length
    ? Math.max(...syncTimestamps)
    : null;

  const installationTime = Application.getInstallationTimeAsync
    ? await Application.getInstallationTimeAsync().catch(() => null)
    : null;

  let revenueCatInfo = `
------------------------
RevenueCat
------------------------

Configured: Unknown
Chief Entitlement: Unavailable
`;

  try {
    const configured = await Purchases.isConfigured();
    const customerInfo = configured
      ? await Purchases.getCustomerInfo()
      : null;

    revenueCatInfo = `
------------------------
RevenueCat
------------------------

Configured: ${configured ? "Yes" : "No"}
Chief Entitlement: ${configured
        ? customerInfo?.entitlements.active["chief"]
          ? "Active"
          : "Inactive"
        : "N/A"}
`;
  } catch {
    // Do not expose raw SDK errors or customer identifiers in diagnostics.
    revenueCatInfo = `
------------------------
RevenueCat
------------------------

Configured: Unknown
Chief Entitlement: Unavailable
`;
  }

  return `
------------------------
Clash One Support Info
------------------------

App Version: ${Application.nativeApplicationVersion ?? "Unknown"}
Build Number: ${Application.nativeBuildVersion ?? "Unknown"}
Android Package: ${Application.applicationId ?? "Unknown"}

Platform: ${Platform.OS}
Android API Level: ${Platform.OS === "android" ? Device.platformApiLevel ?? "Unknown" : "N/A"}
OS Version: ${Device.osVersion ?? "Unknown"}

Manufacturer: ${Device.manufacturer ?? "Unknown"}
Device Brand: ${Device.brand ?? "Unknown"}
Device Model: ${Device.modelName ?? "Unknown"}
Device Type: ${Device.deviceType ?? "Unknown"}
Design Name: ${Device.designName ?? "Unknown"}
Is Physical Device: ${Device.isDevice ? "Yes" : "No"}

Installation Time: ${installationTime?.toISOString() ?? "Unknown"}

Timezone: ${Localization.getCalendars()?.[0]?.timeZone ?? "Unknown"}
Language: ${Localization.getLocales()?.[0]?.languageTag ?? "Unknown"}

Accounts Count: ${accountCount}

Notifications Enabled: ${notificationsEnabled ? "Yes" : "No"}
Notification Permission: ${notificationPermissions.granted ? "Granted" : "Denied"}
Notification Status: ${notificationPermissions.status}

Last JSON Sync: ${lastSync !== null ? new Date(lastSync).toISOString() : "Never"}
Last Sync Age: ${lastSync !== null
      ? `${Math.floor((Date.now() - lastSync) / 60000)} mins ago`
      : "Never"}

Has Premium: ${isPremium ? "Yes" : "No"}

${revenueCatInfo}

Timestamp: ${new Date().toISOString()}
`;
}
