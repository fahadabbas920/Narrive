"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { PageHeader } from "@workspace/ui/components/page-header"
import { ButtonUI } from "@workspace/ui/components/button-ui"
import { BadgePicker } from "@workspace/ui/components/badge-picker"
import { TagInput } from "@workspace/ui/components/tag-input"
import { useCreateStory } from "@/hooks/use-stories"
import { createStorySchema, type CreateStoryFormData } from "@/lib/schemas/story"
import { GENRES, MOODS, CONTENT_RATINGS } from "@/lib/constants/story"
import { cn } from "@workspace/ui/lib/utils"
import type { CreateStoryPayload } from "@/lib/api/stories"

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <Label className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
      {children}
      {hint && <span className="text-muted-foreground/60 ml-1 normal-case">({hint})</span>}
    </Label>
  )
}

export default function NewStoryPage() {
  const { mutate: createStory, isPending } = useCreateStory()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateStoryFormData>({
    resolver: zodResolver(createStorySchema),
    defaultValues: { genres: [], moods: [], tags: [], contentRating: undefined },
  })

  function onSubmit(data: CreateStoryFormData) {
    const payload: CreateStoryPayload = {
      title: data.title,
      description: data.description,
      genres: data.genres,
      moods: data.moods,
      content_rating: data.contentRating || null,
      tags: data.tags,
    }
    createStory(payload)
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="New Story"
        subtitle="Create a new interactive story"
        backHref="/stories"
      />

      <div className="flex-1 px-6 pb-16">
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-7">
          {/* Title */}
          <div className="space-y-1.5">
            <FieldLabel>Title</FieldLabel>
            <Input
              placeholder="The Haunted Library"
              className="h-auto py-2.5"
              {...register("title")}
            />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <FieldLabel>Description</FieldLabel>
            <Textarea
              placeholder="A short description of your story…"
              rows={4}
              {...register("description")}
            />
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

          <div className="flex justify-center pt-2">
            <ButtonUI type="submit" disabled={isPending} className="min-w-40">
              {isPending ? "Creating…" : "Create Story"}
            </ButtonUI>
          </div>
        </form>
      </div>
    </div>
  )
}
