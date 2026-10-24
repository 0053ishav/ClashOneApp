/**
 * Semantic color tokens for the Clash One interface.
 *
 * Keep token names stable across themes so screens can migrate without
 * introducing presentation-specific conditionals into domain logic.
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
  goldBright: "#fbbf24",
  success: "#22c55e",
  emerald: "#34d399",
  greenBright: "#4ade80",
  danger: "#ef4444",
  dangerLight: "#f87171",
  cyan: "#06b6d4",
  cyanLight: "#7dd3fc",
  cyanBright: "#22d3ee",
  blue: "#38bdf8",
  bluePale: "#7dd3fc",
  blueStrong: "#0ea5e9",
  orange: "#f97316",
  orangeLight: "#fb923c",
  purple: "#8b5cf6",
  purpleStrong: "#c084fc",
  purplePale: "#d8b4fe",
  purpleLight: "#a78bfa",
} as const;

export const LIGHT_HOME_COLORS = {
  ...HOME_COLORS,
  background: "#F4F6FA",
  surface: "#FFFFFF",
  surfaceRaised: "#F8FAFC",
  border: "#E2E8F0",
  borderMuted: "#E8EDF4",
  borderStrong: "#CBD5E1",
  textPrimary: "#172033",
  textBright: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  textDark: "#0F172A",
  white: "#FFFFFF",
  black: "#000000",
  surfaceDark: "#F1F5F9",
  slate: "#64748B",
  slateMuted: "#CBD5E1",
  // Brand/status accents remain vivid enough for contrast on light surfaces.
  progress: "#22C55E",
  gold: "#fbbf24",
  goldBright: "#fbbf24",
  success: "#22C55E",
  emerald: "#10B981",
  greenBright: "#22C55E",
  danger: "#DC2626",
  dangerLight: "#EF4444",
  cyan: "#06B6D4",
  cyanLight: "#38BDF8",
  cyanBright: "#22D3EE",
  blue: "#0EA5E9",
  bluePale: "#38BDF8",
  blueStrong: "#0284C7",
  orange: "#F97316",
  orangeLight: "#FB923C",
  purple: "#8B5CF6",
  purpleStrong: "#A855F7",
  purplePale: "#C084FC",
  purpleLight: "#A78BFA",
} as const;

/**
 * Preserve each palette's literal color values. Android widget styles accept
 * ColorProp rather than arbitrary strings, so widening tokens to string
 * prevents valid theme colors from type-checking.
 */
export type HomeColors =
  | typeof HOME_COLORS
  | typeof LIGHT_HOME_COLORS;

export type ColorScheme = "dark" | "light";

export function getHomeColors(scheme: ColorScheme): HomeColors {
  return scheme === "light" ? LIGHT_HOME_COLORS : HOME_COLORS;
}
