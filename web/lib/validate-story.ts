import type { StoryDetail } from "@/lib/api/stories"

export interface StoryIssue {
  level: "error" | "warning"
  message: string
}

/**
 * Structural checks on a story graph.
 * `error` issues block publishing; `warning` issues are advisory.
 */
export function validateStory(story: StoryDetail): StoryIssue[] {
  const issues: StoryIssue[] = []
  const { scenes, choices } = story

  if (scenes.length === 0) {
    issues.push({ level: "error", message: "Add at least one scene before publishing." })
    return issues
  }

  const starts = scenes.filter((s) => s.scene_type === "start")
  if (starts.length === 0) {
    issues.push({ level: "error", message: "No start scene is set." })
  } else if (starts.length > 1) {
    issues.push({
      level: "warning",
      message: `${starts.length} scenes are marked as the start — readers will only ever begin at one.`,
    })
  }

  // Reachability from the (first) start scene
  const start = starts[0]
  const reachable = new Set<string>()
  if (start) {
    const stack = [start.id]
    while (stack.length) {
      const id = stack.pop() as string
      if (reachable.has(id)) continue
      reachable.add(id)
      for (const c of choices) {
        if (c.from_scene_id === id && !reachable.has(c.to_scene_id)) stack.push(c.to_scene_id)
      }
    }
  }

  if (start) {
    const unreachable = scenes.filter((s) => !reachable.has(s.id))
    if (unreachable.length) {
      issues.push({
        level: "warning",
        message: `${unreachable.length} scene${unreachable.length > 1 ? "s" : ""} can't be reached from the start.`,
      })
    }

    const reachableEndings = scenes.filter((s) => s.scene_type === "ending" && reachable.has(s.id))
    if (reachableEndings.length === 0) {
      issues.push({
        level: "warning",
        message: "No ending is reachable from the start — readers can't finish the story.",
      })
    }
  }

  // Dead ends: non-ending scenes with no outgoing choices
  const deadEnds = scenes.filter(
    (s) => s.scene_type !== "ending" && !choices.some((c) => c.from_scene_id === s.id),
  )
  if (deadEnds.length) {
    issues.push({
      level: "warning",
      message: `${deadEnds.length} scene${deadEnds.length > 1 ? "s have" : " has"} no choices and ${deadEnds.length > 1 ? "aren't" : "isn't"} marked as an ending.`,
    })
  }

  return issues
}
