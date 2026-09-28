"use client"

import Link from "next/link"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  GitBranch,
  Hash,
  Loader2,
  Palette,
  ShieldCheck,
} from "lucide-react"
import { TagInput } from "@/components/ui/tag-input"
import { createStorySchema, type CreateStoryFormData } from "@/lib/schemas/story"
import { useRatingLabel, useTaxonomy } from "@/hooks/use-taxonomy"
import { storyTone } from "@/lib/story-tone"
import { cn } from "@/lib/utils"

const EMPTY: CreateStoryFormData = {
  title: "",
  description: "",
  genres: [],
  moods: [],
  tags: [],
  contentRating: undefined,
}

const field =
  "bg-muted text-foreground placeholder:text-muted-foreground/80 focus:bg-card focus:border-ring focus:ring-ring/40 w-full rounded-2xl border border-transparent px-4 outline-none transition-all focus:ring-4 aria-invalid:border-destructive/60"

interface StoryFormProps {
  kind: "create" | "edit"
  backHref: string
  backLabel: string
  defaultValues?: CreateStoryFormData
  storyId?: string
  pending: boolean
  onSubmit: (data: CreateStoryFormData) => void
}

export function StoryForm({
  kind,
  backHref,
  backLabel,
  defaultValues = EMPTY,
  storyId,
  pending,
  onSubmit,
}: StoryFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<CreateStoryFormData>({
    resolver: zodResolver(createStorySchema),
    defaultValues,
  })
  const { data: taxonomy } = useTaxonomy()
  const title = useWatch({ control, name: "title" })
  const description = useWatch({ control, name: "description" })

  return (
    <div className="flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground hover:bg-muted -ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <h1 className="text-foreground mt-3 text-3xl font-extrabold tracking-tight">
          {kind === "create" ? "Create a new story" : "Edit story details"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {kind === "create"
            ? "Start with the essentials. You'll build scenes and choices on the canvas next."
            : "Update how your story is presented to readers."}
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
        >
          <div className="space-y-6">
            <Section
              icon={FileText}
              tone="bg-lavender text-lavender-ink"
              title="The basics"
              description="A title and a hook that makes readers want to start."
            >
              <div className="space-y-5">
                <div>
                  <FieldHeader htmlFor="title" label="Title" count={title?.length ?? 0} max={200} />
                  <input
                    id="title"
                    autoFocus={kind === "create"}
                    placeholder="The Haunted Library"
                    aria-invalid={!!errors.title}
                    className={cn(field, "h-14 text-lg font-semibold")}
                    {...register("title")}
                  />
                  <FieldError message={errors.title?.message} />
                </div>
                <div>
                  <FieldHeader
                    htmlFor="description"
                    label="Description"
                    count={description?.length ?? 0}
                    max={1000}
                  />
                  <textarea
                    id="description"
                    rows={5}
                    placeholder="A lost key, a locked wing, and a librarian who never ages. Will you find the way out — or stay forever?"
                    aria-invalid={!!errors.description}
                    className={cn(field, "min-h-32 resize-y py-3 text-sm leading-relaxed")}
                    {...register("description")}
                  />
                  <FieldError message={errors.description?.message} />
                </div>
              </div>
            </Section>

            <Section
              icon={Palette}
              tone="bg-peach text-peach-ink"
              title="Genre & mood"
              description="Helps readers find your story in the catalogue."
            >
              <div className="space-y-6">
                <ChipField
                  control={control}
                  name="genres"
                  label="Genres"
                  items={taxonomy?.genres}
                  max={taxonomy?.limits.story_genres ?? 5}
                  tone="lavender"
                />
                <ChipField
                  control={control}
                  name="moods"
                  label="Mood & tone"
                  items={taxonomy?.moods}
                  max={taxonomy?.limits.story_moods ?? 5}
                  tone="peach"
                />
              </div>
            </Section>

            <Section
              icon={ShieldCheck}
              tone="bg-mint text-mint-ink"
              title="Audience"
              description="Optional — who is this story written for?"
            >
              <Controller
                control={control}
                name="contentRating"
                render={({ field: f }) => (
                  <div
                    className="grid grid-cols-2 gap-2.5 sm:grid-cols-5"
                    role="radiogroup"
                    aria-label="Content rating"
                  >
                    {(taxonomy?.content_ratings ?? []).map((r) => {
                      const active = f.value === r.value
                      return (
                        <button
                          key={r.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => f.onChange(active ? undefined : r.value)}
                          className={cn(
                            "relative flex cursor-pointer flex-col items-start rounded-2xl border p-3.5 text-left transition-all",
                            active
                              ? "bg-mint border-mint-ink/40 text-mint-ink shadow-sm"
                              : "bg-background border-border text-foreground hover:border-mint-ink/30",
                          )}
                        >
                          {active && <Check className="absolute top-3 right-3 h-4 w-4" />}
                          <span className="text-sm font-bold">{r.label}</span>
                          <span
                            className={cn(
                              "text-xs",
                              active ? "text-mint-ink/80" : "text-muted-foreground",
                            )}
                          >
                            {r.hint}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              />
            </Section>

            <Section
              icon={Hash}
              tone="bg-sky text-sky-ink"
              title="Themes"
              description="Keywords like “time travel” or “found family”. Press Enter or comma to add."
            >
              <Controller
                control={control}
                name="tags"
                render={({ field: f }) => (
                  <TagInput
                    value={f.value}
                    onChange={f.onChange}
                    max={taxonomy?.limits.tags ?? 10}
                    maxLength={taxonomy?.limits.tag_length ?? 30}
                    placeholder="time travel, redemption, betrayal…"
                  />
                )}
              />
            </Section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <PreviewCard control={control} storyId={storyId} />

            <button
              type="submit"
              disabled={pending || (kind === "edit" && !isDirty)}
              className="from-lavender via-sky to-mint text-foreground group flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-linear-to-r text-base font-bold shadow-md ring-1 ring-black/5 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {pending
                ? kind === "create"
                  ? "Creating…"
                  : "Saving…"
                : kind === "create"
                  ? "Create story"
                  : "Save changes"}
              <span className="bg-card flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-transform group-enabled:group-hover:translate-x-0.5">
                {pending ? (
                  <Loader2 className="text-lavender-ink h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="text-lavender-ink h-4 w-4" />
                )}
              </span>
            </button>

            {kind === "edit" ? (
              <Link
                href={backHref}
                className="text-muted-foreground hover:text-foreground hover:bg-muted block rounded-2xl py-2.5 text-center text-sm font-semibold transition-colors"
              >
                Cancel
              </Link>
            ) : (
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-center text-xs">
                <GitBranch className="h-3.5 w-3.5" />
                Next: map scenes and choices on the canvas
              </p>
            )}
          </aside>
        </form>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  tone,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-card border-border rounded-3xl border p-6 shadow-sm sm:p-7">
      <div className="mb-6 flex items-start gap-3.5">
        <span
          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone)}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-foreground font-bold">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function FieldHeader({
  htmlFor,
  label,
  count,
  max,
}: {
  htmlFor: string
  label: string
  count: number
  max: number
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-foreground text-sm font-semibold">
        {label}
      </label>
      <span
        className={cn(
          "text-xs tabular-nums",
          count > max ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {count}/{max}
      </span>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-destructive mt-1.5 text-xs">{message}</p>
}

const CHIP_TONES = {
  lavender: "bg-lavender text-lavender-ink border-lavender-ink/30",
  peach: "bg-peach text-peach-ink border-peach-ink/30",
}

function ChipField({
  control,
  name,
  label,
  items,
  max,
  tone,
}: {
  control: Control<CreateStoryFormData>
  name: "genres" | "moods"
  label: string
  items: string[] | undefined
  max: number
  tone: keyof typeof CHIP_TONES
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => (
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-foreground text-sm font-semibold">
              {label} <span className="text-muted-foreground font-normal">(up to {max})</span>
            </p>
            {f.value.length > 0 && (
              <button
                type="button"
                onClick={() => f.onChange([])}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium"
              >
                {f.value.length}/{max} selected · Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!items &&
              Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className="bg-muted h-8 w-24 animate-pulse rounded-full" />
              ))}
            {items?.map((item) => {
              const active = f.value.includes(item)
              const full = !active && f.value.length >= max
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  disabled={full}
                  onClick={() =>
                    f.onChange(active ? f.value.filter((v) => v !== item) : [...f.value, item])
                  }
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                    active
                      ? cn(CHIP_TONES[tone], "font-semibold shadow-sm")
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 disabled:hover:border-border disabled:hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                  {item}
                </button>
              )
            })}
          </div>
        </div>
      )}
    />
  )
}

function PreviewCard({
  control,
  storyId,
}: {
  control: Control<CreateStoryFormData>
  storyId?: string
}) {
  const values = useWatch({ control })
  const title = values.title?.trim()
  const description = values.description?.trim()
  const rating = useRatingLabel()(values.contentRating)

  return (
    <div className="bg-card border-border shadow-lavender-ink/5 overflow-hidden rounded-3xl border shadow-xl">
      <div
        className={cn(
          "relative h-28 overflow-hidden bg-linear-to-br",
          storyTone(storyId ?? "new-story"),
        )}
      >
        <div className="bg-card/35 absolute -right-6 -bottom-10 h-28 w-28 rotate-12 rounded-3xl" />
        <div className="bg-card/25 absolute top-4 right-16 h-10 w-10 -rotate-12 rounded-xl" />
        <span className="bg-card/85 text-foreground/70 absolute top-3 left-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.2em] uppercase backdrop-blur-sm">
          Catalogue preview
        </span>
      </div>
      <div className="space-y-2.5 p-5">
        <h3
          className={cn(
            "text-[17px] leading-snug font-bold",
            title ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {title || "Untitled story"}
        </h3>
        <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
          {description || "Your description will appear here."}
        </p>
        {((values.genres?.length ?? 0) > 0 || rating) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {values.genres?.slice(0, 2).map((g) => (
              <span
                key={g}
                className="bg-lavender text-lavender-ink rounded-full px-2.5 py-0.5 text-xs font-semibold"
              >
                {g}
              </span>
            ))}
            {rating && (
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                {rating}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
