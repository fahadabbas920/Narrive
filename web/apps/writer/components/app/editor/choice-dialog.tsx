"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { ButtonUI } from "@workspace/ui/components/button-ui"
import { useUpdateChoice } from "@/hooks/use-story-editor"
import type { Choice, Scene } from "@/lib/api/stories"

interface ChoiceDialogProps {
  open: boolean
  onConfirm: (text: string) => void
  onCancel: () => void
  editingChoice: Choice | null
  onClose: () => void
  storyId: string
  scenes: Scene[]
}

const selectClass =
  "border-input text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-auto w-full rounded-lg border bg-transparent px-2.5 py-2.5 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"

export function ChoiceDialog({
  open,
  onConfirm,
  onCancel,
  editingChoice,
  onClose,
  storyId,
  scenes,
}: ChoiceDialogProps) {
  const [text, setText] = useState("")
  const [fromSceneId, setFromSceneId] = useState("")
  const [toSceneId, setToSceneId] = useState("")
  const { mutate: updateChoice, isPending } = useUpdateChoice(storyId)

  useEffect(() => {
    if (editingChoice) {
      setText(editingChoice.text)
      setFromSceneId(editingChoice.from_scene_id)
      setToSceneId(editingChoice.to_scene_id)
    } else if (open) {
      setText("")
      setFromSceneId("")
      setToSceneId("")
    }
  }, [editingChoice, open])

  const isEditing = !!editingChoice
  const isOpen = open || isEditing

  function handleConfirm() {
    const trimmed = text.trim()
    if (!trimmed) return
    if (isEditing) {
      const payload: { text: string; from_scene_id?: string; to_scene_id?: string } = {
        text: trimmed,
      }
      if (fromSceneId && fromSceneId !== editingChoice.from_scene_id) {
        payload.from_scene_id = fromSceneId
      }
      if (toSceneId && toSceneId !== editingChoice.to_scene_id) {
        payload.to_scene_id = toSceneId
      }
      updateChoice({ choiceId: editingChoice.id, payload })
      onClose()
    } else {
      onConfirm(trimmed)
    }
    setText("")
  }

  function handleCancel() {
    setText("")
    if (isEditing) onClose()
    else onCancel()
  }

  // A choice can't start and end at the same scene
  const sourceScenes = scenes.filter((s) => s.id !== toSceneId)
  const destinationScenes = scenes.filter((s) => s.id !== fromSceneId)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) handleCancel()
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Choice" : "New Choice"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Choice Text
            </Label>
            <Input
              autoFocus
              placeholder="Enter the cave…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm()
              }}
              className="h-auto py-2.5"
            />
          </div>

          {isEditing && (
            <>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                  Leads from
                </Label>
                <select
                  value={fromSceneId}
                  onChange={(e) => setFromSceneId(e.target.value)}
                  className={selectClass}
                >
                  {sourceScenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || "Untitled Scene"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                  Leads to scene
                </Label>
                <select
                  value={toSceneId}
                  onChange={(e) => setToSceneId(e.target.value)}
                  className={selectClass}
                >
                  {destinationScenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || "Untitled Scene"}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <ButtonUI variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </ButtonUI>
          <ButtonUI size="sm" onClick={handleConfirm} disabled={!text.trim() || isPending}>
            {isEditing ? "Save" : "Create Choice"}
          </ButtonUI>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
