import { ENV } from "@/config/env";
import { usePremiumStore } from "@/stores/premiumStore";
import Purchases from "react-native-purchases";

export async function syncPremium() {
  if (!ENV.FEATURES.REVENUECAT_ENABLED) {
    usePremiumStore.getState().setPremium(false);
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const premium = Boolean(customerInfo.entitlements.active["chief"]);

    usePremiumStore.getState().setPremium(premium);

    return premium;
  } catch {
    usePremiumStore.getState().setPremium(false);
    return false;
  }
}
