"use client"

import { use } from "react"
import { PageHeader } from "@workspace/ui/components/page-header"
import { StoryCanvas } from "@/components/app/editor/story-canvas"
import { useStory } from "@/hooks/use-stories"

export default function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: story, isLoading } = useStory(id)

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="animate-pulse space-y-3 px-6 py-4">
          <div className="bg-muted h-5 w-48 rounded" />
        </div>
        <div className="bg-background flex-1 animate-pulse" />
      </div>
    )
  }

  if (!story) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-foreground">Story not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title={story.title}
        subtitle="Story editor"
        backHref={`/stories/${id}`}
        className="shrink-0"
      />
      <div className="flex-1 overflow-hidden">
        <StoryCanvas storyId={id} scenes={story.scenes} choices={story.choices} />
      </div>
    </div>
  )
}
