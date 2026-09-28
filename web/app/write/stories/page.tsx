"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Clock,
  FileText,
  GitBranch,
  Globe,
  Layers,
  PenLine,
  Plus,
  Search,
  X,
} from "lucide-react"
import { useDeleteStory, useStories } from "@/hooks/use-stories"
import type { Story } from "@/lib/api/stories"
import { useRatingLabel } from "@/hooks/use-taxonomy"
import { storyTone } from "@/lib/story-tone"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"
import { WelcomeBanner } from "@/components/app/welcome-banner"
import { StoryActionsMenu } from "@/components/app/story-actions-menu"
import { DeleteStoryDialog } from "@/components/app/delete-story-dialog"

type Filter = "all" | "published" | "draft"

function StatusPill({ status }: { status: Story["status"] }) {
  const published = status === "published"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm",
        published ? "bg-mint text-mint-ink" : "bg-butter text-butter-ink",
      )}
    >
      {published ? <Globe className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {published ? "Published" : status === "archived" ? "Archived" : "Draft"}
    </span>
  )
}

function StoryCard({ story, onDelete }: { story: Story; onDelete: () => void }) {
  const contentRatingLabel = useRatingLabel()
  const href = `/write/stories/${story.id}`
  return (
    <div className="group bg-card border-border hover:border-lavender-ink/25 hover:shadow-lavender-ink/5 flex flex-col overflow-hidden rounded-3xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <Link
        href={href}
        className={cn("relative block h-28 overflow-hidden bg-linear-to-br", storyTone(story.id))}
      >
        <div className="bg-card/35 absolute -right-6 -bottom-10 h-28 w-28 rotate-12 rounded-3xl transition-transform duration-500 group-hover:rotate-20" />
        <div className="bg-card/25 absolute top-4 right-16 h-10 w-10 -rotate-12 rounded-xl" />
        <div className="absolute top-3 left-4">
          <StatusPill status={story.status} />
        </div>
        <span className="bg-card/85 text-foreground/80 absolute bottom-3 left-4 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
          <GitBranch className="h-3 w-3" />
          {story.scene_count} scene{story.scene_count !== 1 ? "s" : ""}
        </span>
      </Link>

      <Link href={href} className="flex flex-1 flex-col gap-2 px-5 pt-4 pb-3">
        <h3 className="text-foreground group-hover:text-primary line-clamp-1 text-[17px] font-bold transition-colors">
          {story.title}
        </h3>
        <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm leading-relaxed">
          {story.description || "No description yet."}
        </p>
        {(story.genres?.length > 0 || story.content_rating) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {story.genres?.slice(0, 2).map((g) => (
              <span
                key={g}
                className="bg-lavender text-lavender-ink rounded-full px-2.5 py-0.5 text-xs font-semibold"
              >
                {g}
              </span>
            ))}
            {story.content_rating && (
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                {contentRatingLabel(story.content_rating)}
              </span>
            )}
          </div>
        )}
      </Link>

      <div className="border-border mt-auto flex items-center gap-2 border-t px-3 py-2.5">
        <span className="text-muted-foreground flex-1 truncate pl-2 text-xs">
          Updated {timeAgo(story.updated_at)}
        </span>
        <Link
          href={`${href}/canvas`}
          className="bg-lavender text-lavender-ink hover:bg-lavender/70 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
        >
          <PenLine className="h-3.5 w-3.5" />
          Write
        </Link>
        <StoryActionsMenu story={story} onDelete={onDelete} />
      </div>
    </div>
  )
}

