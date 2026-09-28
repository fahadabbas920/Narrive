"use client"

import Link from "next/link"
import { ArrowRight, GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PublicStory } from "@/lib/api/public"
import { storyTone } from "@/lib/story-tone"
import { useRatingLabel } from "@/hooks/use-taxonomy"

export function PublicStoryCard({
  story,
  showAuthor = true,
}: {
  story: PublicStory
  showAuthor?: boolean
}) {
  const contentRatingLabel = useRatingLabel()
  return (
    <Link
      href={`/story/${story.id}`}
      className="group bg-card border-border hover:border-lavender-ink/25 hover:shadow-lavender-ink/5 flex flex-col overflow-hidden rounded-3xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className={cn("relative h-28 overflow-hidden bg-linear-to-br", storyTone(story.id))}>
        <div className="bg-card/35 absolute -right-6 -bottom-10 h-28 w-28 rotate-12 rounded-3xl transition-transform duration-500 group-hover:rotate-20" />
        <div className="bg-card/25 absolute top-4 right-16 h-10 w-10 -rotate-12 rounded-xl" />
        <span className="bg-card/85 text-foreground/80 absolute bottom-3 left-4 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
          <GitBranch className="h-3 w-3" />
          {story.scene_count} scene{story.scene_count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-foreground group-hover:text-primary text-[17px] leading-snug font-bold transition-colors">
            {story.title}
          </h3>
          <ArrowRight className="text-muted-foreground group-hover:text-primary mt-1 h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5" />
        </div>
        {showAuthor && story.author_name && (
          <p className="text-muted-foreground -mt-1 text-xs font-medium">by {story.author_name}</p>
        )}
        <p className="text-muted-foreground line-clamp-2 flex-1 text-sm leading-relaxed">
          {story.description || "No description yet."}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
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
      </div>
    </Link>
  )
}
