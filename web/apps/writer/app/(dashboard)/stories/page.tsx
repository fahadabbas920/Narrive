"use client"

import Link from "next/link"
import { Plus, BookOpen, Pencil, Trash2, Globe, Clock } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { PageHeader } from "@workspace/ui/components/page-header"
import { ButtonUI } from "@workspace/ui/components/button-ui"
import { useStories, useDeleteStory } from "@/hooks/use-stories"
import { contentRatingLabel } from "@/lib/constants/story"
import { cn } from "@workspace/ui/lib/utils"

export default function StoriesPage() {
  const { data: stories, isLoading } = useStories()
  const { mutate: deleteStory, isPending: isDeleting } = useDeleteStory()

  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    deleteStory(id)
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="My Stories"
        subtitle="Writer dashboard"
        action={
          <ButtonUI render={<Link href="/stories/new" />}>
            <Plus className="h-4 w-4" />
            New Story
          </ButtonUI>
        }
      />

      <div className="flex-1 px-6 pb-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card h-52 animate-pulse rounded-2xl border border-border" />
            ))}
          </div>
        ) : !stories?.length ? (
          <div className="flex flex-col items-center justify-center gap-5 py-28 text-center">
            <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-2xl">
              <BookOpen className="text-primary h-8 w-8" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-lg">No stories yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first interactive story to get started.
              </p>
            </div>
            <ButtonUI render={<Link href="/stories/new" />}>
              <Plus className="h-4 w-4" />
              Create your first story
            </ButtonUI>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-card group flex flex-col gap-0 rounded-2xl border border-border overflow-hidden shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              >
                {/* Coloured top strip */}
                <div className={cn(
                  "h-1.5 w-full",
                  story.status === "published" ? "bg-primary" : "bg-muted-foreground/30"
                )} />

                <div className="flex flex-col gap-3 p-5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-semibold truncate leading-snug">{story.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {story.scene_count ?? 0} scene{(story.scene_count ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge
                      variant={story.status === "published" ? "default" : "secondary"}
                      className={cn(
                        "shrink-0 text-xs gap-1",
                        story.status === "published" && "bg-primary/15 text-primary border-primary/20"
                      )}
                    >
                      {story.status === "published" ? (
                        <Globe className="h-2.5 w-2.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                      {story.status}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-sm line-clamp-2 flex-1 leading-relaxed">
                    {story.description}
                  </p>

                  {(story.genres?.length > 0 || story.content_rating) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {story.genres?.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                        >
                          {g}
                        </span>
                      ))}
                      {story.content_rating && (
                        <span className="text-muted-foreground border-border rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          {contentRatingLabel(story.content_rating)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 border-t border-border px-4 py-2.5">
                  <ButtonUI
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs text-muted-foreground hover:text-foreground"
                    render={<Link href={`/stories/${story.id}`} />}
                  >
                    View
                  </ButtonUI>
                  <ButtonUI
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/stories/${story.id}/canvas`} />}
                    title="Open editor"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </ButtonUI>
                  <ButtonUI
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(story.id, story.title)}
                    disabled={isDeleting}
                    title="Delete story"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ButtonUI>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
