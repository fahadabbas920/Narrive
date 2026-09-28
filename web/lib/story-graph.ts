import type { Choice, Scene } from "@/lib/api/stories"

export type SceneIssue = "dead-end" | "unreachable" | null

export interface GraphAnalysis {
  startId: string | null
  reachable: Set<string>
  /** Non-ending scenes with no way forward. */
  deadEnds: Set<string>
  issueFor: (sceneId: string) => SceneIssue
}

export function analyzeGraph(scenes: Scene[], choices: Choice[]): GraphAnalysis {
  const start = scenes.find((s) => s.scene_type === "start") ?? null
  const outgoing = new Map<string, string[]>()
  for (const c of choices) {
    outgoing.set(c.from_scene_id, [...(outgoing.get(c.from_scene_id) ?? []), c.to_scene_id])
  }

  const reachable = new Set<string>()
  if (start) {
    const stack = [start.id]
    while (stack.length) {
      const id = stack.pop() as string
      if (reachable.has(id)) continue
      reachable.add(id)
      stack.push(...(outgoing.get(id) ?? []))
    }
  }

  const deadEnds = new Set(
    scenes.filter((s) => s.scene_type !== "ending" && !outgoing.get(s.id)?.length).map((s) => s.id),
  )

  return {
    startId: start?.id ?? null,
    reachable,
    deadEnds,
    issueFor: (id) =>
      start && !reachable.has(id) ? "unreachable" : deadEnds.has(id) ? "dead-end" : null,
  }
}

const NODE_W = 224
const NODE_H = 150
const GAP_X = 64
const GAP_Y = 110

/**
 * Layered top-down layout: each scene sits on the row of its shortest path from the start;
 * rows are ordered by their parents' positions to reduce crossings. Unreachable scenes go last.
 */
export function tidyLayout(
  scenes: Scene[],
  choices: Choice[],
): Map<string, { x: number; y: number }> {
  const byId = new Map(scenes.map((s) => [s.id, s]))
  const children = new Map<string, string[]>()
  const parents = new Map<string, string[]>()
  for (const c of choices) {
    if (!byId.has(c.from_scene_id) || !byId.has(c.to_scene_id)) continue
    children.set(c.from_scene_id, [...(children.get(c.from_scene_id) ?? []), c.to_scene_id])
    parents.set(c.to_scene_id, [...(parents.get(c.to_scene_id) ?? []), c.from_scene_id])
  }

  const depth = new Map<string, number>()
  const roots = scenes.filter((s) => s.scene_type === "start")
  const queue = roots.map((s) => s.id)
  roots.forEach((s) => depth.set(s.id, 0))
  while (queue.length) {
    const id = queue.shift() as string
    for (const child of children.get(id) ?? []) {
      if (!depth.has(child)) {
        depth.set(child, (depth.get(id) ?? 0) + 1)
        queue.push(child)
      }
    }
  }

  // Leftovers (unreachable) get their own rows below, keeping their relative order.
  let maxDepth = Math.max(-1, ...depth.values())
  const leftovers = scenes
    .filter((s) => !depth.has(s.id))
    .sort((a, b) => a.position_y - b.position_y || a.position_x - b.position_x)
  const perRow = Math.max(3, Math.ceil(Math.sqrt(leftovers.length)))
  leftovers.forEach((s, i) => depth.set(s.id, maxDepth + 1 + Math.floor(i / perRow)))
  maxDepth = Math.max(-1, ...depth.values())

  const rows: string[][] = Array.from({ length: maxDepth + 1 }, () => [])
  scenes.forEach((s) => rows[depth.get(s.id) as number].push(s.id))

  const column = new Map<string, number>()
  rows.forEach((row, r) => {
    const score = (id: string) => {
      const ps = (parents.get(id) ?? []).filter(
        (p) => (depth.get(p) ?? Infinity) < r && column.has(p),
      )
      return ps.length
        ? ps.reduce((sum, p) => sum + (column.get(p) as number), 0) / ps.length
        : Infinity
    }
    row.sort((a, b) => score(a) - score(b) || byId.get(a)!.position_x - byId.get(b)!.position_x)
    row.forEach((id, i) => column.set(id, i - (row.length - 1) / 2))
  })

  const result = new Map<string, { x: number; y: number }>()
  for (const s of scenes) {
    result.set(s.id, {
      x: Math.round((column.get(s.id) as number) * (NODE_W + GAP_X)),
      y: Math.round((depth.get(s.id) as number) * (NODE_H + GAP_Y)),
    })
  }
  return result
}

export function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}
