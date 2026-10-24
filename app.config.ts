import appJson from "./app.json";
import type { ExpoConfig, ConfigContext } from "expo/config";

type AppVariant = "development" | "preview" | "production";

type VariantConfig = {
  name: string;
  androidPackage: string;
};

const VARIANTS: Record<AppVariant, VariantConfig> = {
  development: {
    name: "Clash One Dev",
    androidPackage: "com.strngelabs.clashone.dev",
  },
  preview: {
    name: "Clash One Preview",
    androidPackage: "com.strngelabs.clashone.preview",
  },
  production: {
    name: "Clash One",
    androidPackage: "com.strngelabs.clashone",
  },
};

function resolveVariant(value: string | undefined): AppVariant {
  if (value === undefined || value === "") return "production";

  if (value === "development" || value === "preview" || value === "production") {
    return value;
  }

  throw new Error(
    `Invalid APP_VARIANT "${value}". Expected development, preview, or production.`,
  );
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(process.env.APP_VARIANT);
  const selected = VARIANTS[variant];
  const appIcon =
    variant === "development"
      ? "./assets/images/dev-icon.png"
      : baseConfig.icon;
  // app.json is validated by Expo at runtime; JSON imports widen literal values
  // (for example, "portrait" to string), so restore Expo's config type here.
  const baseConfig = appJson.expo as ExpoConfig;

  return {
    ...baseConfig,
    ...config,
    slug: baseConfig.slug,
    name: selected.name,
    icon: appIcon,
    android: {
      ...baseConfig.android,
      ...config.android,
      package: selected.androidPackage,
      adaptiveIcon: {
        ...(baseConfig.android?.adaptiveIcon ?? {}),
        ...config.android?.adaptiveIcon,
        foregroundImage: appIcon,
      },
    },
    extra: {
      ...baseConfig.extra,
      ...config.extra,
      appVariant: variant,
    },
  };
};
