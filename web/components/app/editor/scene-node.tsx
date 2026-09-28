"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { AlertTriangle, BookOpen, EyeOff, Flag, Play, Split } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SceneIssue } from "@/lib/story-graph"

export interface SceneNodeData {
  title: string
  scene_type: "start" | "middle" | "ending"
  content: string
  choiceCount: number
  words: number
  issue: SceneIssue
}

export const SCENE_TYPES = {
  start: {
    label: "Start",
    icon: Play,
    pill: "bg-mint text-mint-ink",
    border: "border-mint-ink/35",
    handle: "bg-mint-ink!",
    bar: "bg-mint-ink/70",
  },
  middle: {
    label: "Scene",
    icon: BookOpen,
    pill: "bg-lavender text-lavender-ink",
    border: "border-border",
    handle: "bg-lavender-ink!",
    bar: "bg-lavender-ink/50",
  },
  ending: {
    label: "Ending",
    icon: Flag,
    pill: "bg-blush text-blush-ink",
    border: "border-blush-ink/35",
    handle: "bg-blush-ink!",
    bar: "bg-blush-ink/70",
  },
} as const

const ISSUES = {
  "dead-end": {
    label: "No way forward",
    icon: AlertTriangle,
    className: "bg-butter text-butter-ink",
  },
  unreachable: { label: "Unreachable", icon: EyeOff, className: "bg-muted text-muted-foreground" },
} as const

export const SceneNode = memo(function SceneNode({ data, selected }: NodeProps) {
  const d = data as unknown as SceneNodeData
  const type = SCENE_TYPES[d.scene_type] ?? SCENE_TYPES.middle
  const issue = d.issue ? ISSUES[d.issue] : null
  const Icon = type.icon

  return (
    <div
      className={cn(
        "group bg-card relative w-56 cursor-pointer rounded-2xl border shadow-sm transition-all duration-150 hover:shadow-md",
        type.border,
        d.issue === "unreachable" && "opacity-70",
        selected && "ring-primary ring-offset-background shadow-lg ring-2 ring-offset-2",
      )}
    >
      {/* Accent bar, clipped to the card's rounded corners */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <div className={cn("h-1 w-full", type.bar)} />
      </div>

      {d.scene_type !== "start" && (
        <Handle
          type="target"
          position={Position.Top}
          className={cn(
            "border-card! h-3.5! w-3.5! border-[3px]! transition-transform group-hover:scale-125",
            type.handle,
          )}
        />
      )}

      <div className="space-y-2 px-3.5 pt-4 pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
              type.pill,
            )}
          >
            <Icon className="h-3 w-3" />
            {type.label}
          </span>
          {issue && (
            <span
              title={issue.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                issue.className,
              )}
            >
              <issue.icon className="h-3 w-3" />
              {issue.label}
            </span>
          )}
        </div>

        <p className="text-foreground truncate text-sm leading-snug font-bold">
          {d.title || "Untitled scene"}
        </p>

        {d.content ? (
          <p className="text-muted-foreground line-clamp-3 font-serif text-xs leading-relaxed">
            {d.content}
          </p>
        ) : (
          <p className="text-muted-foreground/70 text-xs italic">Nothing written yet…</p>
        )}

        <div className="text-muted-foreground flex items-center gap-3 pt-0.5 text-[11px] font-medium">
          <span>
            {d.words} word{d.words === 1 ? "" : "s"}
          </span>
          {d.scene_type !== "ending" && (
            <span className="flex items-center gap-1">
              <Split className="h-3 w-3" />
              {d.choiceCount} choice{d.choiceCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {d.scene_type !== "ending" && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={cn(
            "border-card! h-3.5! w-3.5! border-[3px]! transition-transform group-hover:scale-125",
            type.handle,
          )}
        />
      )}
    </div>
  )
})
