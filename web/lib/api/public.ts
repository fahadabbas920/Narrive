import { client } from "."
import type { SocialLink } from "./auth"
import type { Story, StoryDetail } from "./stories"

interface PublicAuthor {
  author_name: string | null
  author_handle: string | null
  author_tone: string | null
  /** A Narrive Original, owned by the Narrive house account */
  is_official: boolean
}

export type PublicStory = Story & PublicAuthor
export type PublicStoryDetail = StoryDetail & PublicAuthor

export interface PublicStoryPage {
  items: PublicStory[]
  total: number
  /** Pass back as `cursor` to get the next page; null on the last page. */
  next_cursor: string | null
}

export interface CatalogueQuery {
  q?: string
  genre?: string[]
  mood?: string[]
  rating?: string[]
  featured?: boolean
  limit?: number
  cursor?: string | null
}

/** Stories per genre / mood / rating across the whole catalogue, for the filter menus. */
export interface StoryFacets {
  total: number
  genres: Record<string, number>
  moods: Record<string, number>
  ratings: Record<string, number>
}

function catalogueQs({ q, genre, mood, rating, featured, limit, cursor }: CatalogueQuery) {
  const p = new URLSearchParams()
  if (q?.trim()) p.set("q", q.trim())
  genre?.forEach((g) => p.append("genre", g))
  mood?.forEach((m) => p.append("mood", m))
  rating?.forEach((r) => p.append("rating", r))
  if (featured) p.set("featured", "true")
  if (limit) p.set("limit", String(limit))
  if (cursor) p.set("cursor", cursor)
  const s = p.toString()
  return s ? `?${s}` : ""
}

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
  listStories: (query: CatalogueQuery = {}) =>
    client.get<PublicStoryPage>(`/api/v1/public/stories${catalogueQs(query)}`),
  facets: () => client.get<StoryFacets>("/api/v1/public/stories/facets"),
  getStory: (id: string) => client.get<PublicStoryDetail>(`/api/v1/public/stories/${id}`),
  getWriter: (handle: string) =>
    client.get<PublicWriter>(`/api/v1/public/writers/${encodeURIComponent(handle)}`),
}
