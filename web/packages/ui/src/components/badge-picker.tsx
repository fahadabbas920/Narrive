"use client"

import { Badge } from "./badge"
import { cn } from "../lib/utils"

interface BadgePickerProps {
  items: string[]
  selected: string[]
  onToggle: (item: string) => void
}

export function BadgePicker({ items, selected, onToggle }: BadgePickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isSelected = selected.includes(item)
        return (
          <Badge
            key={item}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "h-8 cursor-pointer rounded-full px-3.5 text-xs transition-all hover:opacity-90",
              isSelected && "shadow-sm",
            )}
            render={<button type="button" onClick={() => onToggle(item)} />}
          >
            {item}
          </Badge>
        )
      })}
    </div>
  )
}
