"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  Check,
  CornerDownRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useUpdateScene } from "@/hooks/use-story-editor"
import type { Choice, Scene } from "@/lib/api/stories"
import { wordCount } from "@/lib/story-graph"
import { cn } from "@/lib/utils"
import { SCENE_TYPES } from "./scene-node"

type SceneType = Scene["scene_type"]

interface ScenePanelProps {
  storyId: string
  scene: Scene | null
  scenes: Scene[]
  choices: Choice[]
  onClose: () => void
  onSetStart: (sceneId: string) => void
  onChangeType: (sceneId: string, type: Exclude<SceneType, "start">) => void
  onRequestDelete: (scene: Scene) => void
  onAddChoice: (fromId: string) => void
  onEditChoice: (choice: Choice) => void
  onSelectScene: (sceneId: string) => void
}

export function ScenePanel(props: ScenePanelProps) {
  const { scene, onClose } = props
  return (
    <Sheet
      open={!!scene}
      onOpenChange={(open) => !open && onClose()}
      modal={false}
      disablePointerDismissal
    >
      <SheetContent
        side="right"
        showOverlay={false}
        className="bg-card border-border w-full gap-0 border-l p-0 shadow-2xl sm:max-w-md"
      >
        {scene && <SceneEditor key={scene.id} {...props} scene={scene} />}
      </SheetContent>
    </Sheet>
  )
}

type SaveStatus = "saved" | "pending" | "saving" | "error"

