/**
 * Shared visual tokens for the Clash One Home experience.
 *
 * Keep cross-section colors here so visual changes can be made consistently.
 * Component-specific layout remains in each component's StyleSheet.
 */
export const HOME_COLORS = {
  background: "#0A0F1A",
  surface: "#121A2B",
  surfaceRaised: "#172033",
  border: "#222D44",
  borderMuted: "#2b3850",
  borderStrong: "#263449",

  textPrimary: "#F1F5F9",
  textBright: "#f8fafc",
  textSecondary: "#94A3B8",
  textMuted: "#64748b",
  textDark: "#0f172a",
  white: "#fff",
  black: "#000",
  surfaceDark: "#111c2e",
  slate: "#475569",
  slateMuted: "#334155",

  progress: "#4ade2d",
  gold: "#fbbf24",
  success: "#22c55e",
  emerald: "#34d399",
  danger: "#ef4444",
  cyan: "#06b6d4",
  cyanBright: "#22d3ee",
  blue: "#38bdf8",
  blueStrong: "#0ea5e9",
  purple: "#8b5cf6",
  purpleLight: "#a78bfa",
} as const;

export const HOME_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const HOME_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
