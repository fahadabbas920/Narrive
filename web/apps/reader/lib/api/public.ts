import { client } from "./client"

export type StoryStatus = "draft" | "published" | "archived"

export interface Story {
  id: string
  title: string
  description: string
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

export function contentRatingLabel(value: string | null | undefined): string | null {
  if (!value) return null
  const labels: Record<string, string> = {
    kids: "Kids",
    everyone: "Everyone",
    teen: "Teen 13+",
    mature: "Mature 16+",
    adult: "18+",
  }
  return labels[value] ?? value
}

export interface Scene {
  id: string
  story_id: string
  title: string
  content: string
  scene_type: "start" | "middle" | "ending"
  position_x: number
  position_y: number
}

export interface Choice {
  id: string
  story_id: string
  from_scene_id: string
  to_scene_id: string
  text: string
  display_order: number
}

export interface StoryDetail extends Story {
  scenes: Scene[]
  choices: Choice[]
}

export const publicApi = {
  listStories: () => client.get<Story[]>("/api/v1/public/stories"),
  getStory: (id: string) => client.get<StoryDetail>(`/api/v1/public/stories/${id}`),
}
