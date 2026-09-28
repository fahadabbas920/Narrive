/** Where a reader is in a story, kept on this device so they can pick up where they left off. */
export interface ReadingProgress {
  sceneId: string
  history: string[]
  /** Ending scene ids this reader has reached, across all playthroughs. */
  endings: string[]
}

const key = (storyId: string) => `narrive:progress:${storyId}`

export function loadProgress(storyId: string): ReadingProgress | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key(storyId))
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<ReadingProgress>
    if (typeof p.sceneId !== "string") return null
    return {
      sceneId: p.sceneId,
      history: Array.isArray(p.history) ? p.history.filter((x) => typeof x === "string") : [],
      endings: Array.isArray(p.endings) ? p.endings.filter((x) => typeof x === "string") : [],
    }
  } catch {
    return null
  }
}

export function saveProgress(storyId: string, progress: ReadingProgress) {
  try {
    localStorage.setItem(key(storyId), JSON.stringify(progress))
  } catch {
    // Storage unavailable (private mode, quota) — reading still works, it just won't resume.
  }
}
