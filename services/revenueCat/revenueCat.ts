import { ENV } from "@/config/env";
import { log } from "@/utils/logger";
import Purchases from "react-native-purchases";

let initialized = false;


export async function initRevenueCat() {
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