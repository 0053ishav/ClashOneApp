import type { ExpoConfig, ConfigContext } from "expo/config";

type AppVariant = "development" | "preview" | "production";

const VARIANTS: Record<AppVariant, { name: string; androidPackage: string }> = {
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
  if (value === "development" || value === "preview" || value === "production") return value;
  throw new Error(
    `Invalid APP_VARIANT "${value}". Expected development, preview, or production.`,
  );
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(process.env.APP_VARIANT);
  const selected = VARIANTS[variant];

  return {
    ...config,
    name: selected.name,
    android: {
      ...config.android,
      package: selected.androidPackage,
    },
    extra: {
      ...config.extra,
      appVariant: variant,
    },
  };
};
