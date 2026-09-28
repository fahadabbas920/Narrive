"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { cn } from "@workspace/ui/lib/utils"

export interface SceneNodeData {
  title: string
  scene_type: "start" | "middle" | "ending"
  content: string
  choiceCount: number
}

const typeConfig = {
  start: {
    label: "Start",
    border: "border-primary/60",
    badge: "bg-primary/15 text-primary",
    handle: "bg-primary!",
  },
  ending: {
    label: "Ending",
    border: "border-rose-500/50",
    badge: "bg-rose-500/20 text-rose-400",
    handle: "bg-rose-500!",
  },
  middle: {
    label: "Scene",
    border: "border-border",
    badge: "bg-muted text-muted-foreground",
    handle: "bg-muted-foreground!",
  },
}

export const SceneNode = memo(function SceneNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SceneNodeData
  const config = typeConfig[nodeData.scene_type] ?? typeConfig.middle

  return (
    <div
      className={cn(
        "bg-card w-52 cursor-pointer rounded-lg border transition-colors",
        config.border,
        selected && "ring-primary ring-offset-background ring-2 ring-offset-1",
      )}
    >
      {nodeData.scene_type !== "start" && (
        <Handle
          type="target"
          position={Position.Top}
          className={cn("border-background! h-3! w-3! border-2!", config.handle)}
        />
      )}

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-foreground flex-1 truncate text-xs font-semibold">
            {nodeData.title || "Untitled Scene"}
          </p>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase",
              config.badge,
            )}
          >
            {config.label}
          </span>
        </div>

        {nodeData.content ? (
          <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">{nodeData.content}</p>
        ) : (
          <p className="text-muted-foreground text-xs italic">No content yet…</p>
        )}

        {nodeData.choiceCount > 0 && (
          <p className="text-muted-foreground font-mono text-[10px]">
            {nodeData.choiceCount} choice{nodeData.choiceCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {nodeData.scene_type !== "ending" && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={cn("border-background! h-3! w-3! border-2!", config.handle)}
        />
      )}
    </div>
  )
})
