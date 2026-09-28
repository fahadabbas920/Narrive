"use client"

import { Loader2, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent showCloseButton={false} className="rounded-3xl p-7 sm:max-w-md">
        <div className="bg-destructive/10 mb-1 flex h-12 w-12 items-center justify-center rounded-2xl">
          <Trash2 className="text-destructive h-6 w-6" />
        </div>
        <DialogTitle className="text-foreground text-xl font-extrabold tracking-tight">
          {title}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </DialogDescription>
        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-foreground hover:bg-muted cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            autoFocus
            className="bg-destructive flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