function SceneEditor({
  storyId,
  scene,
  scenes,
  choices,
  onSetStart,
  onChangeType,
  onRequestDelete,
  onAddChoice,
  onEditChoice,
  onSelectScene,
}: ScenePanelProps & { scene: Scene }) {
  const { mutate: updateScene } = useUpdateScene(storyId)
  const [title, setTitle] = useState(scene.title)
  const [content, setContent] = useState(scene.content)
  const [status, setStatus] = useState<SaveStatus>("saved")
  const pending = useRef<{ title?: string; content?: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const payload = pending.current
    if (!payload) return
    pending.current = null
    setStatus("saving")
    updateScene(
      { sceneId: scene.id, payload },
      {
        onSuccess: () => setStatus(pending.current ? "pending" : "saved"),
        onError: () => setStatus("error"),
      },
    )
  }, [scene.id, updateScene])

  function queue(patch: { title?: string; content?: string }) {
    pending.current = { ...pending.current, ...patch }
    setStatus("pending")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 700)
  }

  // Never drop an edit: save whatever is pending when the panel closes or switches scene.
  useEffect(() => () => flush(), [flush])

  const type = SCENE_TYPES[scene.scene_type]
  const words = wordCount(content)
  const minutes = Math.max(1, Math.round(words / 200))
  const outgoing = choices
    .filter((c) => c.from_scene_id === scene.id)
    .sort((a, b) => a.display_order - b.display_order)
  const incoming = choices.filter((c) => c.to_scene_id === scene.id)
  const sceneById = new Map(scenes.map((s) => [s.id, s]))
  const isStart = scene.scene_type === "start"

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border border-b px-6 pt-5 pb-4">
        <div className="flex items-center gap-2 pr-10">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
              type.pill,
            )}
          >
            <type.icon className="h-3.5 w-3.5" />
            {type.label}
          </span>
          <SaveIndicator status={status} onRetry={flush} />
        </div>
        <SheetTitle className="sr-only">Edit scene</SheetTitle>
        <input
          value={title}
          maxLength={200}
          onChange={(e) => {
            setTitle(e.target.value)
            queue({ title: e.target.value })
          }}
          onBlur={flush}
          placeholder="Untitled scene"
          aria-label="Scene title"
          className="text-foreground placeholder:text-muted-foreground/60 mt-3 w-full bg-transparent text-2xl font-extrabold tracking-tight outline-none"
        />
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
        {/* Type */}
        <section>
          <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">
            Scene type
          </p>
          <div
            className="bg-muted grid grid-cols-3 gap-1 rounded-2xl p-1"
            role="radiogroup"
            aria-label="Scene type"
          >
            {(["start", "middle", "ending"] as const).map((t) => {
              const cfg = SCENE_TYPES[t]
              const active = scene.scene_type === t
              const endingBlocked = t === "ending" && outgoing.length > 0
              const disabled = !active && ((isStart && t !== "start") || endingBlocked)
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  title={
                    isStart && t !== "start"
                      ? "Make another scene the start first"
                      : endingBlocked
                        ? "Remove this scene's choices to make it an ending"
                        : undefined
                  }
                  onClick={() => {
                    if (active) return
                    if (t === "start") onSetStart(scene.id)
                    else onChangeType(scene.id, t)
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40",
                    active
                      ? cn("bg-card shadow-sm", cfg.pill.split(" ")[1])
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <cfg.icon className="h-4 w-4" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {isStart
              ? "Every reader begins here. To move the start, open another scene and choose Start."
              : scene.scene_type === "ending"
                ? "Readers see “The End” here and can restart the story."
                : "A step along the way — give readers at least one choice to continue."}
          </p>
        </section>

        {/* Content */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <label
              htmlFor="scene-content"
              className="text-muted-foreground text-xs font-bold tracking-wide uppercase"
            >
              Scene
            </label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {words} word{words === 1 ? "" : "s"}
              {words > 0 && ` · ${minutes} min read`}
            </span>
          </div>
          <textarea
            id="scene-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              queue({ content: e.target.value })
            }}
            onBlur={flush}
            placeholder="The corridor narrows. Somewhere ahead, a door clicks shut…"
            className="bg-background border-border text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:ring-ring/40 field-sizing-content min-h-64 w-full resize-none rounded-2xl border px-4 py-3.5 font-serif text-[15px] leading-[1.8] transition-all outline-none focus:ring-4"
          />
          <p className="text-muted-foreground mt-1.5 text-xs">
            Blank lines start a new paragraph for readers.
          </p>
        </section>

        {/* Choices */}
        {scene.scene_type !== "ending" && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                Choices <span className="font-normal normal-case">· where readers can go next</span>
              </p>
            </div>
            {outgoing.length === 0 ? (
              <div className="bg-butter/50 text-butter-ink flex items-start gap-2 rounded-2xl p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                No choices yet — readers will be stuck here.
              </div>
            ) : (
              <ul className="space-y-2">
                {outgoing.map((c) => {
                  const target = sceneById.get(c.to_scene_id)
                  const tt = SCENE_TYPES[target?.scene_type ?? "middle"]
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onEditChoice(c)}
                        className="bg-background border-border hover:border-lavender-ink/30 group flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3 text-left transition-colors"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground block text-sm font-semibold">
                            “{c.text}”
                          </span>
                          <span className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                            <ArrowRight className="h-3 w-3" />
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-px text-[10px] font-bold",
                                tt.pill,
                              )}
                            >
                              {tt.label}
                            </span>
                            <span className="truncate">{target?.title || "Untitled scene"}</span>
                          </span>
                        </span>
                        <Pencil className="text-muted-foreground mt-0.5 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={() => onAddChoice(scene.id)}
              className="text-primary hover:bg-lavender/50 mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add choice
            </button>
          </section>
        )}

        {/* Incoming */}
        {!isStart && (
          <section>
            <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">
              Reached from
            </p>
            {incoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nothing leads here yet. Draw a choice from another scene to connect it.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {incoming.map((c) => {
                  const from = sceneById.get(c.from_scene_id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectScene(c.from_scene_id)}
                      className="bg-muted text-foreground hover:bg-lavender inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                    >
                      <CornerDownRight className="h-3 w-3 shrink-0" />
                      <span className="truncate">{from?.title || "Untitled scene"}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="border-border flex items-center justify-between border-t px-6 py-3">
        <button
          type="button"
          onClick={() => {
            flush()
            onRequestDelete(scene)
          }}
          className="text-destructive hover:bg-destructive/10 flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete scene
        </button>
        <span className="text-muted-foreground text-xs">Changes save automatically</span>
      </div>
    </div>
  )
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "error")
    return (
      <button
        type="button"
        onClick={onRetry}
        className="text-destructive flex cursor-pointer items-center gap-1 text-xs font-semibold hover:underline"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        Couldn&apos;t save — retry
      </button>
    )
  if (status === "saved")
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
        <Check className="text-mint-ink h-3.5 w-3.5" />
        Saved
      </span>
    )
  return (
    <span
      className="text-muted-foreground flex items-center gap-1 text-xs font-medium"
      aria-live="polite"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {status === "saving" ? "Saving…" : "Editing…"}
    </span>
  )
}