export default function StoriesPage() {
  const { data: stories, isLoading } = useStories()
  const { mutate: deleteStory, isPending: isDeleting } = useDeleteStory()
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<Story | null>(null)

  const counts = useMemo(() => {
    const list = stories ?? []
    return {
      all: list.length,
      published: list.filter((s) => s.status === "published").length,
      draft: list.filter((s) => s.status !== "published").length,
      scenes: list.reduce((sum, s) => sum + (s.scene_count ?? 0), 0),
    }
  }, [stories])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...(stories ?? [])]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .filter((s) =>
        filter === "all"
          ? true
          : filter === "published"
            ? s.status === "published"
            : s.status !== "published",
      )
      .filter(
        (s) => !q || s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
      )
  }, [stories, filter, query])

  const stats = [
    { label: "Stories", value: counts.all, icon: BookOpen, tone: "bg-lavender text-lavender-ink" },
    { label: "Published", value: counts.published, icon: Globe, tone: "bg-mint text-mint-ink" },
    { label: "Drafts", value: counts.draft, icon: FileText, tone: "bg-butter text-butter-ink" },
    { label: "Scenes written", value: counts.scenes, icon: Layers, tone: "bg-sky text-sky-ink" },
  ]

  return (
    <div className="flex-1 px-4 pt-8 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Suspense>
          <WelcomeBanner />
        </Suspense>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lavender-ink font-mono text-[11px] font-medium tracking-[0.2em] uppercase">
              Writing desk
            </p>
            <h1 className="text-foreground mt-1 text-3xl font-extrabold tracking-tight">
              My stories
            </h1>
          </div>
          <Link
            href="/write/stories/new"
            className="from-lavender via-sky to-mint text-foreground group inline-flex w-fit items-center gap-2.5 rounded-full bg-linear-to-r py-2 pr-2 pl-5 text-sm font-bold shadow-md ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            New story
            <span className="bg-card flex h-8 w-8 items-center justify-center rounded-full shadow-sm">
              <Plus className="text-lavender-ink h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className="bg-card border-border flex items-center gap-3.5 rounded-2xl border p-4 shadow-sm"
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  tone,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-foreground text-2xl leading-none font-extrabold tabular-nums">
                  {isLoading ? "–" : value}
                </p>
                <p className="text-muted-foreground mt-1 text-xs font-semibold">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="mt-8 mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="bg-muted flex w-fit rounded-full p-1"
            role="tablist"
            aria-label="Filter stories"
          >
            {(["all", "published", "draft"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-all",
                  filter === f
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "draft" ? "Drafts" : f}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    filter === f ? "bg-lavender text-lavender-ink" : "bg-card/60",
                  )}
                >
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
          <label className="bg-card border-border focus-within:border-ring focus-within:ring-ring/40 flex h-10 w-full items-center gap-2 rounded-full border px-4 transition-all focus-within:ring-4 sm:w-64">
            <Search className="text-muted-foreground h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your stories…"
              aria-label="Search your stories"
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border-border h-72 animate-pulse rounded-3xl border"
              />
            ))}
          </div>
        ) : !stories?.length ? (
          <div className="bg-card border-border relative flex flex-col items-center overflow-hidden rounded-4xl border border-dashed px-6 py-20 text-center">
            <div className="bg-lavender/60 absolute -top-16 -left-16 h-56 w-56 rounded-full blur-3xl" />
            <div className="bg-peach/60 absolute -right-16 -bottom-16 h-56 w-56 rounded-full blur-3xl" />
            <div className="relative mb-5 h-24 w-28">
              <div className="bg-peach absolute top-0 left-0 flex h-16 w-16 -rotate-12 items-center justify-center rounded-2xl shadow-sm">
                <BookOpen className="text-peach-ink h-7 w-7" />
              </div>
              <div className="bg-lavender absolute right-0 bottom-0 flex h-16 w-16 rotate-6 items-center justify-center rounded-2xl shadow-sm">
                <PenLine className="text-lavender-ink h-7 w-7" />
              </div>
            </div>
            <p className="text-foreground relative text-xl font-extrabold">
              Your first story starts here
            </p>
            <p className="text-muted-foreground relative mt-1 max-w-sm text-sm">
              Give it a title, then map scenes and choices on the canvas. Readers decide how it
              ends.
            </p>
            <Link
              href="/write/stories/new"
              className="bg-primary text-primary-foreground relative mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-md transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create your first story
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-card border-border flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
            <p className="text-foreground font-bold">No stories match</p>
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setFilter("all")
              }}
              className="text-primary mt-2 cursor-pointer text-sm font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((story) => (
              <StoryCard key={story.id} story={story} onDelete={() => setToDelete(story)} />
            ))}
            {filter !== "published" && !query && (
              <Link
                href="/write/stories/new"
                className="border-border hover:border-lavender-ink/40 hover:bg-lavender/30 text-muted-foreground hover:text-lavender-ink group flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed transition-all"
              >
                <span className="bg-muted group-hover:bg-card flex h-14 w-14 items-center justify-center rounded-2xl transition-all group-hover:scale-105 group-hover:shadow-sm">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="text-sm font-bold">Start a new story</span>
              </Link>
            )}
          </div>
        )}
      </div>

      <DeleteStoryDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={toDelete?.title ?? ""}
        sceneCount={toDelete?.scene_count ?? 0}
        pending={isDeleting}
        onConfirm={() =>
          toDelete && deleteStory(toDelete.id, { onSuccess: () => setToDelete(null) })
        }
      />
    </div>
  )
}
