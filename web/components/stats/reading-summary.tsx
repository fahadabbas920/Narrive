"use client"

import { Sparkles } from "lucide-react"
import { useReadingStats } from "@/hooks/use-reading"
import { cn } from "@/lib/utils"

const n = (count: number, one: string, many: string) => (
  <>
    <strong className="text-foreground font-extrabold">{count.toLocaleString()}</strong>{" "}
    {count === 1 ? one : many}
  </>
)

/** Readers get a friendly sentence, not a dashboard; admins use ReadingStatsPanel. */
export function ReadingSummary({ className }: { className?: string }) {
  const { data: stats, isError } = useReadingStats({ scope: "me" })

  // The summary is a nicety; if it can't load, the lists below still work.
  if (isError) return null
  if (!stats) {
    return <div className={cn("bg-muted h-20 animate-pulse rounded-3xl", className)} />
  }
  if (stats.started === 0 && stats.saved === 0) return null

  const favourite = stats.top_genres[0]?.name
  const waiting = stats.in_progress

  return (
    <div
      className={cn(
        "from-peach/60 via-blush/40 to-lavender/60 flex items-start gap-4 rounded-3xl bg-linear-to-br p-5 sm:items-center sm:p-6",
        className,
      )}
    >
      <span className="bg-card/80 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm">
        <Sparkles className="text-peach-ink h-5 w-5" />
      </span>
      <p className="text-foreground/80 text-[15px] leading-relaxed">
        {stats.finished > 0 ? (
          <>
            You&apos;ve finished {n(stats.finished, "story", "stories")} and found{" "}
            {n(stats.endings_found, "ending", "endings")} along the way.
            {waiting > 0 && <> {n(waiting, "more is", "more are")} waiting for you.</>}
          </>
        ) : stats.started > 0 ? (
          <>You&apos;re in the middle of {n(stats.started, "story", "stories")}. Keep going.</>
        ) : (
          <>
            You have {n(stats.saved, "story", "stories")} saved for later. Pick one and start
            reading.
          </>
        )}
        {favourite && <> {favourite} seems to be your favourite.</>}
      </p>
    </div>
  )
}
