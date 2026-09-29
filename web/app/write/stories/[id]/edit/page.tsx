"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { StoryForm } from "@/components/app/story-form"
import { useStoryWorkspace } from "@/components/app/story-workspace"
import { useStory, useUpdateStory } from "@/hooks/use-stories"
import type { CreateStoryFormData } from "@/lib/schemas/story"
import { showToast } from "@/lib/toast"

export default function EditStorySettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const ws = useStoryWorkspace()
  const { data: story, isLoading } = useStory(id)
  const { mutate: updateStory, isPending } = useUpdateStory(id)

  function onSubmit(data: CreateStoryFormData) {
    updateStory(
      {
        title: data.title,
        description: data.description,
        genres: data.genres,
        moods: data.moods,
        content_rating: data.contentRating || null,
        tags: data.tags,
      },
      {
        onSuccess: () => {
          showToast.success("Story updated")
          router.push(ws.storyPath(id))
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl animate-pulse gap-8 px-4 pt-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="space-y-6">
          <div className="bg-muted h-64 rounded-3xl" />
          <div className="bg-muted h-48 rounded-3xl" />
        </div>
        <div className="bg-muted h-80 rounded-3xl" />
      </div>
    )
  }

  if (!story) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-foreground font-semibold">Story not found</p>
        <Link href={ws.root} className="text-primary text-sm font-semibold hover:underline">
          Back to {ws.backLabel.toLowerCase()}
        </Link>
      </div>
    )
  }

  return (
    <StoryForm
      kind="edit"
      backHref={ws.storyPath(id)}
      backLabel={story.title}
      storyId={story.id}
      defaultValues={{
        title: story.title,
        description: story.description,
        genres: story.genres ?? [],
        moods: story.moods ?? [],
        tags: story.tags ?? [],
        contentRating: story.content_rating ?? undefined,
      }}
      pending={isPending}
      onSubmit={onSubmit}
    />
  )
}
