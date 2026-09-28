"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  GitBranch,
  Globe,
  Hash,
  Loader2,
  Pencil,
  PenLine,
  Play,
  Split,
  Trash2,
} from "lucide-react"
import { useDeleteStory, usePublishStory, useStory } from "@/hooks/use-stories"
import { useRatingLabel } from "@/hooks/use-taxonomy"
import { storyTone } from "@/lib/story-tone"
import { timeAgo } from "@/lib/time"
import { validateStory } from "@/lib/validate-story"
import { cn } from "@/lib/utils"
import { DeleteStoryDialog } from "@/components/app/delete-story-dialog"
import { StoryActionsMenu } from "@/components/app/story-actions-menu"

const SCENE_TYPE = {
  start: { label: "Start", tone: "bg-mint text-mint-ink", icon: Play },
  middle: { label: "Scene", tone: "bg-lavender text-lavender-ink", icon: BookOpen },
  ending: { label: "Ending", tone: "bg-blush text-blush-ink", icon: Flag },
} as const

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: story, isLoading } = useStory(id)
  const { mutate: setPublished, isPending: isPublishing } = usePublishStory(id)
  const { mutate: deleteStory, isPending: isDeleting } = useDeleteStory()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const contentRatingLabel = useRatingLabel()

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6 px-4 pt-14 sm:px-6 lg:px-8">
        <div className="bg-muted h-64 rounded-4xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="bg-muted h-72 rounded-3xl" />
          <div className="bg-muted h-72 rounded-3xl" />
        </div>
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

  const isPublished = story.status === "published"
  const endings = story.scenes.filter((s) => s.scene_type === "ending").length
  const issues = validateStory(story)
  const blockers = issues.filter((i) => i.level === "error")
  const canPublish = blockers.length === 0
  const scenes = [...story.scenes].sort(
    (a, b) =>
      ["start", "middle", "ending"].indexOf(a.scene_type) -
      ["start", "middle", "ending"].indexOf(b.scene_type),
  )

  const stats = [
    { label: "Scenes", value: story.scenes.length, icon: BookOpen, tone: "bg-sky text-sky-ink" },
    { label: "Choices", value: story.choices.length, icon: Split, tone: "bg-mint text-mint-ink" },
    { label: "Endings", value: endings, icon: Flag, tone: "bg-blush text-blush-ink" },
  ]

  return (
    <div className="flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/write/stories"
          className="text-muted-foreground hover:text-foreground hover:bg-muted -ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          My stories
        </Link>

        {/* Cover */}
        <section
          className={cn(
            "relative mt-4 overflow-hidden rounded-4xl bg-linear-to-br",
            storyTone(story.id),
          )}
        >
          <div className="bg-card/35 absolute -top-12 right-24 h-48 w-48 rotate-12 rounded-[3rem]" />
          <div className="bg-card/25 absolute -right-12 -bottom-16 h-56 w-56 -rotate-6 rounded-[3rem]" />
          <div className="bg-card/15 absolute bottom-6 left-1/2 h-20 w-20 rotate-45 rounded-2xl" />

          <div className="relative flex flex-col gap-6 p-6 sm:p-10 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm",
                    isPublished ? "bg-mint text-mint-ink" : "bg-butter text-butter-ink",
                  )}
                >
                  {isPublished ? (
                    <Globe className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  {isPublished ? "Published" : "Draft"}
                </span>
                {story.content_rating && (
                  <span className="bg-card/70 text-foreground/80 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase">
                    {contentRatingLabel(story.content_rating)}
                  </span>
                )}
                <span className="text-foreground/65 text-xs font-medium">
                  Updated {timeAgo(story.updated_at)}
                </span>
              </div>
              <h1 className="text-foreground text-4xl leading-[1.08] font-extrabold tracking-tight wrap-break-word sm:text-5xl">
                {story.title}
              </h1>
              {(story.genres?.length > 0 || story.moods?.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {story.genres?.map((g) => (
                    <span
                      key={g}
                      className="bg-card/80 text-lavender-ink rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm"
                    >
                      {g}
                    </span>
                  ))}
                  {story.moods?.map((m) => (
                    <span
                      key={m}
                      className="bg-card/50 text-foreground/75 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/write/stories/${id}/canvas`}
                className="bg-card text-foreground group inline-flex items-center gap-2.5 rounded-full py-2 pr-2 pl-5 text-sm font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <GitBranch className="text-lavender-ink h-4 w-4" />
                Open canvas
                <span className="bg-lavender flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="text-lavender-ink h-4 w-4" />
                </span>
              </Link>
              <Link
                href={`/write/stories/${id}/edit`}
                aria-label="Edit details"
                title="Edit details"
                className="bg-card/80 text-foreground hover:bg-card flex h-12 w-12 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <StoryActionsMenu
                story={story}
                showOverview={false}
                onDelete={() => setConfirmDelete(true)}
                triggerClassName="bg-card/80 hover:bg-card text-foreground h-12 w-12 shadow-sm backdrop-blur-sm"
              />
            </div>
          </div>
        </section>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main column */}
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {stats.map(({ label, value, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="bg-card border-border flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center"
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
                      {value}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs font-semibold">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <section className="bg-card border-border rounded-3xl border p-6 shadow-sm sm:p-7">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground font-bold">About this story</h2>
                <Link
                  href={`/write/stories/${id}/edit`}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  Edit
                </Link>
              </div>
              <p className="text-foreground/80 font-serif text-[17px] leading-[1.8] whitespace-pre-line">
                {story.description ||
                  "No description yet — add one so readers know what they're getting into."}
              </p>
              {story.tags?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {story.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                    >
                      <Hash className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-card border-border rounded-3xl border p-6 shadow-sm sm:p-7">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground font-bold">Scenes</h2>
                <Link
                  href={`/write/stories/${id}/canvas`}
                  className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                  Edit on canvas
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {scenes.length === 0 ? (
                <div className="bg-background rounded-2xl p-6 text-center">
                  <p className="text-foreground text-sm font-semibold">No scenes yet</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Open the canvas to write your opening scene.
                  </p>
                </div>
              ) : (
                <ul className="divide-border divide-y">
                  {scenes.slice(0, 6).map((scene) => {
                    const type = SCENE_TYPE[scene.scene_type]
                    const outgoing = story.choices.filter(
                      (c) => c.from_scene_id === scene.id,
                    ).length
                    return (
                      <li key={scene.id} className="flex items-center gap-3 py-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            type.tone,
                          )}
                        >
                          <type.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-sm font-semibold">
                            {scene.title || "Untitled scene"}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {scene.content ? scene.content.slice(0, 90) : "No content yet"}
                          </p>
                        </div>
                        <span className="text-muted-foreground hidden shrink-0 text-xs sm:block">
                          {scene.scene_type === "ending"
                            ? type.label
                            : `${outgoing} choice${outgoing === 1 ? "" : "s"}`}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
              {scenes.length > 6 && (
                <p className="text-muted-foreground mt-3 text-center text-xs">
                  +{scenes.length - 6} more on the canvas
                </p>
              )}
            </section>
          </div>

          {/* Side column */}
          <aside className="space-y-6 lg:sticky lg:top-6">
            <section className="bg-card border-border shadow-lavender-ink/5 overflow-hidden rounded-3xl border shadow-xl">
              <div className={cn("p-6", isPublished ? "bg-mint/60" : "bg-butter/60")}>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "bg-card flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm",
                      isPublished ? "text-mint-ink" : "text-butter-ink",
                    )}
                  >
                    {isPublished ? <Globe className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="text-foreground font-bold">
                      {isPublished ? "Live in the catalogue" : "Draft"}
                    </p>
                    <p className="text-foreground/70 text-xs">
                      {isPublished
                        ? "Readers can find and play this story."
                        : "Only you can see this story."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <p className="text-muted-foreground mb-3 text-xs font-bold tracking-wide uppercase">
                    Story health
                  </p>
                  {issues.length === 0 ? (
                    <div className="bg-mint/50 text-mint-ink flex items-start gap-2.5 rounded-2xl p-3 text-sm font-medium">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      Every path works. Ready for readers.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {issues.map((issue, i) => (
                        <li
                          key={i}
                          className={cn(
                            "flex items-start gap-2.5 rounded-2xl p-3 text-sm leading-snug",
                            issue.level === "error"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-butter/60 text-butter-ink",
                          )}
                        >
                          {issue.level === "error" ? (
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          )}
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {isPublished ? (
                  <div className="space-y-2">
                    <Link
                      href={`/story/${id}`}
                      className="bg-primary text-primary-foreground flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View as a reader
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPublished(false)}
                      disabled={isPublishing}
                      className="border-border text-foreground hover:bg-muted flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                      {isPublishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                      Unpublish
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setPublished(true)}
                      disabled={isPublishing || !canPublish}
                      className="from-mint via-sky to-lavender text-foreground flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-linear-to-r text-sm font-bold shadow-md ring-1 ring-black/5 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                      {isPublishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Globe className="text-mint-ink h-4 w-4" />
                      )}
                      {isPublishing ? "Publishing…" : "Publish story"}
                    </button>
                    {!canPublish && (
                      <p className="text-muted-foreground mt-2 text-center text-xs">
                        Fix the issues above to publish.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="border-destructive/25 rounded-3xl border border-dashed p-6">
              <p className="text-foreground text-sm font-bold">Danger zone</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Deleting removes every scene and choice permanently.
              </p>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:bg-destructive/10 mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete story
              </button>
            </section>
          </aside>
        </div>
      </div>

      <DeleteStoryDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={story.title}
        sceneCount={story.scenes.length}
        pending={isDeleting}
        onConfirm={() => deleteStory(id)}
      />
    </div>
  )
}
