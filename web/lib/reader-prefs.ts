"use client"

import { useCallback, useSyncExternalStore } from "react"

export type ReadingTheme = "paper" | "sepia" | "night" | "zero"
export type ReadingFont = "serif" | "sans"

export interface ReaderPrefs {
  /** null = follow the app's light/dark theme */
  theme: ReadingTheme | null
  /** 30–100 (%) */
  brightness: number
  /** index into TEXT_SIZES */
  size: number
  font: ReadingFont
}

export const TEXT_SIZES = [16, 18, 20, 22, 24] as const
export const DEFAULT_PREFS: ReaderPrefs = { theme: null, brightness: 100, size: 1, font: "serif" }

const KEY = "narrive:reader-prefs"
const EVENT = "narrive:reader-prefs"

let cachedRaw: string | null | undefined
let cachedPrefs: ReaderPrefs = DEFAULT_PREFS

function read(): ReaderPrefs {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return cachedPrefs
  }
  if (raw === cachedRaw) return cachedPrefs
  cachedRaw = raw
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<ReaderPrefs>) : {}
    cachedPrefs = {
      theme: ["paper", "sepia", "night", "zero"].includes(parsed.theme as string)
        ? (parsed.theme as ReadingTheme)
        : null,
      brightness: clamp(Number(parsed.brightness ?? 100), 30, 100),
      size: clamp(Math.round(Number(parsed.size ?? 1)), 0, TEXT_SIZES.length - 1),
      font: parsed.font === "sans" ? "sans" : "serif",
    }
  } catch {
    cachedPrefs = DEFAULT_PREFS
  }
  return cachedPrefs
}

function clamp(n: number, min: number, max: number) {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener("storage", cb)
  }
}

/** Per-device reading preferences (theme, brightness, text size, font). */
export function useReaderPrefs() {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS)
  const update = useCallback((patch: Partial<ReaderPrefs>) => {
    const next = { ...read(), ...patch }
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      cachedRaw = undefined
      cachedPrefs = next
    }
    window.dispatchEvent(new Event(EVENT))
  }, [])
  return [prefs, update] as const
}
