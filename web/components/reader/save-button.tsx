"use client"

import { usePathname, useRouter } from "next/navigation"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { useLibraryEntry, useToggleSaved } from "@/hooks/use-reading"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

/** Read later toggle. `icon` sits on story cards; `full` is the labelled button on story pages. */
export function SaveButton({
  storyId,
  title,
  variant = "icon",
  className,
}: {
  storyId: string
  title: string
  variant?: "icon" | "full"
  className?: string
}) {
  const session = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const saved = !!useLibraryEntry(storyId)?.saved
  const toggle = useToggleSaved()

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    toggle.mutate({ storyId, saved: !saved })
  }

  const Icon = saved ? BookmarkCheck : Bookmark
  const label = saved ? `Remove ${title} from Read later` : `Save ${title} for later`

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors",
          saved
            ? "bg-butter text-butter-ink border-transparent"
            : "border-border text-foreground hover:bg-muted",
          className,
        )}
      >
        <Icon className="h-4 w-4" />
        {saved ? "Saved for later" : "Save for later"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Saved for later" : "Save for later"}
      className={cn(
        "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-all hover:scale-105 active:scale-95",
        saved ? "bg-butter text-butter-ink" : "bg-card/85 text-foreground/80 hover:bg-card",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4", saved && "fill-current")} />
    </button>
  )
}
