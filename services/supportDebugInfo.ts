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

  const activeProfile =
    state.activeTag
      ? state.profilesByTag?.[state.activeTag]
      : null;

  const isPremium = usePremiumStore.getState().isPremium;

  let revenueCatInfo = `
RevenueCat:
Unavailable
`;

  try {
    const configured = Purchases.isConfigured();

    const customerInfo = await configured
      ? await Purchases.getCustomerInfo()
      : null;

    revenueCatInfo = `
------------------------
RevenueCat
------------------------

Configured: ${await configured ? "Yes" : "No"}

RC User ID:
${await configured ? customerInfo?.originalAppUserId ?? "Unknown" : "N/A"}

Chief Entitlement:
${await configured ? customerInfo?.entitlements.active["chief"] ? "Active" : "Inactive" : "N/A"}

`;
  } catch (e: any) {
    revenueCatInfo = `
------------------------
RevenueCat
------------------------

Error:
${e?.message ?? "Unknown"}
`;
  }

  return `
------------------------
Clash One Debug Info
------------------------

App Version: ${Application.nativeApplicationVersion ?? "Unknown"}
Build Number: ${Application.nativeBuildVersion ?? "Unknown"}
Android Package:
${Application.applicationId ?? "Unknown"}

Platform: ${Platform.OS}
Android API Level: ${Platform.OS === "android" ? Device.platformApiLevel : "N/A"}
OS Version: ${Device.osVersion ?? "Unknown"}

Manufacturer: ${Device.manufacturer ?? "Unknown"}
Device Brand: ${Device.brand ?? "Unknown"}
Device Model: ${Device.modelName ?? "Unknown"}
Device Type: ${Device.deviceType ?? "Unknown"}
Design Name: ${Device.designName ?? "Unknown"}
Is Physical Device: ${Device.isDevice ? "Yes" : "No"}

Installation Time:
${Application.getInstallationTimeAsync
      ? (await Application.getInstallationTimeAsync()).toISOString()
      : "Unknown"
    }
    
    
Timezone: ${Localization.getCalendars()?.[0]?.timeZone ?? "Unknown"}
Language:
    ${Localization.getLocales()?.[0]?.languageTag ?? "Unknown"}

Active Account: ${state.activeTag
      ? state.activeTag : "None"
    }

Accounts Count: ${Object.keys(state.profilesByTag ?? {}).length}
Profile Tags:
${Object.keys(state.profilesByTag ?? {}).join(", ")}


Player Name: ${activeProfile?.playerName ?? "Unknown"}
Town Hall: ${activeProfile?.townHallLevel ?? "Unknown"}

Notifications MMKV Enabled: ${notificationsEnabled ? "Yes" : "No"
    }

  Notification Permission:
${notificationPermissions.granted ? "Granted" : "Denied"}

Notification Status:
${notificationPermissions.status}

Last JSON Sync: 
${state.activeTag && state.lastJsonSyncMap?.[state.activeTag]
      ? new Date(state.lastJsonSyncMap[state.activeTag]).toISOString()
      : "Never"
    }

Last Sync Age:
${state.activeTag && state.lastJsonSyncMap?.[state.activeTag]
      ? Math.floor(
        (Date.now() -
          state.lastJsonSyncMap[state.activeTag]) /
        60000
      ) + " mins ago"
      : "Never"
    }

Has Premium: ${isPremium}

${revenueCatInfo}

Timestamp: ${new Date().toISOString()}
`;
}