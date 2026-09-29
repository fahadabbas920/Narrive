"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  EyeOff,
  Globe,
  Library,
  Loader2,
  PenLine,
  Star,
  StarOff,
  Trash2,
  Undo2,
} from "lucide-react"
import {
  useAdminStory,
  useDeleteAdminStory,
  useUpdateAdminStory,
  errorText,
} from "@/hooks/use-admin"
import { adminApi, type AdminStoryDetail } from "@/lib/api/admin"
import type { StoryStatus } from "@/lib/api/stories"
import { useRatingLabel } from "@/hooks/use-taxonomy"
import {
  AdminPage,
  EmptyState,
  FeaturedBadge,
  OriginalBadge,
  Panel,
  Skeleton,
  StatusBadge,
  formatDate,
} from "@/components/admin/admin-ui"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { ReadingStatsPanel } from "@/components/stats/reading-stats-panel"
import { showToast } from "@/lib/toast"
import { wordCount } from "@/lib/story-graph"
import { cn } from "@/lib/utils"

const actionBtn =
  "border-border text-foreground hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50"

// Same colours as the editor's scene pills (kept local so this page doesn't load React Flow).
const SCENE_PILL = {
  start: { label: "Start", pill: "bg-mint text-mint-ink" },
  middle: { label: "Scene", pill: "bg-lavender text-lavender-ink" },
  ending: { label: "Ending", pill: "bg-blush text-blush-ink" },
} as const

type StatusChange = { to: StoryStatus; title: string; body: string; label: string }

function statusChanges(story: AdminStoryDetail): StatusChange[] {
  const out: StatusChange[] = []
  if (story.status === "published") {
    out.push({
      to: "draft",
      title: "Unpublish this story?",
      body: "It leaves the catalogue and goes back to being a draft. Readers mid-way through lose access. The writer can publish it again.",
      label: "Unpublish",
    })
  }
  if (story.status !== "archived") {
    out.push({
      to: "archived",
      title: "Archive this story?",
      body: "It's hidden from the catalogue and from new readers, but nothing is deleted.",
      label: "Archive",
    })
  }
  if (story.status === "archived") {
    out.push({
      to: "draft",
      title: "Restore to draft?",
      body: "It becomes a draft again. It won't be public until it's published.",
      label: "Restore to draft",
    })
  }
  if (story.is_official && story.status !== "published") {
    out.push({
      to: "published",
      title: "Publish this Original?",
      body: "It appears in the catalogue straight away, credited to Narrive Originals.",
      label: "Publish",
    })
  }
  return out
}

function ExportButton({ story }: { story: AdminStoryDetail }) {
  const [busy, setBusy] = useState(false)
  async function download() {
    setBusy(true)
    try {
      const body = await adminApi.exportStory(story.id)
      const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${
        story.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "story"
      }.narrive.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      showToast.error(errorText(e, "Couldn't export the story"))
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" onClick={download} disabled={busy} className={actionBtn}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export as JSON
    </button>
  )
}

function FeaturePanel({ story }: { story: AdminStoryDetail }) {
  const update = useUpdateAdminStory()
  const [rank, setRank] = useState(story.featured_rank?.toString() ?? "")
  const canFeature = story.status === "published"

  function saveRank() {
    const value = rank.trim() === "" ? null : Math.max(1, Math.round(Number(rank)))
    if (value !== null && !Number.isFinite(value)) return
    if (value === story.featured_rank) return
    update.mutate(
      { id: story.id, featured_rank: value },
      { onSuccess: () => showToast.success("Featured position saved") },
    )
  }

  return (
    <Panel title="Featured" description="Featured stories get a row at the top of the catalogue.">
      {!canFeature ? (
        <p className="text-muted-foreground text-sm">Only published stories can be featured.</p>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { id: story.id, is_featured: !story.is_featured },
                {
                  onSuccess: () =>
                    showToast.success(
                      story.is_featured ? "Removed from Featured" : "Added to Featured",
                    ),
                },
              )
            }
            className={cn(
              actionBtn,
              !story.is_featured && "bg-sky text-sky-ink border-transparent hover:opacity-90",
            )}
          >
            {story.is_featured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
            {story.is_featured ? "Remove from Featured" : "Feature this story"}
          </button>
          {story.is_featured && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Position</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                onBlur={saveRank}
                onKeyDown={(e) => e.key === "Enter" && saveRank()}
                placeholder="Auto"
                className="bg-card border-border focus-visible:ring-primary/15 h-9 w-20 rounded-xl border px-3 text-sm outline-none focus-visible:ring-4"
              />
              <span className="text-muted-foreground text-xs">1 shows first; empty goes last</span>
            </label>
          )}
        </div>
      )}
    </Panel>
  )
}

