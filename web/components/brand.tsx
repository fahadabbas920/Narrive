import { BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "from-peach via-blush to-lavender flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br shadow-sm ring-1 ring-black/5",
        className,
      )}
    >
      <BookOpen className="text-lavender-ink h-4.5 w-4.5" />
    </div>
  )
}
