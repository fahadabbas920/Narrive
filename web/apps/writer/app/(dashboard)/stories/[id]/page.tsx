"use client"

import { use } from "react"
import Link from "next/link"
import {
  Pencil,
  GitBranch,
  Globe,
  Archive,
  BookOpen,
  Split,
  Flag,
  ArrowLeft,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { ButtonUI } from "@workspace/ui/components/button-ui"
import { useStory, usePublishStory, useDeleteStory } from "@/hooks/use-stories"
import { contentRatingLabel } from "@/lib/constants/story"
import { validateStory } from "@/lib/validate-story"
import { cn } from "@workspace/ui/lib/utils"

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: story, isLoading } = useStory(id)
  const { mutate: setPublished, isPending: isPublishing } = usePublishStory(id)
  const { mutate: deleteStory, isPending: isDeleting } = useDeleteStory()

  function handleDelete() {
    if (!story) return
    if (!confirm(`Delete "${story.title}"? This cannot be undone.`)) return
    deleteStory(id)
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="bg-muted h-40 w-full animate-pulse rounded-3xl" />
        <div className="bg-muted h-28 w-full max-w-xl animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (!story) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-foreground font-semibold">Story not found</p>
        <ButtonUI variant="ghost" render={<Link href="/stories" />}>
          Back to stories
        </ButtonUI>
      </div>
    )
  }

  const endingScenes = story.scenes.filter((s) => s.scene_type === "ending")
  const isPublished = story.status === "published"
  const issues = validateStory(story)
  const errors = issues.filter((i) => i.level === "error")
  const warnings = issues.filter((i) => i.level === "warning")
  const canPublish = errors.length === 0

  const stats = [
    { label: "Scenes", value: story.scenes.length, icon: BookOpen },
    { label: "Choices", value: story.choices.length, icon: Split },
    { label: "Endings", value: endingScenes.length, icon: Flag },
  ]

  return (
    <div className="flex flex-1 flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link
          href="/stories"
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All stories
        </Link>
        <div className="flex items-center gap-2">
          <ButtonUI variant="outline" size="sm" render={<Link href={`/stories/${id}/edit`} />}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </ButtonUI>
          {isPublished ? (
            <ButtonUI
              variant="outline"
              size="sm"
              onClick={() => setPublished(false)}
              disabled={isPublishing}
            >
              <Archive className="h-3.5 w-3.5" />
              Unpublish
            </ButtonUI>
          ) : (
            <ButtonUI
              size="sm"
              onClick={() => setPublished(true)}
              disabled={isPublishing || !canPublish}
              title={!canPublish ? errors[0]?.message : undefined}
            >
              <Globe className="h-3.5 w-3.5" />
              {isPublishing ? "Publishing…" : "Publish"}
            </ButtonUI>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 pb-10">
        {/* Hero banner */}
        <div className="from-primary/90 via-primary/70 to-accent relative overflow-hidden rounded-3xl bg-linear-to-br p-8 shadow-sm">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
                  isPublished ? "bg-white/25 text-white" : "bg-black/15 text-white/90",
                )}
              >
                {isPublished ? <Globe className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                {story.status}
              </span>
              {story.content_rating && (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white uppercase">
                  {contentRatingLabel(story.content_rating)}
                </span>
              )}
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white">{story.title}</h1>

            {(story.genres?.length > 0 || story.moods?.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {story.genres?.map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                  >
                    {g}
                  </span>
                ))}
                {story.moods?.map((m) => (
                  <span
                    key={m}
                    className="rounded-full border border-white/30 px-2.5 py-0.5 text-xs font-medium text-white/90"
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: about + stats */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-card border-border rounded-2xl border p-6">
              <h2 className="text-muted-foreground mb-2 font-mono text-[11px] tracking-widest uppercase">
                About
              </h2>
              <p className="text-foreground/80 leading-relaxed">{story.description}</p>

              {story.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {story.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-card border-border rounded-2xl border p-5">
                  <div className="bg-primary/10 mb-3 flex h-9 w-9 items-center justify-center rounded-xl">
                    <Icon className="text-primary h-4.5 w-4.5" />
                  </div>
                  <p className="text-foreground text-3xl font-bold">{value}</p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-[10px] tracking-widest uppercase">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: actions */}
          <div className="space-y-4">
            {/* Story health */}
            <div className="bg-card border-border rounded-2xl border p-6">
              <h2 className="text-muted-foreground mb-4 font-mono text-[11px] tracking-widest uppercase">
                Story Health
              </h2>

              {issues.length === 0 ? (
                <div className="text-foreground/80 flex items-start gap-2 text-sm leading-relaxed">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  Everything looks good — ready to publish.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {issues.map((issue, i) => (
                    <li
                      key={i}
                      className="text-foreground/80 flex items-start gap-2 text-xs leading-relaxed"
                    >
                      {issue.level === "error" ? (
                        <AlertCircle className="text-destructive mt-0.5 h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Manage */}
            <div className="bg-card border-border rounded-2xl border p-6">
              <h2 className="text-muted-foreground mb-4 font-mono text-[11px] tracking-widest uppercase">
                Manage
              </h2>

              <div className="space-y-2">
                <ButtonUI className="w-full" render={<Link href={`/stories/${id}/canvas`} />}>
                  <GitBranch className="h-4 w-4" />
                  Open Story Canvas
                </ButtonUI>
                <ButtonUI
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Story
                </ButtonUI>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
