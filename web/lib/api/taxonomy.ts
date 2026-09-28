import { client } from "."

export interface ContentRating {
  value: string
  label: string
  hint: string
}

export interface SocialPlatform {
  value: string
  label: string
  domain: string
}

export interface Taxonomy {
  genres: string[]
  moods: string[]
  content_ratings: ContentRating[]
  profile_tones: string[]
  social_platforms: SocialPlatform[]
  limits: {
    story_genres: number
    story_moods: number
    writer_genres: number
    tags: number
    tag_length: number
    social_links: number
    bio_length: number
  }
}

export const taxonomyApi = {
  get: () => client.get<Taxonomy>("/api/v1/taxonomy", { cache: "no-cache" }),
}
