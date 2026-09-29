"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EyeOff, ExternalLink, FileUp, Globe, Loader2, PenLine, Plus, Sparkles } from "lucide-react"
import { useCreateOriginal, useOriginals, useUpdateAdminStory } from "@/hooks/use-admin"
import type { AdminStory } from "@/lib/api/admin"
import { showToast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import { AdminPage, EmptyState, Skeleton } from "@/components/admin/admin-ui"
import { StatTile } from "@/components/stats/stat-tile"
import { StoryTable } from "@/components/admin/story-table"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

function PublishToggle({ story }: { story: AdminStory }) {
  const update = useUpdateAdminStory()
  const live = story.status === "published"
  return (
    <button
      type="button"
      disabled={update.isPending}
      onClick={() =>
        update.mutate(
          { id: story.id, status: live ? "draft" : "published" },
          {
            onSuccess: () =>
              showToast.success(live ? `"${story.title}" unpublished` : `"${story.title}" is live`),
          },
        )
      }
      aria-label={`${live ? "Unpublish" : "Publish"} ${story.title}`}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60",
        live
          ? "border-border text-muted-foreground hover:text-foreground hover:bg-muted border"
          : "bg-mint text-mint-ink hover:opacity-90",
      )}
    >
      {update.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : live ? (
        <EyeOff className="h-3.5 w-3.5" />
      ) : (
        <Globe className="h-3.5 w-3.5" />
      )}
      {live ? "Unpublish" : "Publish"}
    </button>
  )
}

function NewOriginalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const create = useCreateOriginal()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    create.mutate(
      { title: title.trim(), description: description.trim() },
      { onSuccess: (story) => router.push(`/admin/originals/${story.id}/canvas`) },
    )
  }

  const field =
    "bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-primary/15 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus-visible:ring-4"

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl p-7 sm:max-w-md">
        <div className="bg-peach mb-1 flex h-12 w-12 items-center justify-center rounded-2xl">
          <Sparkles className="text-peach-ink h-6 w-6" />
        </div>
        <DialogTitle className="text-foreground text-xl font-extrabold tracking-tight">
          New Narrive Original
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          It starts as a draft credited to Narrive Originals. Genres, moods and the cover can be set
          in the story settings.
        </DialogDescription>
        <form onSubmit={submit} className="mt-2 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-foreground text-xs font-semibold">Title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="The Lantern Keeper"
              className={field}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-foreground text-xs font-semibold">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A lighthouse, a storm, and a stranger at the door."
              className={`${field} resize-none`}
            />
          </label>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-foreground hover:bg-muted cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || create.isPending}
              className="bg-primary text-primary-foreground flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4" />
              )}
              Create and open editor
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminOriginalsPage() {
  const { data: stories, isLoading } = useOriginals()
  const [creating, setCreating] = useState(false)
  const published = stories?.filter((s) => s.status === "published").length ?? 0
  const featured = stories?.filter((s) => s.is_featured).length ?? 0

  return (
    <AdminPage
      title="Narrive Originals"
      description="Stories published by Narrive itself. They're credited to Narrive Originals and edited in the normal story editor."
      actions={
        <>
          <Link
            href="/writers/narrive"
            target="_blank"
            className="border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Public page
          </Link>
          <Link
            href="/admin/import"
            className="border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          >
            <FileUp className="h-4 w-4" />
            Import stories
          </Link>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="bg-primary text-primary-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Original
          </button>
        </>
      }
    >
      {isLoading || !stories ? (
        <Skeleton className="h-80" />
      ) : stories.length === 0 ? (
        <div className="bg-card border-border rounded-3xl border">
          <EmptyState icon={Sparkles} title="No Originals yet">
            Write one in the editor with <strong>New Original</strong>, or bring in a batch with{" "}
            <Link href="/admin/import" className="text-primary font-semibold hover:underline">
              Import stories
            </Link>
            .
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3 sm:max-w-lg">
            <StatTile label="Originals" value={stories.length} />
            <StatTile label="Published" value={published} />
            <StatTile label="Featured" value={featured} />
          </div>
          <StoryTable
            stories={stories}
            showAuthor={false}
            hrefFor={(s) => `/admin/originals/${s.id}`}
            actions={(s) => (
              <span className="inline-flex items-center gap-2">
                <PublishToggle story={s} />
                <Link
                  href={`/admin/originals/${s.id}/canvas`}
                  className="bg-lavender text-lavender-ink inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold hover:opacity-90"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </span>
            )}
          />
        </>
      )}
      <NewOriginalDialog
        key={String(creating)}
        open={creating}
        onClose={() => setCreating(false)}
      />
    </AdminPage>
  )
}
