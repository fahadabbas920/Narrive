"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { PageHeader } from "@workspace/ui/components/page-header"
import { ButtonUI } from "@workspace/ui/components/button-ui"
import { BadgePicker } from "@workspace/ui/components/badge-picker"
import { TagInput } from "@workspace/ui/components/tag-input"
import { useStory, useUpdateStory } from "@/hooks/use-stories"
import { createStorySchema, type CreateStoryFormData } from "@/lib/schemas/story"
import { GENRES, MOODS, CONTENT_RATINGS } from "@/lib/constants/story"
import { showToast } from "@workspace/ui/lib/toast"
import { cn } from "@workspace/ui/lib/utils"
import type { UpdateStoryPayload } from "@/lib/api/stories"

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <Label className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
      {children}
      {hint && <span className="text-muted-foreground/60 ml-1 normal-case">({hint})</span>}
    </Label>
  )
}

export default function EditStorySettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: story, isLoading } = useStory(id)
  const { mutate: updateStory, isPending } = useUpdateStory(id)

  const { register, handleSubmit, control, reset, formState: { errors } } =
    useForm<CreateStoryFormData>({
      resolver: zodResolver(createStorySchema),
      defaultValues: { title: "", description: "", genres: [], moods: [], tags: [], contentRating: undefined },
    })

  useEffect(() => {
    if (story) {
      reset({
        title: story.title,
        description: story.description,
        genres: story.genres ?? [],
        moods: story.moods ?? [],
        tags: story.tags ?? [],
        contentRating: story.content_rating ?? undefined,
      })
    }
  }, [story, reset])

  function onSubmit(data: CreateStoryFormData) {
    const payload: UpdateStoryPayload = {
      title: data.title,
      description: data.description,
      genres: data.genres,
      moods: data.moods,
      content_rating: data.contentRating || null,
      tags: data.tags,
    }
    updateStory(payload, {
      onSuccess: () => {
        showToast.success("Story updated")
        router.push(`/stories/${id}`)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="bg-muted h-6 w-48 animate-pulse rounded-lg" />
        <div className="bg-muted mx-auto h-96 w-full max-w-2xl animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (!story) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-foreground font-semibold">Story not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Edit Story" subtitle="Story details" backHref={`/stories/${id}`} />

      <div className="flex-1 px-6 pb-16">
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-7">
          {/* Title */}
          <div className="space-y-1.5">
            <FieldLabel>Title</FieldLabel>
            <Input placeholder="The Haunted Library" className="h-auto py-2.5" {...register("title")} />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <FieldLabel>Description</FieldLabel>
            <Textarea placeholder="A short description of your story…" rows={4} {...register("description")} />
            {errors.description && (
              <p className="text-destructive text-xs">{errors.description.message}</p>
            )}
          </div>

          {/* Genres */}
          <div className="space-y-3">
            <FieldLabel hint="select any">Genres</FieldLabel>
            <Controller
              control={control}
              name="genres"
              render={({ field }) => (
                <BadgePicker
                  items={GENRES}
                  selected={field.value}
                  onToggle={(item) =>
                    field.onChange(
                      field.value.includes(item)
                        ? field.value.filter((g) => g !== item)
                        : [...field.value, item],
                    )
                  }
                />
              )}
            />
          </div>

          {/* Mood / Tone */}
          <div className="space-y-3">
            <FieldLabel hint="select any">Mood / Tone</FieldLabel>
            <Controller
              control={control}
              name="moods"
              render={({ field }) => (
                <BadgePicker
                  items={MOODS}
                  selected={field.value}
                  onToggle={(item) =>
                    field.onChange(
                      field.value.includes(item)
                        ? field.value.filter((m) => m !== item)
                        : [...field.value, item],
                    )
                  }
                />
              )}
            />
          </div>

          {/* Content rating */}
          <div className="space-y-3">
            <FieldLabel hint="optional">Content Rating</FieldLabel>
            <Controller
              control={control}
              name="contentRating"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {CONTENT_RATINGS.map((r) => {
                    const active = field.value === r.value
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => field.onChange(active ? undefined : r.value)}
                        className={cn(
                          "h-8 rounded-full border px-4 text-xs font-medium transition-all",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                        )}
                      >
                        {r.label}
                        <span className="ml-1 opacity-60">{r.hint}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          {/* Themes / tags */}
          <div className="space-y-3">
            <FieldLabel hint="press enter to add">Themes</FieldLabel>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="time travel, redemption, betrayal…"
                />
              )}
            />
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <ButtonUI type="submit" disabled={isPending} className="min-w-40">
              {isPending ? "Saving…" : "Save Changes"}
            </ButtonUI>
            <ButtonUI
              type="button"
              variant="ghost"
              onClick={() => router.push(`/stories/${id}`)}
            >
              Cancel
            </ButtonUI>
          </div>
        </form>
      </div>
    </div>
  )
}
