import { client } from "."

export interface SocialLink {
  platform: string
  url: string
}

export interface UserRead {
  id: string
  email: string
  is_active: boolean
  is_writer: boolean
  pen_name: string | null
  bio: string | null
  genres: string[]
  writer_since: string | null
  handle: string | null
  tagline: string | null
  location: string | null
  website: string | null
  social_links: SocialLink[]
  avatar_tone: string
  cover_tone: string
  /** "superadmin" or null */
  admin_role: string | null
  created_at: string
  updated_at: string
}

export interface Token {
  access_token: string
  token_type: string
}

export interface BecomeWriterPayload {
  pen_name: string
  bio: string
  genres: string[]
  accepted_terms: true
}

export interface ProfileUpdatePayload {
  pen_name?: string
  handle?: string
  tagline?: string | null
  bio?: string | null
  genres?: string[]
  location?: string | null
  website?: string | null
  social_links?: SocialLink[]
  avatar_tone?: string
  cover_tone?: string
}

export interface HandleAvailability {
  handle: string
  available: boolean
  reason: string | null
}

export interface WriterUpgrade extends Token {
  user: UserRead
}

export const authApi = {
  signup: (email: string, password: string) =>
    client.post<UserRead>("/api/v1/auth/signup", { email, password }),
  signin: (email: string, password: string) =>
    client.post<Token>("/api/v1/auth/signin", { email, password }),
  me: () => client.get<UserRead>("/api/v1/auth/me"),
  becomeWriter: (payload: BecomeWriterPayload) =>
    client.post<WriterUpgrade>("/api/v1/users/me/become-writer", payload),
  updateProfile: (payload: ProfileUpdatePayload) =>
    client.patch<UserRead>("/api/v1/users/me/profile", payload),
  handleAvailable: (handle: string) =>
    client.get<HandleAvailability>(
      `/api/v1/users/handle-available?handle=${encodeURIComponent(handle)}`,
    ),
}
