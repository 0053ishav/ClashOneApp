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
  progress: "#269A18",
  gold: "#A66A00",
  goldBright: "#A66A00",
  success: "#15803D",
  emerald: "#047857",
  greenBright: "#15803D",
  danger: "#B91C1C",
  dangerLight: "#DC2626",
  cyan: "#0E7490",
  cyanLight: "#0369A1",
  cyanBright: "#0E7490",
  blue: "#0369A1",
  bluePale: "#0369A1",
  blueStrong: "#0369A1",
  orange: "#C2410C",
  orangeLight: "#C2410C",
  purple: "#6D28D9",
  purpleStrong: "#7E22CE",
  purplePale: "#6D28D9",
  purpleLight: "#6D28D9",
} as const;

export type HomeColors = {
  readonly [Key in keyof typeof HOME_COLORS]: string;
};

export type ColorScheme = "dark" | "light";

export function getHomeColors(scheme: ColorScheme): HomeColors {
  return scheme === "light" ? LIGHT_HOME_COLORS : HOME_COLORS;
}
