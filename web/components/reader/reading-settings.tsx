"use client"

import { Popover } from "@base-ui/react/popover"
import { Check, Minus, Plus, Sun, SunDim, Type } from "lucide-react"
import { cn } from "@/lib/utils"
import { DEFAULT_PREFS, TEXT_SIZES, type ReaderPrefs, type ReadingTheme } from "@/lib/reader-prefs"
import { READING_THEMES } from "./reading-themes"

const iconButton =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-(--read-border) bg-(--read-card) shadow-sm transition-all active:scale-95"

export function ReadingSettings({
  prefs,
  theme,
  onChange,
}: {
  prefs: ReaderPrefs
  theme: ReadingTheme
  onChange: (patch: Partial<ReaderPrefs>) => void
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Reading settings"
        title="Reading settings"
        className={cn(
          iconButton,
          "text-(--read-fg) hover:border-(--read-accent) hover:bg-(--read-soft) data-popup-open:border-(--read-accent) data-popup-open:bg-(--read-soft)",
        )}
      >
        <Type className="h-5 w-5" strokeWidth={2.25} />
      </Popover.Trigger>
      <Popover.Portal>
        {/* Above the brightness dimmer so settings stay readable at any brightness. */}
        <Popover.Positioner
          align="end"
          sideOffset={10}
          collisionPadding={8}
          className="z-[70] outline-none"
        >
          <Popover.Popup className="border-border bg-popover text-popover-foreground w-[min(22rem,calc(100vw-1rem))] origin-(--transform-origin) rounded-3xl border p-5 shadow-2xl shadow-black/20 transition-[scale,opacity] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="mb-4 flex items-center justify-between">
              <Popover.Title className="text-foreground text-base font-extrabold">
                Reading settings
              </Popover.Title>
              <button
                type="button"
                onClick={() => onChange(DEFAULT_PREFS)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-semibold"
              >
                Reset
              </button>
            </div>

            {/* Theme */}
            <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">
              Page
            </p>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Page theme">
              {(Object.keys(READING_THEMES) as ReadingTheme[]).map((key) => {
                const t = READING_THEMES[key]
                const active = theme === key
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ theme: key })}
                    className="group flex cursor-pointer flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "relative flex h-14 w-full items-center justify-center rounded-2xl border font-serif text-lg font-semibold transition-all",
                        active
                          ? "ring-primary ring-offset-popover ring-2 ring-offset-2"
                          : "group-hover:scale-105",
                      )}
                      style={{ background: t.bg, color: t.fg, borderColor: t.border }}
                    >
                      Aa
                      {active && (
                        <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Brightness */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="reader-brightness"
                  className="text-muted-foreground text-xs font-bold tracking-wide uppercase"
                >
                  Brightness
                </label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {prefs.brightness}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <SunDim className="text-muted-foreground h-4 w-4 shrink-0" />
                <input
                  id="reader-brightness"
                  type="range"
                  min={30}
                  max={100}
                  step={5}
                  value={prefs.brightness}
                  onChange={(e) => onChange({ brightness: Number(e.target.value) })}
                  className="accent-primary h-2 w-full cursor-pointer"
                />
                <Sun className="text-muted-foreground h-5 w-5 shrink-0" />
              </div>
            </div>

            {/* Text size */}
            <div className="mt-5">
              <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">
                Text size
              </p>
              <div className="bg-muted flex items-center justify-between rounded-2xl p-1">
                <button
                  type="button"
                  aria-label="Smaller text"
                  disabled={prefs.size === 0}
                  onClick={() => onChange({ size: prefs.size - 1 })}
                  className="hover:bg-card flex h-10 w-12 cursor-pointer items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex items-end gap-1.5" aria-hidden>
                  {TEXT_SIZES.map((px, i) => (
                    <span
                      key={px}
                      className={cn(
                        "rounded-full transition-colors",
                        i <= prefs.size ? "bg-primary" : "bg-border",
                      )}
                      style={{ width: 6, height: 6 + i * 3 }}
                    />
                  ))}
                </div>
                <span className="sr-only" aria-live="polite">
                  Text size {TEXT_SIZES[prefs.size]} pixels
                </span>
                <button
                  type="button"
                  aria-label="Larger text"
                  disabled={prefs.size === TEXT_SIZES.length - 1}
                  onClick={() => onChange({ size: prefs.size + 1 })}
                  className="hover:bg-card flex h-10 w-12 cursor-pointer items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Font */}
            <div className="mt-5">
              <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">
                Font
              </p>
              <div
                className="bg-muted grid grid-cols-2 gap-1 rounded-2xl p-1"
                role="radiogroup"
                aria-label="Font"
              >
                {(["serif", "sans"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={prefs.font === f}
                    onClick={() => onChange({ font: f })}
                    className={cn(
                      "cursor-pointer rounded-xl py-2 text-sm font-semibold transition-all",
                      f === "serif" ? "font-serif" : "font-sans",
                      prefs.font === f
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f === "serif" ? "Classic serif" : "Clean sans"}
                  </button>
                ))}
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
