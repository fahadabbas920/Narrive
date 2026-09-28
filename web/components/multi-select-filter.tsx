"use client"

import { Menu } from "@base-ui/react/menu"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
  hint?: string
  count: number
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: FilterOption[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const active = selected.length > 0

  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value))
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "focus-visible:ring-ring/50 flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all outline-none focus-visible:ring-3",
          active
            ? "bg-lavender text-lavender-ink border-lavender-ink/25"
            : "bg-card border-border text-foreground hover:border-foreground/20 data-popup-open:border-foreground/20",
        )}
      >
        {label}
        {active && (
          <span className="bg-card text-lavender-ink flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums">
            {selected.length}
          </span>
        )}
        <ChevronDown className="h-4 w-4 opacity-60 transition-transform in-data-popup-open:rotate-180" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={8} className="z-50 outline-none">
          <Menu.Popup className="bg-popover text-popover-foreground border-border w-64 origin-(--transform-origin) overflow-hidden rounded-2xl border shadow-xl shadow-black/10 transition-[scale,opacity] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
              <p className="text-foreground text-sm font-bold">{label}</p>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={!active}
                className="text-primary cursor-pointer text-xs font-semibold hover:underline disabled:pointer-events-none disabled:opacity-40"
              >
                Clear
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5">
              {options.map((opt) => {
                const checked = selected.includes(opt.value)
                return (
                  <Menu.CheckboxItem
                    key={opt.value}
                    checked={checked}
                    onCheckedChange={(c) => toggle(opt.value, c)}
                    closeOnClick={false}
                    className={cn(
                      "data-highlighted:bg-muted flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm outline-none select-none",
                      opt.count === 0 && !checked && "opacity-55",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        checked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input bg-card",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 truncate font-medium">
                      {opt.label}
                      {opt.hint && (
                        <span className="text-muted-foreground ml-1 text-xs">{opt.hint}</span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">{opt.count}</span>
                  </Menu.CheckboxItem>
                )
              })}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
