import Constants from "expo-constants";

const appVariant = Constants.expoConfig?.extra?.appVariant;

export const ENV = {
  APP_VARIANT: appVariant === "development" || appVariant === "preview" || appVariant === "production"
    ? appVariant
    : "production",
  APP_LINK: process.env.EXPO_PUBLIC_APP_LINK || "",
  BACKEND: process.env.EXPO_PUBLIC_BACKEND_URL || "",
  CDN_BASE: process.env.EXPO_PUBLIC_CDN_BASE || "",
  BACKEND_EMAIL: process.env.EXPO_PUBLIC_BACKEND_EMAIL || "",
  UI: {
    PRIMARY_COLOR: process.env.EXPO_PUBLIC_PRIMARY_COLOR || "25D366",
  },
  ADS: {
    ENABLED: process.env.EXPO_PUBLIC_SHOW_ADS === "true",
    BANNER_ID: process.env.EXPO_PUBLIC_BANNER_ID || "",
  },
  FEATURES: {
    REVENUECAT_ENABLED: appVariant === "production",
  },
  KEYS: {
    REVENUECAT: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "",
    POSTHOG: process.env.EXPO_PUBLIC_POSTHOG_KEY || "",
  },
};
