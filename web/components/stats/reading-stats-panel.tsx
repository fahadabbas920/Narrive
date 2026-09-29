"use client"

import { BookOpen } from "lucide-react"
import type { ReadingStats, StatsScope } from "@/lib/api/reading"
import { useReadingStats } from "@/hooks/use-reading"
import { BarList, DailyColumns } from "@/components/stats/charts"
import { StatTile, formatCount } from "@/components/stats/stat-tile"
import { cn } from "@/lib/utils"

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-card border-border rounded-3xl border p-5 shadow-sm">
      <h3 className="text-foreground text-sm font-bold">{title}</h3>
      {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

const pct = (rate: number | null) => (rate == null ? "—" : `${Math.round(rate * 100)}%`)

function tiles(stats: ReadingStats) {
  const endings =
    stats.endings_total != null
      ? `${stats.endings_found} of ${stats.endings_total} endings`
      : `${formatCount(stats.endings_found)} endings found`
  switch (stats.scope) {
    case "user":
      return [
        { label: "Started", value: stats.started, hint: `${stats.saved} saved for later` },
        { label: "In progress", value: stats.in_progress },
        {
          label: "Finished",
          value: stats.finished,
          hint: `${stats.completed_all_endings} with every ending`,
        },
        {
          label: "Endings found",
          value: stats.endings_found,
          hint: stats.words_read ? `${formatCount(stats.words_read)} words read` : endings,
        },
      ]
    case "story":
      return [
        { label: "Readers", value: stats.readers, hint: `${stats.saved} saved for later` },
        { label: "Finished", value: stats.finished, hint: `${stats.in_progress} still reading` },
        { label: "Completion rate", value: pct(stats.completion_rate) },
        {
          label: "Found every ending",
          value: stats.completed_all_endings,
          hint: stats.endings_total != null ? `${stats.endings_total} endings in total` : undefined,
        },
      ]
    default:
      return [
        { label: "Readers", value: stats.readers },
        {
          label: "Stories started",
          value: stats.started,
          hint: `${stats.in_progress} in progress`,
        },
        { label: "Stories finished", value: stats.finished, hint: endings },
        {
          label: "Completion rate",
          value: pct(stats.completion_rate),
          hint: `${formatCount(stats.saved)} saved for later`,
        },
      ]
  }
}

const EMPTY = {
  user: "This user hasn't read anything yet.",
  story: "No one has read this story yet.",
  platform: "No one has read a story yet.",
}

/** Reading stats for one user, one story or the platform (admin console). Readers see ReadingSummary. */
export function ReadingStatsPanel({ scope, className }: { scope: StatsScope; className?: string }) {
  const { data: stats, isError } = useReadingStats(scope)

  if (isError) {
    return (
      <p className={cn("text-muted-foreground py-6 text-center text-sm", className)}>
        Couldn&apos;t load reading stats.
      </p>
    )
  }
  if (!stats) {
    return (
      <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-muted h-24 animate-pulse rounded-2xl" />
        ))}
      </div>
    )
  }

  if (stats.started === 0 && stats.saved === 0) {
    return (
      <div
        className={cn(
          "bg-card border-border text-muted-foreground flex items-center gap-3 rounded-2xl border p-5 text-sm",
          className,
        )}
      >
        <BookOpen className="h-5 w-5 shrink-0" />
        {EMPTY[stats.scope]}
      </div>
    )
  }

  const started = stats.activity.map((a) => ({ date: a.date, value: a.started }))
  const finished = stats.activity.map((a) => ({ date: a.date, value: a.finished }))
  const side =
    stats.scope === "story"
      ? {
          title: "Endings reached",
          description: "Readers who found each ending",
          label: "Readers per ending",
          items: stats.ending_breakdown.map((e) => ({ name: e.name, value: e.count })),
          empty: "This story has no endings yet",
        }
      : stats.scope === "platform"
        ? {
            title: "Most finished stories",
            description: "Readers who reached an ending",
            label: "Most finished stories",
            items: stats.top_stories.map((s) => ({ name: s.name, value: s.count })),
            empty: "No finished stories yet",
          }
        : {
            title: "Genres finished",
            description: "Across finished stories",
            label: "Finished stories by genre",
            items: stats.top_genres.map((g) => ({ name: g.name, value: g.count })),
            empty: "No finished stories yet",
          }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles(stats).map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} hint={t.hint} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Started" description="Stories opened for the first time, per day">
          <DailyColumns data={started} label="Stories started" unit={["story", "stories"]} />
        </Card>
        <Card title="Finished" description="Stories that reached a first ending, per day">
          <DailyColumns data={finished} label="Stories finished" unit={["story", "stories"]} />
        </Card>
        <Card title={side.title} description={side.description}>
          <BarList label={side.label} items={side.items} empty={side.empty} />
        </Card>
      </div>
    </div>
  )
}
