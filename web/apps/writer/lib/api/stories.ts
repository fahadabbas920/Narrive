import { client } from "."

export type StoryStatus = "draft" | "published" | "archived"

export interface Story {
  id: string
  title: string
  description: string
  cover_image: string | null
  genres: string[]
  moods: string[]
  content_rating: string | null
  tags: string[]
  status: StoryStatus
  scene_count: number
  author_id: string
  created_at: string
  updated_at: string
}

export interface Scene {
  id: string
  story_id: string
  title: string
  content: string
  scene_type: "start" | "middle" | "ending"
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export interface Choice {
  id: string
  story_id: string
  from_scene_id: string
  to_scene_id: string
  text: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface StoryDetail extends Story {
  scenes: Scene[]
  choices: Choice[]
}

export interface CreateStoryPayload {
  title: string
  description: string
  genres?: string[]
  moods?: string[]
  content_rating?: string | null
  tags?: string[]
}

export interface UpdateStoryPayload {
  title?: string
  description?: string
  genres?: string[]
  moods?: string[]
  content_rating?: string | null
  tags?: string[]
  status?: StoryStatus
}

export const storiesApi = {
  list: () => client.get<Story[]>("/api/v1/stories"),
  get: (id: string) => client.get<StoryDetail>(`/api/v1/stories/${id}`),
  create: (payload: CreateStoryPayload) => client.post<Story>("/api/v1/stories", payload),
  update: (id: string, payload: UpdateStoryPayload) =>
    client.patch<Story>(`/api/v1/stories/${id}`, payload),
  delete: (id: string) => client.delete<void>(`/api/v1/stories/${id}`),
}
