"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, ExternalLink, Globe } from "lucide-react"
import { StoryCanvas } from "@/components/app/editor/story-canvas"
import { useStory } from "@/hooks/use-stories"
import { cn } from "@/lib/utils"

export default function StoryCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: story, isLoading } = useStory(id)

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="border-border flex h-14 items-center gap-3 border-b px-4">
          <div className="bg-muted h-5 w-48 animate-pulse rounded-lg" />
        </div>
        <div className="bg-background flex-1 animate-pulse" />
      </div>
    )
  }

  if (!story) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-foreground font-bold">Story not found</p>
        <Link href="/write/stories" className="text-primary text-sm font-semibold hover:underline">
          Back to my stories
        </Link>
      </div>
    )
  }

  const published = story.status === "published"

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-border bg-card flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-5">
        <Link
          href={`/write/stories/${id}`}
          aria-label="Back to story overview"
          title="Story overview"
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-bold">{story.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {story.scenes.length} scene{story.scenes.length === 1 ? "" : "s"} ·{" "}
            {story.choices.length} choice
            {story.choices.length === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={cn(
            "hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline-flex",
            published ? "bg-mint text-mint-ink" : "bg-butter text-butter-ink",
          )}
        >
          {published ? <Globe className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {published ? "Published" : "Draft"}
        </span>
        {published && (
          <Link
            href={`/story/${id}`}
            className="border-border text-foreground hover:bg-muted hidden items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors md:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View as reader
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <StoryCanvas storyId={id} scenes={story.scenes} choices={story.choices} />
      </div>
    </div>
  )
}
