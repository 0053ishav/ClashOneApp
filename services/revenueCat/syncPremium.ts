import { usePremiumStore } from "@/stores/premiumStore";
import Purchases from "react-native-purchases";

export async function syncPremium() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    const premium =
      !!customerInfo.entitlements.active["chief"];

    usePremiumStore
      .getState()
      .setPremium(premium);

    return premium;
  } catch {
    usePremiumStore
      .getState()
      .setPremium(false);

    return false;
  }
}