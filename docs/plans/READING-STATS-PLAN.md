# Reading Progress, Read Later & Stats — Plan

Status: **built** (2026-09-29), with the suggested answers to the open questions: own-story reads count only in personal stats, finishing doesn't remove a story from Read later, no stats on public profiles, no "abandoned" state. CLAUDE.md describes where the code lives.

Changed since: endings are credited only for a verified run (every step follows a choice), and the one-time upload of browser progress was dropped because it couldn't be verified. Stats are counted in SQL.

**Goals**
1. **Progress:** every reader's position is saved per story, on the server, so it follows them across devices.
2. **Status on stories:** stories show your own status everywhere: *In progress*, *Finished*, *2 of 4 endings*, *Saved*.
3. **Read later:** save stories to read later, and add or remove them from any card or story page.
4. **Stats:** your reading stats on a **My reading** page.
5. **Reuse:** the stats are built once and reused for **one reader** (you, or a user in the admin console), **one story** (admin now, writers later) and **the whole platform** (the admin overview).

**Why the server.** Reading progress lives only in the browser today (`web/lib/reading-progress.ts`, `localStorage`). Nothing reaches the server, so saving progress there comes first.

---

## 1. Definitions

| Term | Meaning |
|---|---|
| **Started** | Opened the story and saw its start scene. |
| **In progress** | Started, and no ending reached yet. |
| **Finished** | At least one ending reached. It stays finished if they start again ("Reading again"). |
| **Endings found** | The distinct endings this reader has reached, e.g. 2 of 4. |
| **Completed all endings** | Every ending found. |
| **Saved** | On their Read later list. This is separate from progress: a saved story can be unstarted, in progress or finished. |

## 2. Data (one migration)

```
reading_progress                         one row per reader per story
  id, user_id→users, story_id→stories    unique (user_id, story_id), ON DELETE CASCADE
  current_scene_id                       nullable (writer may delete the scene → resume at start)
  history          JSON [scene ids]      current run's back-stack
  scenes_seen      JSON [scene ids]      every scene ever visited
  endings_found    JSON [scene ids]
  runs_finished    int
  started_at, last_read_at, first_finished_at (nullable)
  index (user_id, last_read_at desc), index (story_id)

saved_stories                            the Read later list
  user_id→users, story_id→stories        primary key (user_id, story_id), ON DELETE CASCADE
  created_at
```

Read later has its own table rather than a flag on progress. That way you can save a story you've never opened, and removing it never touches your progress.

## 3. The reusable stats engine

### Backend: one function, one response shape
`app/core/reading_stats.py`:

```python
def reading_stats(db, *, user_id=None, story_id=None, since=None) -> ReadingStats
```

