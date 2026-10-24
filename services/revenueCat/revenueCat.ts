import { ENV } from "@/config/env";
import { log } from "@/utils/logger";
import Purchases from "react-native-purchases";

let initialized = false;

export async function initRevenueCat() {
  if (!ENV.FEATURES.REVENUECAT_ENABLED) {
    log(`RevenueCat disabled for ${ENV.APP_VARIANT} variant`);
    return;
  }

  if (initialized) return;

  try {
    await Purchases.configure({
      apiKey: ENV.KEYS.REVENUECAT,
    });
    initialized = true;
    log("RevenueCat initialized");
  } catch (e) {
    log("RC init error", e);
  }
}
