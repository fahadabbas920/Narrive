"use client"

import { memo } from "react"
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react"
import { X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export interface ChoiceEdgeData {
  text: string
  onEdit: () => void
  onDelete: () => void
  curveOffset: number
}

export const ChoiceEdge = memo(function ChoiceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as unknown as ChoiceEdgeData
  const curveOffset = edgeData?.curveOffset ?? 0

  let edgePath: string
  let labelX: number
  let labelY: number

  if (curveOffset === 0) {
    // Lone edge — keep the clean orthogonal routing
    ;[edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })
  } else {
    // Sibling edge — bow into an arc, perpendicular to the straight line,
    // so reciprocal/parallel edges separate and each label sits on its own arc.
    const mx = (sourceX + targetX) / 2
    const my = (sourceY + targetY) / 2
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const cx = mx + nx * curveOffset
    const cy = my + ny * curveOffset
    edgePath = `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`
    // Quadratic bezier midpoint (t = 0.5)
    labelX = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX
    labelY = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "var(--primary)" : "var(--border)",
          strokeWidth: selected ? 2.5 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className={cn(
            "nodrag nopan group flex items-center gap-1",
            selected ? "z-30" : "z-10 hover:z-50",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              edgeData?.onEdit?.()
            }}
            className="bg-card border-border text-foreground hover:border-primary max-w-32 cursor-pointer truncate rounded-md border px-2 py-1 text-xs shadow-sm transition-colors"
          >
            {edgeData?.text || "choice"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              edgeData?.onDelete?.()
            }}
            title="Delete choice"
            className="bg-card border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border opacity-0 shadow-sm transition-all group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
})
