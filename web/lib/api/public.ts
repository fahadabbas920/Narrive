import { client } from "."
import type { SocialLink } from "./auth"
import type { Story, StoryDetail } from "./stories"

interface PublicAuthor {
  author_name: string | null
  author_handle: string | null
  author_tone: string | null
}

export type PublicStory = Story & PublicAuthor
export type PublicStoryDetail = StoryDetail & PublicAuthor

export interface PublicWriter {
  handle: string
  pen_name: string
  tagline: string | null
  bio: string | null
  genres: string[]
  location: string | null
  website: string | null
  social_links: SocialLink[]
  avatar_tone: string
  cover_tone: string
  writer_since: string | null
  stats: { stories: number; scenes: number; choices: number }
  stories: PublicStory[]
}

export const publicApi = {
  listStories: () => client.get<PublicStory[]>("/api/v1/public/stories"),
  getStory: (id: string) => client.get<PublicStoryDetail>(`/api/v1/public/stories/${id}`),
  getWriter: (handle: string) =>
    client.get<PublicWriter>(`/api/v1/public/writers/${encodeURIComponent(handle)}`),
}
