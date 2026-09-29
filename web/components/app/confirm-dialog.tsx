"use client"

import { Loader2, Trash2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
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
  icon: Icon = Trash2,
  destructive = true,
}: {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
  icon?: LucideIcon
  /** false renders a calm primary-coloured confirm (for reversible actions). */
  destructive?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent showCloseButton={false} className="rounded-3xl p-7 sm:max-w-md">
        <div
          className={cn(
            "mb-1 flex h-12 w-12 items-center justify-center rounded-2xl",
            destructive ? "bg-destructive/10" : "bg-butter",
          )}
        >
          <Icon className={cn("h-6 w-6", destructive ? "text-destructive" : "text-butter-ink")} />
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
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60",
              destructive ? "bg-destructive text-white" : "bg-primary text-primary-foreground",
            )}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
