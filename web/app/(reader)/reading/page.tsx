"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BookMarked, BookOpen, Flag, RotateCcw, Search } from "lucide-react"
import { useReadingList, useSavedList } from "@/hooks/use-reading"
import type { ReadingListItem } from "@/lib/api/reading"
import { storyTone } from "@/lib/story-tone"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"
import { PageContainer } from "@/components/page-container"
import { ReaderFooter, ReaderHeader } from "@/components/reader-header"
import { SaveButton } from "@/components/reader/save-button"
import { EndingsMeter } from "@/components/stats/endings-meter"
import { ReadingSummary } from "@/components/stats/reading-summary"
import { ReadingStatusBadge } from "@/components/stats/reading-status-badge"

type Tab = "reading" | "saved" | "finished"

function ReadingRow({ item, tab }: { item: ReadingListItem; tab: Tab }) {
  const { story, entry } = item
  // A finished story can be mid re-read; "Find another ending" would throw that run away.
  const rereading = entry.status === "reading_again"
  const action =
    tab === "finished" && !rereading
      ? { href: `/story/${story.id}/read?restart=1`, label: "Find another ending", icon: RotateCcw }
      : tab === "saved"
        ? { href: `/story/${story.id}/read`, label: "Start reading", icon: BookOpen }
        : { href: `/story/${story.id}/read`, label: "Continue", icon: ArrowRight }
  const Icon = action.icon
  const allFound =
    tab === "finished" &&
    !rereading &&
    entry.endings_total > 0 &&
    entry.endings_found >= entry.endings_total

  return (
    <li className="bg-card border-border flex flex-wrap items-center gap-4 rounded-3xl border p-4 shadow-sm sm:flex-nowrap">
      <Link
        href={`/story/${story.id}`}
        aria-hidden
        tabIndex={-1}
        className={cn("h-14 w-14 shrink-0 rounded-2xl bg-linear-to-br", storyTone(story.id))}
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/story/${story.id}`}
          className="text-foreground hover:text-primary block truncate font-bold"
        >
          {story.title}
        </Link>
        <p className="text-muted-foreground truncate text-xs">
          {story.author_name && `by ${story.author_name}`}
          {entry.last_read_at && ` · read ${timeAgo(entry.last_read_at)}`}
          {tab === "saved" && item.saved_at && ` · saved ${timeAgo(item.saved_at)}`}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {entry.status && tab !== "saved" && <ReadingStatusBadge status={entry.status} />}
          {tab === "finished" && (
            <EndingsMeter found={entry.endings_found} total={entry.endings_total} />
          )}
        </div>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {tab === "saved" && <SaveButton storyId={story.id} title={story.title} />}
        {!allFound ? (
          <Link
            href={action.href}
            className="bg-primary text-primary-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 sm:flex-none"
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </Link>
        ) : (
          <Link
            href={action.href}
            className="border-border text-foreground hover:bg-muted inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold sm:flex-none"
          >
            <RotateCcw className="h-4 w-4" />
            Read again
          </Link>
        )}
      </div>
    </li>
  )
}

const EMPTY: Record<Tab, { icon: typeof BookOpen; title: string; body: string }> = {
  reading: {
    icon: BookOpen,
    title: "Nothing in progress",
    body: "Stories you start show up here so you can pick up where you left off.",
  },
  saved: {
    icon: BookMarked,
    title: "Your Read later list is empty",
    body: "Tap the bookmark on any story to save it for later.",
  },
  finished: {
    icon: Flag,
    title: "No finished stories yet",
    body: "Reach an ending and it lands here, with how many endings you've found.",
  },
}

export default function MyReadingPage() {
  const [tab, setTab] = useState<Tab>("reading")
  const reading = useReadingList("reading")
  const finished = useReadingList("finished")
  const saved = useSavedList()

  // Read later lists saved stories you haven't opened; once started they move to the other tabs.
  const unstarted = (saved.data ?? []).filter((i) => i.entry.status === null)
  const lists: Record<Tab, { items: ReadingListItem[]; loading: boolean }> = {
    reading: { items: reading.data ?? [], loading: reading.isLoading },
    saved: { items: unstarted, loading: saved.isLoading },
    finished: { items: finished.data ?? [], loading: finished.isLoading },
  }
  const tabs: { value: Tab; label: string }[] = [
    { value: "reading", label: "Continue reading" },
    { value: "saved", label: "Read later" },
    { value: "finished", label: "Finished" },
  ]
  const current = lists[tab]
  const empty = EMPTY[tab]
  const EmptyIcon = empty.icon

  return (
    <div className="flex min-h-screen flex-col">
      <ReaderHeader />
      <main className="flex-1 pb-20">
        <PageContainer className="pt-6">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground hover:bg-muted -ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All stories
          </Link>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-foreground text-3xl font-extrabold tracking-tight">My reading</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Your progress, saved stories and endings. Only you can see this.
              </p>
            </div>
            <Link
              href="/"
              className="border-border bg-card text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
            >
              <Search className="h-4 w-4" />
              Find a story
            </Link>
          </div>

          <ReadingSummary className="mt-6" />

          <div
            role="tablist"
            aria-label="Your stories"
            className="bg-muted ring-border mt-10 inline-flex max-w-full overflow-x-auto rounded-full p-1 ring-1"
          >
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-all",
                  tab === t.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {!lists[t.value].loading && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {lists[t.value].items.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="mt-5">
            {current.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="bg-muted h-24 animate-pulse rounded-3xl" />
                ))}
              </div>
            ) : current.items.length === 0 ? (
              <div className="bg-card border-border flex flex-col items-center gap-2 rounded-3xl border border-dashed px-6 py-14 text-center">
                <div className="bg-peach mb-1 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <EmptyIcon className="text-peach-ink h-6 w-6" />
                </div>
                <p className="text-foreground font-bold">{empty.title}</p>
                <p className="text-muted-foreground max-w-sm text-sm">{empty.body}</p>
                <Link href="/" className="text-primary mt-2 text-sm font-semibold hover:underline">
                  Browse stories
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {current.items.map((item) => (
                  <ReadingRow key={item.story.id} item={item} tab={tab} />
                ))}
              </ul>
            )}
          </div>
        </PageContainer>
      </main>
      <ReaderFooter />
    </div>
  )
}
