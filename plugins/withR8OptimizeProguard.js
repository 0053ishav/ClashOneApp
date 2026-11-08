const { withAppBuildGradle } = require("@expo/config-plugins");

const LEGACY_CONFIG = 'getDefaultProguardFile("proguard-android.txt")';

const OPTIMIZED_CONFIG =
  'getDefaultProguardFile("proguard-android-optimize.txt")';

function withR8OptimizeProguard(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Already configured: make the plugin idempotent.
    if (contents.includes(OPTIMIZED_CONFIG)) {
      return config;
    }

    // Fail rather than silently modifying an unexpected template.
    if (!contents.includes(LEGACY_CONFIG)) {
      throw new Error(
        "[withR8OptimizeProguard] Expected ProGuard configuration " +
          "was not found in android/app/build.gradle.",
      );
    }

    config.modResults.contents = contents.replace(
      LEGACY_CONFIG,
      OPTIMIZED_CONFIG,
    );

    return config;
  });
}

module.exports = withR8OptimizeProguard;
