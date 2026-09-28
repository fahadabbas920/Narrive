"use client"

import { useRef, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  max?: number
  maxLength?: number
  className?: string
}

export function TagInput({
  value,
  onChange,
  placeholder,
  max = 10,
  maxLength,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const full = value.length >= max

  function addTag(raw: string) {
    const tag = raw.replace(/,$/, "").replace(/^#/, "").replace(/\s+/g, " ").trim()
    if (!tag || full) return setDraft("")
    if (!value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag])
    setDraft("")
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "bg-muted focus-within:border-ring focus-within:ring-ring/40 focus-within:bg-card flex min-h-12 w-full cursor-text flex-wrap items-center gap-1.5 rounded-2xl border border-transparent px-3 py-2 transition-all focus-within:ring-4",
        className,
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="bg-card text-foreground ring-border inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm font-medium shadow-sm ring-1"
        >
          #{tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(tag)
            }}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        disabled={full}
        maxLength={maxLength}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addTag(draft)
          } else if (e.key === "Backspace" && !draft && value.length) {
            removeTag(value[value.length - 1])
          }
        }}
        onBlur={() => addTag(draft)}
        placeholder={full ? `Up to ${max} themes` : value.length ? "Add another…" : placeholder}
        className="placeholder:text-muted-foreground min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none disabled:cursor-not-allowed"
      />
    </div>
  )
}
