import { ENV } from "@/config/env";
import { usePremiumStore } from "@/stores/premiumStore";
import { log } from "@/utils/logger";
import Purchases from "react-native-purchases";

export async function isPremiumUser() {
  if (!ENV.FEATURES.REVENUECAT_ENABLED) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return Boolean(customerInfo.entitlements.active["chief"]);
  } catch (e) {
    log("Premium check error", e);
    return false;
  }
}

export async function syncPremiumStatus() {
  if (!ENV.FEATURES.REVENUECAT_ENABLED) {
    usePremiumStore.getState().setPremium(false);
    return;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const premium = Boolean(customerInfo.entitlements.active["chief"]);
    usePremiumStore.getState().setPremium(premium);
  } catch (e) {
    log("Premium sync error", e);
  }
}
