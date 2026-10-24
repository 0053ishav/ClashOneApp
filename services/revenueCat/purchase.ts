import { ENV } from "@/config/env";
import { usePremiumStore } from "@/stores/premiumStore";
import { log } from "@/utils/logger";
import Purchases from "react-native-purchases";

export async function purchasePremium() {
  if (!ENV.FEATURES.REVENUECAT_ENABLED) return false;

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;

    if (!offering) {
      throw new Error("No offering available");
    }

    const pkg = offering.availablePackages.find(
      (p) => p.identifier === "$rc_lifetime",
    );

    if (!pkg) {
      throw new Error("Lifetime package not found");
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const premium = hasPremium(customerInfo);

    usePremiumStore.getState().setPremium(premium);

    return premium;
  } catch (e: any) {
    if (!e?.userCancelled) {
      log("Purchase error", e);
    }

    return false;
  }
}

export async function restorePurchases() {
  if (!ENV.FEATURES.REVENUECAT_ENABLED) return false;

  try {
    const customerInfo = await Purchases.restorePurchases();
    const premium = hasPremium(customerInfo);

    usePremiumStore.getState().setPremium(premium);

    return premium;
  } catch (e) {
    log("Restore error", e);
    return false;
  }
}

function hasPremium(customerInfo: { entitlements: { active: Record<string, unknown> } }) {
  return Boolean(customerInfo.entitlements.active["chief"]);
}

export async function getChiefPrice() {
  if (!ENV.FEATURES.REVENUECAT_ENABLED) return "";

  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages.find(
    (p) => p.identifier === "$rc_lifetime",
  );

  return pkg?.product.priceString ?? "";
}
