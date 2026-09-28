"use client"

import { StoryForm } from "@/components/app/story-form"
import { useCreateStory } from "@/hooks/use-stories"
import type { CreateStoryFormData } from "@/lib/schemas/story"

export default function NewStoryPage() {
  const { mutate: createStory, isPending } = useCreateStory()

  function onSubmit(data: CreateStoryFormData) {
    createStory({
      title: data.title,
      description: data.description,
      genres: data.genres,
      moods: data.moods,
      content_rating: data.contentRating || null,
      tags: data.tags,
    })
  }

  return (
    <StoryForm
      kind="create"
      backHref="/write/stories"
      backLabel="My stories"
      pending={isPending}
      onSubmit={onSubmit}
    />
  )
}
