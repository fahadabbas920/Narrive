import type { CSSProperties } from "react"
import type { ReadingTheme } from "@/lib/reader-prefs"

interface ThemeTokens {
  label: string
  bg: string
  fg: string
  muted: string
  card: string
  border: string
  accent: string
  soft: string
  bar: string
}

/** Page themes for the reading screen only; independent of the app's light/dark theme. */
export const READING_THEMES: Record<ReadingTheme, ThemeTokens> = {
  paper: {
    label: "Paper",
    bg: "#fbf8f4",
    fg: "#2e2a3b",
    muted: "#6b6580",
    card: "#ffffff",
    border: "#e9e3ef",
    accent: "#6a57b8",
    soft: "#efe9fb",
    bar: "rgb(251 248 244 / 0.86)",
  },
  sepia: {
    label: "Sepia",
    bg: "#f3ead7",
    fg: "#43362a",
    muted: "#6f5d49",
    card: "#f9f2e2",
    border: "#e2d5b8",
    accent: "#8a4f24",
    soft: "#eadbbd",
    bar: "rgb(243 234 215 / 0.88)",
  },
  night: {
    label: "Night",
    bg: "#1b1725",
    fg: "#e6e1ef",
    muted: "#a39cb8",
    card: "#25202f",
    border: "#332c44",
    accent: "#c4b6f6",
    soft: "#342c50",
    bar: "rgb(27 23 37 / 0.86)",
  },
  // True black: easiest on the eyes in the dark, and saves battery on OLED screens.
  zero: {
    label: "Zero",
    bg: "#000000",
    fg: "#bdb8c9",
    muted: "#7d788b",
    card: "#0d0c12",
    border: "#1d1b25",
    accent: "#a898ea",
    soft: "#17141f",
    bar: "rgb(0 0 0 / 0.86)",
  },
}

function varsFor(theme: ReadingTheme) {
  const t = READING_THEMES[theme]
  return {
    "--read-bg": t.bg,
    "--read-fg": t.fg,
    "--read-muted": t.muted,
    "--read-card": t.card,
    "--read-border": t.border,
    "--read-accent": t.accent,
    "--read-soft": t.soft,
    "--read-bar": t.bar,
  }
}

/** Inline vars for a theme the reader explicitly picked. */
export function themeVars(theme: ReadingTheme): CSSProperties {
  return varsFor(theme) as CSSProperties
}

const block = (theme: ReadingTheme) =>
  Object.entries(varsFor(theme))
    .map(([k, v]) => `${k}:${v}`)
    .join(";")

/**
 * Default (no explicit pick) follows the app's light/dark class. Done in CSS so the server and
 * the first client render produce identical markup — no hydration mismatch, no theme flash.
 */
export const AUTO_THEME_CSS = `[data-reader]{${block("paper")}}.dark [data-reader]{${block("night")}}`
