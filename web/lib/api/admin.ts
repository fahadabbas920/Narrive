import { client } from "."
import type { Choice, Scene, StoryStatus } from "./stories"

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Issue {
  level: "error" | "warning"
  message: string
}

// ── Overview ────────────────────────────────────────────────────────────────

export interface Metric {
  value: number
  previous: number | null
}

export interface AuditEntry {
  id: string
  actor_id: string
  actor_email: string | null
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface Overview {
  cards: {
    users: number
    writers: number
    admins: number
    suspended: number
    new_users_7d: Metric
    new_users_30d: Metric
    published: number
    drafts: number
    archived: number
    originals: number
    featured: number
    scenes: number
    choices: number
  }
  growth: { date: string; signups: number; published: number }[]
  funnel: {
    signed_up: number
    became_writer: number
    created_story: number
    published_story: number
  }
  top_writers: {
    id: string
    handle: string | null
    pen_name: string | null
    avatar_tone: string
    published: number
    total: number
  }[]
  genres: { name: string; count: number }[]
  moods: { name: string; count: number }[]
  recent_users: {
    id: string
    email: string
    handle: string | null
    pen_name: string | null
    is_writer: boolean
    created_at: string
  }[]
  recent_stories: {
    id: string
    title: string
    author_name: string | null
    is_official: boolean
    published_at: string | null
  }[]
  recent_actions: AuditEntry[]
}

export interface HealthReport {
  checked: number
  with_issues: number
  stories: {
    id: string
    title: string
    author_name: string | null
    is_official: boolean
    scene_count: number
    issues: Issue[]
  }[]
}

// ── Users ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  handle: string | null
  pen_name: string | null
  avatar_tone: string
  is_active: boolean
  is_writer: boolean
  admin_role: string | null
  story_count: number
  published_count: number
  created_at: string
  writer_since: string | null
}

export interface AdminUserDetail extends AdminUser {
  bio: string | null
  tagline: string | null
  location: string | null
  stories: AdminStory[]
}

export interface UserFilters {
  q?: string
  role?: "reader" | "writer" | "admin"
  status?: "active" | "suspended"
  sort?: "newest" | "oldest" | "stories"
  page?: number
}

// ── Stories ─────────────────────────────────────────────────────────────────

export interface AdminStory {
  id: string
  title: string
  status: StoryStatus
  author_id: string
  author_name: string | null
  author_handle: string | null
  author_tone: string | null
  is_official: boolean
  is_featured: boolean
  featured_rank: number | null
  genres: string[]
  content_rating: string | null
  scene_count: number
  import_id: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface AdminStoryDetail extends AdminStory {
  description: string
  moods: string[]
  tags: string[]
  words: number
  choice_count: number
  issues: Issue[]
  scenes: Scene[]
  choices: Choice[]
}

export interface StoryFilters {
  q?: string
  status?: StoryStatus
  official?: boolean
  featured?: boolean
  genre?: string
  author?: string
  sort?: "updated" | "newest" | "published" | "title" | "featured"
  page?: number
}

export interface AdminStoryUpdate {
  status?: StoryStatus
  is_featured?: boolean
  featured_rank?: number | null
}

export interface CreateOriginalPayload {
  title: string
  description?: string
  genres?: string[]
  moods?: string[]
  content_rating?: string | null
  tags?: string[]
}

// ── Imports ─────────────────────────────────────────────────────────────────

export interface ImportProblem {
  path: string
  message: string
}

export interface ImportStoryReport {
  index: number
  title: string
  status: string
  scenes: number
  choices: number
  endings: number
  words: number
  errors: ImportProblem[]
  warnings: ImportProblem[]
}

export interface ImportReport {
  valid: boolean
  story_count: number
  scene_count: number
  choice_count: number
  errors: ImportProblem[]
  stories: ImportStoryReport[]
}

export interface ImportResult {
  import_id: string
  stories: { id: string; title: string; status: string }[]
  report: ImportReport
}

export interface ImportRow {
  id: string
  actor_id: string
  actor_email: string | null
  story_count: number
  scene_count: number
  remaining: number
  published: number
  created_at: string
}

export interface AuditFilters {
  action?: string
  target_id?: string
  page?: number
}

function qs(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

const A = "/api/v1/admin"

export const adminApi = {
  overview: () => client.get<Overview>(`${A}/overview`),
  health: () => client.get<HealthReport>(`${A}/overview/health`),

  users: (filters: UserFilters) => client.get<Page<AdminUser>>(`${A}/users${qs(filters)}`),
  user: (id: string) => client.get<AdminUserDetail>(`${A}/users/${id}`),
  updateUser: (id: string, body: { is_active?: boolean; is_writer?: boolean }) =>
    client.patch<AdminUser>(`${A}/users/${id}`, body),

  stories: (filters: StoryFilters) => client.get<Page<AdminStory>>(`${A}/stories${qs(filters)}`),
  story: (id: string) => client.get<AdminStoryDetail>(`${A}/stories/${id}`),
  updateStory: (id: string, body: AdminStoryUpdate) =>
    client.patch<AdminStoryDetail>(`${A}/stories/${id}`, body),
  deleteStory: (id: string) => client.delete<void>(`${A}/stories/${id}`),
  exportStory: (id: string) => client.get<unknown>(`${A}/stories/${id}/export`),

  originals: () => client.get<AdminStory[]>(`${A}/originals`),
  createOriginal: (body: CreateOriginalPayload) => client.post<AdminStory>(`${A}/originals`, body),

  validateImport: (payload: unknown) => client.post<ImportReport>(`${A}/imports/validate`, payload),
  commitImport: (payload: unknown) => client.post<ImportResult>(`${A}/imports`, payload),
  imports: () => client.get<ImportRow[]>(`${A}/imports`),
  undoImport: (id: string, force = false) =>
    client.delete<void>(`${A}/imports/${id}${force ? "?force=true" : ""}`),

  audit: (filters: AuditFilters) => client.get<Page<AuditEntry>>(`${A}/audit${qs(filters)}`),
}
