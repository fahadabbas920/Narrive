import { client } from "."
import type { PublicStory } from "./public"

export type ReadingStatus = "in_progress" | "reading_again" | "finished" | "all_endings"

export interface Progress {
  story_id: string
  status: ReadingStatus
  current_scene_id: string | null
  history: string[]
  scenes_seen: number
  scenes_total: number
  endings_found: string[]
  endings_total: number
  runs_finished: number
  started_at: string
  last_read_at: string
  first_finished_at: string | null
}

export interface ProgressUpdate {
  scene_id: string
  history: string[]
}

/** Your status on one story. `status: null` means saved but never opened. */
export interface LibraryEntry {
  status: ReadingStatus | null
  endings_found: number
  endings_total: number
  saved: boolean
  last_read_at: string | null
}

export interface ReadingListItem {
  story: PublicStory
  entry: LibraryEntry
  saved_at: string | null
}

export interface NamedCount {
  id: string | null
  name: string
  count: number
}

/** One shape for every scope: a reader, a story, or the whole platform. */
export interface ReadingStats {
  scope: "user" | "story" | "platform"
  readers: number
  started: number
  in_progress: number
  finished: number
  completed_all_endings: number
  saved: number
  completion_rate: number | null
  endings_found: number
  endings_total: number | null
  scenes_read: number
  words_read: number | null
  last_read_at: string | null
  activity: { date: string; started: number; finished: number }[]
  top_genres: NamedCount[]
  top_stories: NamedCount[]
  ending_breakdown: NamedCount[]
}

export type StatsScope =
  | { scope: "me" }
  | { scope: "user"; id: string }
  | { scope: "story"; id: string }
  | { scope: "platform" }

const statsUrl = (s: StatsScope) =>
  s.scope === "me"
    ? "/api/v1/me/reading/stats"
    : s.scope === "user"
      ? `/api/v1/admin/users/${s.id}/reading-stats`
      : s.scope === "story"
        ? `/api/v1/admin/stories/${s.id}/reading-stats`
        : "/api/v1/admin/reading-stats"

export const readingApi = {
  progress: (storyId: string) => client.get<Progress>(`/api/v1/me/reading/${storyId}`),
  saveProgress: (storyId: string, body: ProgressUpdate) =>
    client.put<Progress>(`/api/v1/me/reading/${storyId}`, body),
  list: (status?: "reading" | "finished") =>
    client.get<ReadingListItem[]>(`/api/v1/me/reading${status ? `?status=${status}` : ""}`),
  saved: () => client.get<ReadingListItem[]>("/api/v1/me/saved"),
  save: (storyId: string) => client.put<void>(`/api/v1/me/saved/${storyId}`, {}),
  unsave: (storyId: string) => client.delete<void>(`/api/v1/me/saved/${storyId}`),
  library: () => client.get<Record<string, LibraryEntry>>("/api/v1/me/library"),
  stats: (scope: StatsScope) => client.get<ReadingStats>(statsUrl(scope)),
}