export default function AdminStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: story, isLoading } = useAdminStory(id)
  const update = useUpdateAdminStory()
  const remove = useDeleteAdminStory()
  const ratingLabel = useRatingLabel()
  const [change, setChange] = useState<StatusChange | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const back = (
    <Link
      href={story?.is_official ? "/admin/originals" : "/admin/stories"}
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm font-semibold"
    >
      <ArrowLeft className="h-4 w-4" />
      {story?.is_official ? "Narrive Originals" : "All stories"}
    </Link>
  )

  if (isLoading) {
    return (
      <AdminPage title="Story">
        <Skeleton className="h-64" />
      </AdminPage>
    )
  }
  if (!story) {
    return (
      <AdminPage title="Story">
        {back}
        <EmptyState icon={Library} title="Story not found">
          It may have been deleted.
        </EmptyState>
      </AdminPage>
    )
  }

  const errors = story.issues.filter((i) => i.level === "error")
  const outgoing = new Map<string, number>()
  story.choices.forEach((c) =>
    outgoing.set(c.from_scene_id, (outgoing.get(c.from_scene_id) ?? 0) + 1),
  )
  const scenes = [...story.scenes].sort(
    (a, b) =>
      Number(b.scene_type === "start") - Number(a.scene_type === "start") ||
      a.position_y - b.position_y ||
      a.position_x - b.position_x,
  )

  return (
    <AdminPage
      title={story.title}
      description={
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={story.status} />
          {story.is_official && <OriginalBadge />}
          {story.is_featured && <FeaturedBadge rank={story.featured_rank} />}
          <span className="ml-1">
            by{" "}
            {story.is_official ? (
              "Narrive Originals"
            ) : (
              <Link
                href={`/admin/users/${story.author_id}`}
                className="text-primary font-semibold hover:underline"
              >
                {story.author_name ?? "Unknown"}
              </Link>
            )}
          </span>
        </span>
      }
    >
      {back}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <p className="text-foreground text-sm leading-relaxed">
              {story.description || <span className="text-muted-foreground">No description.</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {story.genres.map((g) => (
                <span
                  key={g}
                  className="bg-lavender text-lavender-ink rounded-full px-2.5 py-0.5 text-xs font-semibold"
                >
                  {g}
                </span>
              ))}
              {story.moods.map((m) => (
                <span
                  key={m}
                  className="bg-sky text-sky-ink rounded-full px-2.5 py-0.5 text-xs font-semibold"
                >
                  {m}
                </span>
              ))}
              {story.content_rating && (
                <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                  {ratingLabel(story.content_rating)}
                </span>
              )}
            </div>
            <dl className="border-border mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 text-sm sm:grid-cols-4">
              {[
                ["Scenes", story.scene_count.toLocaleString()],
                ["Choices", story.choice_count.toLocaleString()],
                ["Words", story.words.toLocaleString()],
                [
                  "Endings",
                  story.scenes.filter((s) => s.scene_type === "ending").length.toString(),
                ],
                ["Created", formatDate(story.created_at)],
                ["Updated", formatDate(story.updated_at)],
                ["First published", formatDate(story.published_at)],
                ["Source", story.import_id ? "Bulk import" : "Editor"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground text-xs">{k}</dt>
                  <dd className="text-foreground font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title="Structure check"
            description="The same checks writers see before publishing."
          >
            {story.issues.length === 0 ? (
              <p className="text-mint-ink flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                No problems: one start, reachable endings, no dead ends.
              </p>
            ) : (
              <ul className="space-y-2">
                {story.issues.map((i) => (
                  <li key={i.message} className="flex items-start gap-2 text-sm">
                    <AlertTriangle
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        i.level === "error" ? "text-destructive" : "text-butter-ink",
                      )}
                    />
                    <span>
                      <span className="font-semibold">
                        {i.level === "error" ? "Error" : "Warning"}:
                      </span>{" "}
                      {i.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div>
            <h2 className="text-foreground mb-3 text-sm font-bold">Readers</h2>
            <ReadingStatsPanel scope={{ scope: "story", id: story.id }} />
          </div>

          <Panel title="Scenes" description="Read-only outline, start first.">
            {scenes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No scenes.</p>
            ) : (
              <ol className="divide-border -my-2 divide-y">
                {scenes.map((s) => {
                  const t = SCENE_PILL[s.scene_type]
                  const exits = outgoing.get(s.id) ?? 0
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          t.pill,
                        )}
                      >
                        {t.label}
                      </span>
                      <span className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold">
                        {s.title}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {wordCount(s.content)} words · {exits} choice{exits === 1 ? "" : "s"}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Actions" description="Every change is recorded in the audit log.">
            <div className="flex flex-col gap-2">
              {story.is_official && (
                <Link
                  href={`/admin/originals/${story.id}/canvas`}
                  className="bg-lavender text-lavender-ink flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                >
                  <PenLine className="h-4 w-4" />
                  Open in editor
                </Link>
              )}
              {story.status === "published" && (
                <Link href={`/story/${story.id}`} target="_blank" className={actionBtn}>
                  <ExternalLink className="h-4 w-4" />
                  View as reader
                </Link>
              )}
              {statusChanges(story).map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setChange(c)}
                  disabled={c.to === "published" && errors.length > 0}
                  title={c.to === "published" && errors.length ? "Fix the errors first" : undefined}
                  className={cn(
                    actionBtn,
                    c.to === "published" &&
                      "bg-mint text-mint-ink border-transparent hover:opacity-90",
                  )}
                >
                  {c.to === "published" ? (
                    <Globe className="h-4 w-4" />
                  ) : c.to === "archived" ? (
                    <Archive className="h-4 w-4" />
                  ) : story.status === "archived" ? (
                    <Undo2 className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  {c.label}
                </button>
              ))}
              <ExportButton story={story} />
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete story
              </button>
            </div>
          </Panel>
          <FeaturePanel key={`${story.is_featured}-${story.featured_rank}`} story={story} />
        </div>
      </div>

      {change && (
        <ConfirmDialog
          open
          title={change.title}
          description={change.body}
          confirmLabel={change.label}
          icon={change.to === "published" ? Globe : change.to === "archived" ? Archive : EyeOff}
          destructive={change.to !== "published" && story.status === "published"}
          pending={update.isPending}
          onCancel={() => setChange(null)}
          onConfirm={() =>
            update.mutate(
              { id: story.id, status: change.to },
              {
                onSuccess: () => showToast.success(`${change.label} done`),
                onSettled: () => setChange(null),
              },
            )
          }
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this story for good?"
        description={
          <>
            <strong className="text-foreground">{story.title}</strong> and its {story.scene_count}{" "}
            scenes will be permanently deleted. This can&apos;t be undone.
            {!story.is_official && " Consider unpublishing or archiving instead."}
          </>
        }
        confirmLabel="Delete story"
        pending={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(story.id, {
            onSuccess: () =>
              router.replace(story.is_official ? "/admin/originals" : "/admin/stories"),
            onSettled: () => setConfirmDelete(false),
          })
        }
      />
    </AdminPage>
  )
}
