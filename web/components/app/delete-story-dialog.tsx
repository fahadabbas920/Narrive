"use client"

import { Loader2, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

export function DeleteStoryDialog({
  open,
  onOpenChange,
  title,
  sceneCount,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  sceneCount: number
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="rounded-3xl p-7 sm:max-w-md">
        <div className="bg-destructive/10 mb-1 flex h-12 w-12 items-center justify-center rounded-2xl">
          <Trash2 className="text-destructive h-6 w-6" />
        </div>
        <DialogTitle className="text-foreground text-xl font-extrabold tracking-tight">
          Delete “{title}”?
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
          This permanently removes the story
          {sceneCount > 0 && `, its ${sceneCount} scene${sceneCount === 1 ? "" : "s"}`} and every
          choice. Readers will lose access immediately. This can&apos;t be undone.
        </DialogDescription>
        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-foreground hover:bg-muted cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Keep story
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="bg-destructive flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete story
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