| Scope | Called by |
|---|---|
| `user_id=me` | `GET /me/reading/stats` (My reading page) |
| `user_id=X` | `GET /admin/users/{id}/reading-stats` |
| `story_id=S` | `GET /admin/stories/{id}/reading-stats` (later also the writer's own story page) |
| neither (platform) | `GET /admin/reading-stats?since=30d` (admin overview) |

Every scope returns the same `ReadingStats`. A field that doesn't apply to a scope is left empty, so every page renders the same shape:

```json
{
  "scope": "user" | "story" | "platform",
  "readers": 1,                 // distinct readers (always 1 for a user scope)
  "started": 12, "in_progress": 4, "finished": 8, "completed_all_endings": 2,
  "saved": 5,                   // Read later count
  "completion_rate": 0.67,      // finished / started
  "endings_found": 19, "endings_total": 31,
  "scenes_read": 143, "words_read": 41200,
  "last_read_at": "…",
  "activity": [{"date": "2026-09-01", "started": 1, "finished": 0}, …],   // 30 days
  "top_genres": [{"name": "Mystery", "count": 5}, …],                     // user / platform
  "top_stories": [{"id": "…", "title": "…", "finished": 40}, …],          // platform
  "ending_breakdown": [{"scene_id": "…", "title": "Dawn", "reached": 12}]  // story
}
```

The stats are counted in the database straight from `reading_progress` (and `saved_stories` for the saved count), so they stay fast as the platform grows. Nothing is stored twice.

### Frontend: shared components in `components/stats/`

The admin console's `StatTile`, `DailyColumns` and `BarList` move from `components/admin/` into `components/stats/`, and admin imports them from there. New pieces sit next to them:

| Component | Used for |
|---|---|
| `StatTile`, `StatGrid` | the headline numbers, with an optional change vs the previous period |
| `DailyColumns` | the 30-day activity chart (single colour, `--chart`) |
| `BarList` | top genres, top stories, ending breakdown |
| `EndingsMeter` | "2 of 4 endings" as dots plus a label |
| `ReadingStatusBadge` | *Not started* / *In progress* / *Reading again* / *Finished* / *All endings* |
| **`ReadingStatsPanel`** | takes a `ReadingStats` and a `scope`, and lays out the right tiles and charts for it |

- **Pages using `ReadingStatsPanel`:** My reading (user), admin user detail (user), admin overview (platform), and admin story detail (story).
- **One hook:** `useReadingStats(scope)` picks the endpoint, with the cache key `["reading-stats", scope]`.
- **What each scope shows:**
  - a reader's view says "You've finished 8 stories";
  - the admin view of the same user shows the same panel under an admin heading;
  - the platform view adds "Readers" and "Completion rate".

  The layout and styling are identical.

## 4. API

```
# progress (signed-in reader)
PUT    /api/v1/me/reading/{story_id}      {scene_id, history}   → progress
GET    /api/v1/me/reading/{story_id}                            → progress | 404
DELETE /api/v1/me/reading/{story_id}                            → start over (keeps endings found)
GET    /api/v1/me/reading?status=in_progress|finished           → list with story info
GET    /api/v1/me/reading/stats                                 → ReadingStats (user)

# read later
PUT    /api/v1/me/saved/{story_id}                              → save (idempotent)
DELETE /api/v1/me/saved/{story_id}                              → remove
GET    /api/v1/me/saved                                         → list with story info

# your status on many stories at once (for cards)
GET    /api/v1/me/library                                        → {story_id: {status, endings_found, endings_total, saved}}

# admin (same ReadingStats shape)
GET    /api/v1/admin/reading-stats?since=
GET    /api/v1/admin/users/{id}/reading-stats
GET    /api/v1/admin/stories/{id}/reading-stats
```

- **`PUT /me/reading` checks the data.** The story must be published (or the reader is its writer), and `scene_id` and `history` must only contain that story's scenes.
- **The server decides endings.** If `scene_id` is an ending, it records it in `endings_found`, increments `runs_finished` and sets `first_finished_at`. The client can't fake a finish.
- **`/me/library`** is one small request that returns your status for every story you've touched. The catalogue fetches it once (cache key `["me-library"]`) and matches it to cards, instead of making one request per card. Saving, removing and reading update it optimistically, so the change shows instantly.

## 5. Frontend

### Your status on stories
- **Catalogue cards and profile cards:** a `ReadingStatusBadge` on the cover (only when you've started the story), a small `EndingsMeter` once you've finished it, and a **bookmark button** to save or remove it. Signed-out users see the bookmark too; it opens sign-in and then saves the story.
- **Story detail page:**
  - the main button changes: **Start reading** → **Continue** → **Read again · 2 of 4 endings**;
  - a **Save for later / Saved** toggle;
  - once started, a small "Your progress" strip showing scenes explored (7 of 12), endings found, and when you last read.
- **Reading page:**
  - resume comes from the server, with `localStorage` as a fast fallback;
  - each choice sends a `PUT` in the background, which never blocks reading and retries on the next choice;
  - existing browser progress is uploaded once;
  - the ending card shows "2 of 4 endings found", plus a hint to "find another ending".

### New page: My reading (`/reading`)
- **At the top:** a `ReadingStatsPanel` for you.
- **Tabs:**
  - **Continue reading:** in progress, most recent first, each showing its last scene and when you read it.
  - **Read later:** saved and not yet started, with remove buttons.
  - **Finished:** each story with its endings meter and a **Find another ending** button.
- **Empty states** for each tab, pointing to the catalogue.
- **Links:** "My reading" in the account menu and the reader header, with a count badge for Read later.

### Admin
- **User detail:** a `ReadingStatsPanel` for that user.
- **Overview:** a platform `ReadingStatsPanel` replaces the "Reading analytics are coming" placeholder.
- **Story detail:** a story `ReadingStatsPanel` with the ending breakdown ("how often each ending is reached").

## 6. Privacy
- **Readers:** your progress, saved list and stats are visible only to you.
- **Admins:** they see a user's counts on the user detail page, and totals elsewhere.
- **Writers (later):** only totals for their own stories, never who read them.
- **Deleting an account** removes its progress and saved list. Starting over resets the current run but keeps found endings.

## 7. Build order

| # | Slice | Delivers |
|---|---|---|
| 1 | Migration (`reading_progress`, `saved_stories`), progress API with server-side ending detection | Progress saved on the server |
| 2 | Reading page sync + one-time `localStorage` upload | Resume on any device |
| 3 | `reading_stats()` + `ReadingStats` schema; move `StatTile`/charts to `components/stats/`, build `ReadingStatsPanel`, `useReadingStats` | The reusable stats engine |
| 4 | Read later API + `/me/library`; bookmark buttons, status badges, story detail button states | Status and saving across the app |
| 5 | My reading page (panel + three tabs), account menu link | The reader-facing page |
| 6 | Admin: user, platform and story panels using the same components | Admin reading analytics |

Slices 1–5 are the reader feature, and slice 6 is almost free once 3 exists. Each slice ships on its own.

## Open questions
1. **A writer reading their own story:** my suggestion is to count it in their personal stats but leave it out of the story's totals.
2. **Should finishing a saved story take it off Read later automatically?** My suggestion: no, keep it until you remove it, but move it to the Finished tab. The Read later tab only lists saved stories you haven't started.
3. **Reading stats on public profiles** (e.g. "Finished 12 stories")? My suggestion: not for now.
4. **An "abandoned" state after 30 days without reading?** My suggestion: not for now, it can feel like nagging.
