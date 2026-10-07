export const STORAGE_KEYS = {
  PLAYER_PROFILE: "player_profile",
  // BUILDER_UPGRADES: "builder_upgrades",
  // BUILDER_COUNT: "builder_count",
  // LAB_UPGRADE: "lab_upgrade",
  ONBOARDING_KEY: "onboarding_complete",
  NOTIFICATION_KEY: "notifications_enabled",
  GOBLIN_BANNER_DISMISSED_UNTIL: "goblin_banner_dismissed_until",
  REMOTE_CONFIG: "remote_config",
  LAST_JSON_SYNC: "last_json_sync",
  ACTIVE_KEY: "active_account",
  WIDGET_PREFS: "widget_prefs",
  WIDGET_CACHE: "widget_cache",
  FEATURE_VOTES: "feature_votes",
  ENTITY_GLOBAL_MANIFEST_VERSION:
  "entities_global_manifest_version",
  ENTITY_MANIFEST: "entity_manifest",
  PROGRESSION_GLOBAL_MANIFEST_VERSION:
  "progression_global_manifest_version",
  PROGRESSION_MANIFEST: "progression_manifest",

  PROGRESSION: (category: string) =>
    `progression_${category}`,

  PROGRESSION_VERSION: (category: string) =>
    `progression_version_${category}`,

  ENTITY_CATEGORY: (category: string) =>
    `entities_${category}`,

  ENTITY_VERSION: (category: string) =>
    `entities_version_${category}`,
};
