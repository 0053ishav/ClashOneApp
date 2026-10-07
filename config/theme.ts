import { ENV } from "./env";

export const THEME = {
  COLORS: {
    PRIMARY: ENV.UI.PRIMARY_COLOR || "#25D366",

    // Base
    BACKGROUND: "#000000",

    // Surfaces
    SURFACE_1: "#111111",
    SURFACE_2: "#1a1a1a",
    SURFACE_3: "#242424",

    // Borders
    BORDER_SUBTLE: "#1c1c1c",
    BORDER_STRONG: "#2a2a2a",

    // Text
    TEXT_PRIMARY: "#ffffff",
    TEXT_SECONDARY: "#d1d1d1",
    TEXT_MUTED: "#8b8b8b",
    TEXT_DISABLED: "#5a5a5a",

    // States
    SUCCESS: "#22c55e",
    DANGER: "#ef4444",
    WARNING: "#f59e0b",

    // Utility
    OVERLAY: "rgba(0,0,0,0.55)",
  },
};