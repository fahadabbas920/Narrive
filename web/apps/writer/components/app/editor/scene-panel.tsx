"use client"

import { useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { Trash2 } from "lucide-react"
import { ButtonUI } from "@workspace/ui/components/button-ui"
import { useUpdateScene } from "@/hooks/use-story-editor"
import type { Scene } from "@/lib/api/stories"

const sceneSchema = z.object({
  title: z.string().min(1, "Scene name is required").max(100),
  content: z.string(),
  scene_type: z.enum(["start", "middle", "ending"]),
})
type SceneFormData = z.infer<typeof sceneSchema>

interface ScenePanelProps {
  storyId: string
  scene: Scene | null
  onClose: () => void
  onSetStart: (sceneId: string) => void
  onDelete: (sceneId: string) => void
}

export function ScenePanel({ storyId, scene, onClose, onSetStart, onDelete }: ScenePanelProps) {
  const { mutate: updateScene } = useUpdateScene(storyId)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty },
  } = useForm<SceneFormData>({
    resolver: zodResolver(sceneSchema),
    defaultValues: {
      title: "",
      content: "",
      scene_type: "middle",
    },
  })

  useEffect(() => {
    if (scene) {
      reset({
        title: scene.title,
        content: scene.content,
        scene_type: scene.scene_type,
      })
    }
  }, [scene, reset])

  // Auto-save on changes
  useEffect(() => {
    if (!scene || !isDirty) return
    const sub = watch((values) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        handleSubmit((data) => {
          updateScene({ sceneId: scene.id, payload: data })
        })()
      }, 800)
    })
    return () => {
      sub.unsubscribe()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [scene, watch, isDirty, handleSubmit, updateScene])

  return (
    <Sheet
      open={!!scene}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-border border-b px-4 py-4">
          <SheetTitle>Edit Scene</SheetTitle>
        </SheetHeader>

        {scene && (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Scene Name
              </Label>
              <Input
                className="h-auto py-2.5"
                placeholder="Enter the cave"
                {...register("title")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Type
              </Label>
              {scene.scene_type === "start" ? (
                <div className="border-border bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-emerald-500 uppercase">
                    Start
                  </span>
                  <span className="text-muted-foreground text-xs">
                    The story begins here. Set another scene as start to change this.
                  </span>
                </div>
              ) : (
                <select
                  className="border-input text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-auto w-full rounded-lg border bg-transparent px-2.5 py-2.5 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
                  {...register("scene_type")}
                >
                  <option value="middle">Middle</option>
                  <option value="ending">Ending</option>
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Scene Content
              </Label>
              <Textarea
                rows={12}
                placeholder="Write the scene content here…"
                className="resize-none"
                {...register("content")}
              />
            </div>

            {scene.scene_type !== "start" && (
              <ButtonUI
                variant="outline"
                size="sm"
                onClick={() => onSetStart(scene.id)}
                className="w-full"
              >
                Set as Start Scene
              </ButtonUI>
            )}

            <p className="text-muted-foreground text-right font-mono text-[10px]">Auto-saving…</p>

            <div className="border-border border-t pt-4">
              <ButtonUI
                variant="ghost"
                size="sm"
                onClick={() => {
                  const warning =
                    scene.scene_type === "start"
                      ? `Delete "${scene.title || "this scene"}"? This is the START scene — your story will have no starting point until you set a new one. Its choices will be removed too.`
                      : `Delete "${scene.title || "this scene"}"? Its choices will be removed too.`
                  if (confirm(warning)) onDelete(scene.id)
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
              >
                <Trash2 className="h-4 w-4" />
                Delete Scene
              </ButtonUI>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
