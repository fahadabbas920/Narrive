"use client"

import { useState } from "react"
import { ArrowDown, Loader2, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useCreateChoice, useDeleteChoice, useUpdateChoice } from "@/hooks/use-story-editor"
import type { Choice, Scene } from "@/lib/api/stories"
import { cn } from "@/lib/utils"
import { SCENE_TYPES } from "./scene-node"

const MAX_TEXT = 500

/** What the dialog is doing: editing a choice, or creating one with optional preset ends. */
export type ChoiceDraft =
  | { kind: "edit"; choice: Choice }
  | { kind: "create"; fromId: string; toId?: string }

interface ChoiceDialogProps {
  draft: ChoiceDraft | null
  onClose: () => void
  storyId: string
  scenes: Scene[]
}

export function ChoiceDialog({ draft, onClose, storyId, scenes }: ChoiceDialogProps) {
  const key = draft
    ? draft.kind === "edit"
      ? draft.choice.id
      : `${draft.fromId}:${draft.toId ?? ""}`
    : "closed"
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="rounded-3xl p-0 sm:max-w-md">
        {draft && (
          <ChoiceForm key={key} draft={draft} onClose={onClose} storyId={storyId} scenes={scenes} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ChoiceForm({
  draft,
  onClose,
  storyId,
  scenes,
}: Required<Pick<ChoiceDialogProps, "onClose" | "storyId" | "scenes">> & { draft: ChoiceDraft }) {
  const editing = draft.kind === "edit" ? draft.choice : null
  const [text, setText] = useState(editing?.text ?? "")
  const [fromId, setFromId] = useState(
    editing?.from_scene_id ?? (draft.kind === "create" ? draft.fromId : ""),
  )
  const [toId, setToId] = useState(
    editing?.to_scene_id ??
      (draft.kind === "create" ? (draft.toId ?? firstTarget(scenes, draft.fromId)) : ""),
  )
  const create = useCreateChoice(storyId)
  const update = useUpdateChoice(storyId)
  const remove = useDeleteChoice(storyId)
  const pending = create.isPending || update.isPending || remove.isPending

  const fromLocked = draft.kind === "create"
  const toLocked = draft.kind === "create" && !!draft.toId
  const trimmed = text.trim()
  const canSave = !!trimmed && trimmed.length <= MAX_TEXT && !!fromId && !!toId && fromId !== toId

  function save() {
    if (!canSave || pending) return
    if (editing) {
      update.mutate(
        {
          choiceId: editing.id,
          payload: {
            text: trimmed,
            ...(fromId !== editing.from_scene_id && { from_scene_id: fromId }),
            ...(toId !== editing.to_scene_id && { to_scene_id: toId }),
          },
        },
        { onSuccess: onClose },
      )
    } else {
      create.mutate(
        { from_scene_id: fromId, to_scene_id: toId, text: trimmed },
        { onSuccess: onClose },
      )
    }
  }

  // Keep the current value selectable even if it no longer fits the rule (e.g. legacy links to start).
  const sources = scenes.filter(
    (s) => (s.scene_type !== "ending" || s.id === fromId) && s.id !== toId,
  )
  const targets = scenes.filter(
    (s) => (s.scene_type !== "start" || s.id === toId) && s.id !== fromId,
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="p-7"
    >
      <DialogTitle className="text-foreground text-xl font-extrabold tracking-tight">
        {editing ? "Edit choice" : "New choice"}
      </DialogTitle>
      <DialogDescription className="text-muted-foreground mt-1 text-sm">
        The words readers tap to move from one scene to the next.
      </DialogDescription>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="choice-text" className="text-foreground text-sm font-semibold">
            Choice text
          </label>
          <span
            className={cn(
              "text-xs tabular-nums",
              trimmed.length > MAX_TEXT ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {trimmed.length}/{MAX_TEXT}
          </span>
        </div>
        <input
          id="choice-text"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Open the creaking door…"
          className="bg-muted text-foreground placeholder:text-muted-foreground/80 focus:bg-card focus:border-ring focus:ring-ring/40 h-12 w-full rounded-2xl border border-transparent px-4 text-sm transition-all outline-none focus:ring-4"
        />
      </div>

      <div className="bg-background border-border mt-5 rounded-2xl border p-3">
        <ScenePicker
          label="From"
          value={fromId}
          onChange={setFromId}
          options={sources}
          locked={fromLocked}
          scenes={scenes}
        />
        <div className="text-muted-foreground flex justify-center py-1">
          <ArrowDown className="h-4 w-4" />
        </div>
        <ScenePicker
          label="To"
          value={toId}
          onChange={setToId}
          options={targets}
          locked={toLocked}
          scenes={scenes}
        />
      </div>
      {targets.length === 0 && (
        <p className="text-muted-foreground mt-2 text-xs">
          Add another scene first — a choice needs somewhere to go.
        </p>
      )}

      <div className="mt-6 flex items-center gap-2">
        {editing && (
          <button
            type="button"
            onClick={() => remove.mutate(editing.id, { onSuccess: onClose })}
            disabled={pending}
            className="text-destructive hover:bg-destructive/10 mr-auto flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "text-foreground hover:bg-muted cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
            !editing && "ml-auto",
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSave || pending}
          className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Save choice" : "Create choice"}
        </button>
      </div>
    </form>
  )
}

function firstTarget(scenes: Scene[], fromId: string) {
  return scenes.find((s) => s.id !== fromId && s.scene_type !== "start")?.id ?? ""
}

function ScenePicker({
  label,
  value,
  onChange,
  options,
  locked,
  scenes,
}: {
  label: string
  value: string
  onChange: (id: string) => void
  options: Scene[]
  locked: boolean
  scenes: Scene[]
}) {
  const scene = scenes.find((s) => s.id === value)
  const type = SCENE_TYPES[scene?.scene_type ?? "middle"]
  const Icon = type.icon
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-10 shrink-0 text-xs font-bold uppercase">
        {label}
      </span>
      <span
        className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", type.pill)}
      >
        <Icon className="h-4 w-4" />
      </span>
      {locked ? (
        <span className="text-foreground truncate text-sm font-semibold">
          {scene?.title || "Untitled scene"}
        </span>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} scene`}
          className="bg-card border-border text-foreground focus:border-ring focus:ring-ring/40 h-10 min-w-0 flex-1 cursor-pointer rounded-xl border px-3 text-sm font-semibold outline-none focus:ring-4"
        >
          {!value && <option value="">Choose a scene…</option>}
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title || "Untitled scene"}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
