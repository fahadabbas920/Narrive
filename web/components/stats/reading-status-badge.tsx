import { BookOpen, Flag, RotateCcw, Sparkles, type LucideIcon } from "lucide-react"
import type { ReadingStatus } from "@/lib/api/reading"
import { cn } from "@/lib/utils"

const STATUS: Record<ReadingStatus, { label: string; className: string; icon: LucideIcon }> = {
  in_progress: { label: "In progress", className: "bg-sky text-sky-ink", icon: BookOpen },
  reading_again: {
    label: "Reading again",
    className: "bg-lavender text-lavender-ink",
    icon: RotateCcw,
  },
  finished: { label: "Finished", className: "bg-mint text-mint-ink", icon: Flag },
  all_endings: { label: "All endings", className: "bg-butter text-butter-ink", icon: Sparkles },
}

export function ReadingStatusBadge({
  status,
  className,
}: {
  status: ReadingStatus
  className?: string
}) {
  const s = STATUS[status]
  const Icon = s.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {s.label}
    </span>
  )
}
