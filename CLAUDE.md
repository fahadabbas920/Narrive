# Narrive — Claude Context

## What this project is

A text-based interactive storytelling platform. Writers create branching narratives using a visual node-graph editor; readers navigate by making choices. Each story is a directed graph: scenes (nodes) connected by choices (edges).

**One account, two modes.** Every user can read. Writing is unlocked per account (`users.is_writer`) through the become-a-writer onboarding. Both modes live in a single Next.js app, and the URL decides the mode: `/write/*` is writer mode, everything else is reader mode.

**Product flows** (every reader, writer and admin flow, rules, limits, user-facing messages and support answers) live in [FLOWS.md](docs/FLOWS.md). Read it before writing support docs or help text, and update it whenever a flow, rule, limit or message changes.

## Working rules (for Claude)

- **Don't run dev servers or test the UI** unless the user explicitly asks. That means no `pnpm dev`, `uvicorn`, Playwright or browser screenshots, and never stop or restart the user's running servers.
- When a change affects what users see or can do, update [FLOWS.md](docs/FLOWS.md) in the same change.
- Verify changes with static checks only: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `ruff check` for the backend. Don't run `pnpm build` either: it writes to `web/.next`, which breaks a dev server the user may have running.
- **Don't `git commit` or push** unless the user asks for it. Leave changes in the working tree.

## Repo layout

```
storybook/
├── web/        Single Next.js 16 app — reader + writer modes (:3000). Plain pnpm project, no monorepo.
├── backend/    FastAPI app (REST API + PostgreSQL) (:8000)
└── docs/       Product and planning docs (see docs/README.md)
    ├── FLOWS.md             every user flow, rule, limit and support answer
    ├── LAUNCH-AUDIT.md      what's left before going to market
    ├── FUTURE-EXPANSION.md  ideas not yet planned
    └── plans/               one *-PLAN.md per feature (built and upcoming)
```

New planning docs go in `docs/plans/`, and new ideas go in `docs/FUTURE-EXPANSION.md`. Keep only `CLAUDE.md` and `README.md` in the root.

## Running locally

```bash
# Backend (requires PostgreSQL — `cd backend && docker compose up -d` for the DB)
cd backend
source .venv/bin/activate
alembic upgrade head            # apply migrations (create_all does NOT add new columns)
uvicorn app.main:app --reload --port 8000

# Frontend
cd web
pnpm install
pnpm dev                        # http://localhost:3000
```

Other `web/` scripts: `pnpm build | lint | typecheck | format | format:check`.

---

## Frontend (`web/`)

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui (base-ui), TanStack React Query v5, React Hook Form + Zod v4, Sonner, `next-themes`, `@xyflow/react` v12, Lucide icons. Fonts: Plus Jakarta Sans (UI), Lora (reading/serif), JetBrains Mono.

> ⚠️ shadcn/ui here uses `@base-ui/react` primitives — NOT `@radix-ui`. There is no `asChild` prop. Use `render={<Link href="..." />}` on `Button` to render as a different element.

> ⚠️ This Next.js version has breaking changes (see `web/AGENTS.md`). Check `node_modules/next/dist/docs/` before using unfamiliar APIs.

### Route structure

```
app/
├── (auth)/login, register        AuthShell: 3-zone split screen with Reader | Writer mode toggle
├── (reader)/
│   ├── page.tsx                  public catalogue
│   ├── story/[id]/
│   │   ├── page.tsx              public story detail (byline links to the writer)
│   │   └── read/page.tsx         reading experience (needs session; ?restart=1 starts a fresh run)
│   ├── reading/page.tsx          My reading: a one-line summary + Continue reading / Read later / Finished (needs session)
│   └── writers/[handle]/page.tsx public writer profile
├── become-a-writer/page.tsx      4-step onboarding (needs session)
├── admin/                        super admin console (needs session + admin_role; see docs/plans/ADMIN-PLAN.md)
│   ├── layout.tsx                admin shell (Sidebar/Navbar variant="admin") wrapped in <AdminGate>
│   ├── page.tsx                  overview: stat tiles, 30-day charts, funnel, genres/moods, health, activity
│   ├── users/, users/[id]        users table; detail with suspend / revoke-writer actions
│   ├── stories/, stories/[id]    every story; detail with unpublish / archive / feature / export / delete
│   ├── originals/                Narrive Originals + "New Original"; [id]/, edit, canvas reuse the writer's story pages
│   ├── import/                   bulk JSON import (upload or paste → check → import → undo)
│   └── audit/                    audit log
└── write/                        writer mode (needs session + is_writer)
    ├── layout.tsx                sidebar + navbar shell, wrapped in <WriterGate>
    ├── page.tsx                  redirects to /write/stories
    ├── profile/page.tsx          edit your public profile (live preview)
    └── stories/
        ├── page.tsx              My Stories grid (+ welcome banner on ?welcome=1)
        ├── new/page.tsx          create story form
        └── [id]/
            ├── page.tsx          story overview (stats, health, publish CTA)
            ├── edit/page.tsx     story metadata form
            └── canvas/page.tsx   React Flow visual editor
```

### Folder map

| Path | Contents |
|---|---|
| `components/ui/` | shadcn primitives (button, input, textarea, badge, sheet, dialog, checkbox, dropdown-menu, …) + composites (badge-picker, tag-input). `shadcn add` installs here. |
| `components/` | app-wide pieces: `mode-switch.tsx` (+ `useIsWriter`), `account-menu.tsx` (avatar dropdown), `reader-header.tsx` (+ `ReaderFooter`), `page-container.tsx` (the one reader content width), `theme-toggle.tsx`, `brand.tsx` |
| `components/auth/` | `auth-shell.tsx` (login/register layout), `auth-fields.tsx` (AuthInput, AuthSubmit) |
| `components/onboarding/` | `become-writer-flow.tsx` |
| `components/app/` | writer shell: `sidebar.tsx` (desktop `Sidebar` at lg+, `MobileSidebar` drawer below lg), navbar, `writer-gate.tsx`, `welcome-banner.tsx`, `story-form.tsx` (shared by new + edit story), `editor/` |
| `components/stats/` | shared by readers and admins: `stat-tile.tsx` (StatTile, formatCount), `charts.tsx` (DailyColumns, BarList — single-series, `bg-chart`), `endings-meter.tsx`, `reading-status-badge.tsx`, `reading-stats-panel.tsx` (**ReadingStatsPanel**, admin: tiles + charts for a user, story or the platform), `reading-summary.tsx` (**ReadingSummary**, readers: one friendly sentence, no dashboard) |
| `components/reader/` | reading-page pieces plus `save-button.tsx` (Read later toggle, `icon` or `full`) and `my-reading-link.tsx` (header link with a saved-count badge) |
| `components/admin/` | `admin-ui.tsx` (AdminPage, Panel, badges, SearchInput, FilterChips, Pagination, DataTable), `story-table.tsx`, `admin-gate.tsx`, `audit-text.ts`, `import-template.ts`, `use-url-filters.ts` (filters kept in the URL) |
| `lib/api/` | `api-client.ts` (interceptors), `index.ts` (`client`), `auth.ts`, `stories.ts`, `scenes.ts`, `public.ts`, `taxonomy.ts`, `admin.ts`, `reading.ts` |
| `lib/session.ts` | token storage, `setSession` / `clearSession` / `getToken`, `useSession()` hook |
| `lib/jwt.ts` | `decodeIsWriter` / `decodeIsAdmin` (unverified claims, routing hints only), `safeNext` (open-redirect guard) |
| `lib/routes.ts` | `ADMIN_WRITING_HOME` (where non-writer admins go instead of `/write`) |
| `lib/utils.ts`, `lib/toast.ts` | `cn()`, `showToast` |
| `lib/tones.ts` | static class names per pastel tone (`tone(name).fill / .ink / .cover`), used for writer avatars and covers |
| `lib/story-tone.ts` | `storyTone(id)`, a stable pastel gradient per story (used by cards, covers and previews) |

### Key conventions

- `"use client"` on any component that uses hooks, events, or browser APIs.
- API calls go through `lib/api/` modules, never fetched directly in components.
- Everything is imported via `@/` (`@/components/ui/button`, `@/lib/utils`, …).
- **React Query keys** (one shared cache, so keep them distinct): writer `["stories"]` / `["stories", id]`; public `["public-stories", "list", filters]` (infinite) / `["public-stories", "featured" | "facets"]` / `["public-story", id]`; current user `["me"]`; `["taxonomy"]`; admin `["admin", …]` (admin mutations also invalidate the public and writer keys); reading `["me-library"]` (your status on every story, shared by all cards), `["reading", storyId]`, `["me-reading", status]`, `["me-saved"]`, `["reading-stats", scope]`. Signing in or out clears the whole cache, because these belong to one person.
- **Taxonomy (genres, moods, content ratings, limits) comes from the backend.** Use `useTaxonomy()` / `useRatingLabel()` from `hooks/use-taxonomy.ts`. Never hard-code these lists in the frontend.
- Toasts via `showToast` from `@/lib/toast`.
- Reader pages wrap header, body and footer in `<PageContainer>` so their edges align. Back links live in the page content, not the header.
- Tailwind important modifier syntax: `bg-primary!` not `!bg-primary` (Tailwind v4).
- React Flow's own CSS is imported only in `components/app/editor/story-canvas.tsx`, so reader pages don't load it. Theme overrides for it are at the bottom of `app/globals.css`.

### Theme — "Pastel storybook" (`app/globals.css`)

- `:root` and `.dark` token blocks hold all colours. Default theme is light.
- Core shadcn tokens (`primary`, `secondary`, `muted`, `accent`, …) plus pastel pairs, each a fill and a readable ink: `lavender`/`lavender-ink`, `peach`, `mint`, `sky`, `blush`, `butter`. Use them as `bg-mint text-mint-ink`.
- **Rule:** pastel fills always take their `*-ink` text (or `text-foreground`), never white. `--primary` is the one deeper lavender that works as both link text and a solid button with white text. All pairs were checked for WCAG AA (≥ 4.5:1) in both themes.
- Mode colours: reader = peach → blush, writer = lavender → sky, admin = butter.
- `--chart` (`bg-chart`) is the one colour for single-series chart marks; its light and dark values were validated with the dataviz palette checks against `--card`.
- Scene nodes: start = mint, ending = blush, middle = lavender.

### Auth & modes

- **Session:** the JWT lives in `localStorage` and is mirrored to a `token` cookie (for `proxy.ts`). Always go through `lib/session.ts`; `useSession()` re-renders on sign-in/out, including across tabs.
- **JWT claims** `is_writer` and `is_admin` are routing hints only. The API re-checks the database on every `/stories` and `/admin` call.
- **`proxy.ts`** (Next 16's renamed middleware):
  - with no token, `/write/*`, `/admin/*`, `/become-a-writer` and `/story/:id/read` redirect to `/login?next=…` (plus `mode=writer` for the writer paths);
  - a token whose `is_writer` claim is `false` hitting `/write/*` goes to `/become-a-writer`, or to `/admin/originals` for admins;
  - signed-in users are bounced off `/login` and `/register` (to `/admin` for admins, `/` otherwise).
- **`WriterGate`** (in `app/write/layout.tsx`) confirms `is_writer` via `GET /auth/me`. This also covers legacy tokens that have no claim.
- **Login/register** take `?mode=reader|writer&next=…`:
  - super admins always land on `/admin`, whatever `mode` or `next` they came with;
  - everyone else goes to `next`; otherwise writer mode lands on `/write` (or `/become-a-writer`) and reader mode on `/`;
  - signing up signs in automatically, then writer mode goes to `/become-a-writer?start=profile` and reader mode to `next` or `/`.
- **Become a writer:** Welcome → What you get → Profile (pen name, bio, genres) → Confirm checkbox → `POST /users/me/become-writer`. The response carries a fresh token with `is_writer: true`, then the user is sent to `/write/stories?welcome=1`.
- **ModeSwitch** ("Reading | Writing" pill, in both headers):
  - writers jump between `/` and `/write`;
  - signed-in readers see "Become a writer";
  - signed-out users go to `/login?mode=writer`.
- **Mode transition screen** (`components/mode-transition.tsx`): the provider listens for clicks on every in-app link. Any link whose target is in a different mode (reader / writer / admin, as decided by `modeOf(path)`) plays the loading screen before navigating, so plain `<Link>`s need nothing extra. Sign-in pages have no mode and are skipped. The screen leaves only once the URL has changed, React Query has nothing in flight (`useIsFetching() === 0` for 200 ms) and 1.2 s have passed, with a 6 s safety cap. That way the destination's own spinners and skeletons never show through. For programmatic navigation across modes, call `useModeTransition()(href, mode)`.
- A **401** clears the session. It only redirects to `/login` when the user is on a protected path; public browsing silently signs out.

### Super admin (`/admin`)

- **Role:** `users.admin_role = "superadmin"`, granted only from the command line (`python -m app.scripts.make_admin email [--revoke]`), never through the API.
- **Access checks:** `proxy.ts` only requires a session for `/admin`. `AdminGate` checks the live role via `/auth/me`, and the API re-checks it on every `/admin` call. The `is_admin` claim only steers routing (post-login landing, `/write` redirects), because tokens issued before the role was granted don't carry it.
- **Account menu:** shows "Admin console" to super admins. The mode switch gains an Admin tab, and the avatar gets a shield badge.
- **`/write` is for writers only.** An admin without a writer profile who opens it is sent to `/admin/originals` (`proxy.ts` and `WriterGate`).
- **Originals are edited in the admin console** at `/admin/originals/[id]`, `/edit` and `/canvas`. Those routes re-export the writer's story pages; `app/admin/originals/[id]/layout.tsx` wraps them in `OriginalsWorkspace` (`components/app/story-workspace.tsx`), which supplies their links and wording. **Story pages must build links with `useStoryWorkspace()`, never hard-code `/write/stories`.**
- When an admin publishes, unpublishes or deletes an Original through `/stories`, the backend writes an audit entry too.
- **Narrive Originals** are ordinary stories owned by the system account `@narrive` (`users.is_system`). Nobody can sign in as it: its password hash matches no password, and sign-in rejects system accounts.
- **Featured:** admins can feature published stories (`is_featured`, `featured_rank`). They appear in the catalogue's Featured row, and cards show an "Original" badge.

### Catalogue paging

- **`All stories` loads 12 at a time** with a "Load more" button (`useInfiniteQuery`). Search (debounced), genre, mood and rating filters run on the server, and changing one restarts from page 1. The filter menus' counts come from `/public/stories/facets`.
- **Paging uses a cursor, not page numbers:** `next_cursor` encodes the last story's `(coalesce(published_at, created_at), id)`, so new publishes never repeat or skip a card. The index `ix_stories_catalogue_order` matches the `ORDER BY`.
- **Each loaded page is its own grid** with `content-visibility: auto`, so pages scrolled far away aren't laid out or painted. Keep the page size a multiple of 6, so every page fills whole rows at 1, 2 and 3 columns and pages stack seamlessly.

### Reading progress, Read later & stats

- **Progress lives on the server** (`reading_progress`, one row per reader per story). The reading page resumes from it, with `lib/reading-progress.ts` (`localStorage`) as a fast fallback. It `PUT`s after every step in the background; saves for one story run one at a time (a mutation `scope`), so they can't land out of order.
- **Endings are only credited for a real run** (`_run_is_real` in `app/routers/reading.py`). The reader has every scene id, so a save only counts when the run began at the start scene and every step since the server last saw the reader follows a choice. Several steps in one save (after a failed save) and going back are fine. Anything else still saves the position, but sets `run_verified = false`: no endings or scenes are credited until the reader starts a fresh run.
- **Statuses:** `in_progress` (no ending yet), `reading_again` (finished before, mid-run now), `finished`, `all_endings`. Computed by `status_of` in `app/core/reading.py`.
- **Read later** is its own table (`saved_stories`), so saving never touches progress. The Read later tab lists saved stories not yet started; finishing never removes a story from the list.
- **One stats shape for every scope.** `reading_stats(db, user_id=…, story_id=…)` returns `ReadingStats` for a reader, a story or the platform. Admin pages render it with `ReadingStatsPanel`. Readers only ever see `ReadingSummary`, a single sentence, because My reading shouldn't feel like a dashboard. A writer's reads of their own story count only in their personal stats. **All counting happens in Postgres** (a CTE of the rows in scope plus `count` / `group by` / `json_array_elements_text`), so only totals leave the database; keep it that way rather than loading progress rows into Python.

### Visual story editor (`components/app/editor/`)

| File | Role |
|---|---|
| `story-canvas.tsx` | React Flow canvas inside a `ReactFlowProvider`; floating toolbar (Add scene, Tidy up, story-health chip), empty state, delete confirmation |
| `scene-node.tsx` | Custom node with a type pill (mint=start, lavender=scene, blush=ending), excerpt, word and choice counts, and issue badges (dead end / unreachable). Exports `SCENE_TYPES` |
| `choice-edge.tsx` | Custom edge with a pill label; click to edit; parallel edges bow apart |
| `scene-panel.tsx` | Non-modal side panel (you can keep clicking scenes). Debounced autosave with a real status that flushes on close and on scene switch; type switch; outgoing choices and "reached from" list |
| `choice-dialog.tsx` | One dialog for `ChoiceDraft` = `{kind:"create", fromId, toId?}` or `{kind:"edit", choice}` |

- **Graph helpers** live in `lib/story-graph.ts`: `analyzeGraph` (reachability, dead ends), `tidyLayout` (a layered top-down layout from the start) and `wordCount`.
- **Canvas rules:**
  - no self-loop choices;
  - dragging a choice onto empty canvas creates a new scene there;
  - multi-selection drags save every moved node;
  - keyboard deletes of scenes go through `onBeforeDelete`, which opens a confirmation dialog;
  - Tidy up saves positions in one batch with `useSaveLayout`.

### Hooks

| Hook | File |
|---|---|
| `useSignIn`, `useSignUp`, `useLogout`, `useMe`, `useBecomeWriter` | `hooks/use-auth.ts` |
| `useTaxonomy`, `useRatingLabel` | `hooks/use-taxonomy.ts` |
| `usePublicWriter`, `useUpdateProfile`, `useHandleAvailability` | `hooks/use-profile.ts` |
| `useLibrary`, `useLibraryEntry`, `useToggleSaved`, `useStoryProgress`, `useSaveProgress`, `useReadingList`, `useSavedList`, `useReadingStats` | `hooks/use-reading.ts` |
| `useStories`, `useStory`, `useCreateStory`, `useUpdateStory`, `useDeleteStory`, `usePublishStory` | `hooks/use-stories.ts` |
| `useCreateScene`, `useUpdateScene`, `useDeleteScene`, `useCreateChoice`, `useUpdateChoice`, `useDeleteChoice`, `useSaveLayout` | `hooks/use-story-editor.ts` |

### Adding a new page

1. Writer page: create `app/write/your-route/page.tsx` and add a nav item to `components/app/sidebar.tsx`. Reader page: create it under `app/(reader)/` and use `<ReaderHeader />`.
2. If it needs auth, add the path to the `proxy.ts` matcher and the `PROTECTED` regex in `app/providers.tsx`.
3. Create an API module in `lib/api/` and a hook in `hooks/` following the React Query pattern.

---

## Backend

**Stack:** FastAPI 0.136, SQLModel 0.0.38 (= SQLAlchemy 2 + Pydantic 2), PostgreSQL, psycopg2-binary (sync), bcrypt, python-jose JWT.

```
backend/
├── app/
│   ├── main.py              FastAPI app, CORS, startup table creation, router registration
│   ├── core/
│   │   ├── config.py        Settings from .env (pydantic-settings)
│   │   ├── database.py      SQLModel engine + get_session dependency
│   │   ├── security.py      hash_password, verify_password, create_access_token(is_writer=…), get_current_user_id
│   │   ├── deps.py          get_current_user (DB lookup), get_current_writer_id, get_current_editor, get_current_admin
│   │   ├── originals.py     get_house_account (the @narrive system user)
│   │   ├── story_graph.py   analyze + tidy_layout (Python ports of the editor's graph helpers)
│   │   ├── importer.py      validate_import / commit_import for bulk JSON
│   │   ├── catalogue.py     visible_stories, story_list, author_details (what readers can see)
│   │   ├── reading.py       status_of, library, reading_stats (one shape for user / story / platform)
│   │   └── taxonomy.py      GENRES, MOODS, CONTENT_RATINGS, limits + clean_* validators (single source of truth)
│   ├── models/
│   │   ├── user.py          User table (incl. writer profile fields)
│   │   ├── story.py         Story, Scene, Choice tables + StoryStatus/SceneType enums
│   │   ├── admin.py         AdminAction (audit log), StoryImport
│   │   └── reading.py       ReadingProgress, SavedStory
│   ├── schemas/
│   │   ├── auth.py          UserCreate, UserRead, Token, BecomeWriter, WriterUpgrade
│   │   └── story.py         StoryCreate/Read/Update/Detail, SceneCreate/Read/Update, ChoiceCreate/Read/Update
│   └── routers/
│       ├── auth.py          POST /auth/signup, /auth/signin, GET /auth/me
│       ├── users.py         POST /users/me/become-writer
│       ├── stories.py       Full CRUD for stories, scenes, choices (writers only)
│       ├── taxonomy.py      GET /taxonomy (public, Cache-Control: no-cache)
│       ├── public.py        Published stories, no auth
│       ├── admin.py         /admin/* (super admin only; every change writes an AdminAction)
│       └── reading.py       /me/reading, /me/saved, /me/library (the signed-in reader's own data)
│   └── scripts/             make_admin.py (grant/revoke super admin), create_user.py (new account, --admin)
└── alembic/                 Migrations (env.py imports all models)
```

### Data models

```
User         id, email, hashed_password, is_active,
             is_writer, pen_name, bio(Text), genres(JSON), writer_since,
             handle(unique), tagline, location, website, social_links(JSON [{platform,url}]),
             avatar_tone, cover_tone, admin_role, is_system
Story        id, author_id→User, title, description, cover_image, genres(JSON), moods(JSON),
             content_rating, tags(JSON), status(draft|published|archived),
             published_at, is_featured, featured_rank, import_id→StoryImport
AdminAction  id, actor_id→User, action, target_type, target_id, details(JSON), created_at
StoryImport  id, actor_id→User, story_count, scene_count, created_at
ReadingProgress id, user_id→User, story_id→Story (unique pair, cascade), current_scene_id, history(JSON),
             scenes_seen(JSON), endings_found(JSON), runs_finished, run_finished, run_verified,
             started_at, last_read_at, first_finished_at
SavedStory   (user_id, story_id) primary key, created_at
Scene        id, story_id→Story, title, content(Text), scene_type(start|middle|ending), position_x, position_y
Choice       id, story_id→Story, from_scene_id→Scene, to_scene_id→Scene, text, display_order
```

### API endpoints

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/signin                   → JWT with sub + is_writer claim
GET    /api/v1/auth/me                       → current user incl. writer profile

POST   /api/v1/users/me/become-writer        {pen_name, bio, genres≤5, accepted_terms: true}
                                             → {access_token, token_type, user}; auto-assigns a unique handle
PATCH  /api/v1/users/me/profile              writers only; partial update of the profile fields
GET    /api/v1/users/handle-available?handle= → {handle, available, reason}

GET    /api/v1/stories                       → list author's stories
POST   /api/v1/stories                       → create story
GET    /api/v1/stories/{id}                  → story + scenes + choices
PATCH  /api/v1/stories/{id}                  → update metadata or status
DELETE /api/v1/stories/{id}

POST   /api/v1/stories/{id}/scenes
PATCH  /api/v1/stories/{id}/scenes/{sid}
DELETE /api/v1/stories/{id}/scenes/{sid}     → also deletes attached choices

POST   /api/v1/stories/{id}/choices
PATCH  /api/v1/stories/{id}/choices/{cid}
DELETE /api/v1/stories/{id}/choices/{cid}

GET    /api/v1/taxonomy                      → {genres, moods, content_ratings, limits} (no auth)

GET    /api/v1/public/stories                ?q&genre*&mood*&rating*&limit(≤48, default 12)&cursor → {items, total, next_cursor}
                                             newest first, keyset-paged; ?featured=true&limit=6 for the Featured row
GET    /api/v1/public/stories/facets         → {total, genres, moods, ratings} counts for the filter menus
GET    /api/v1/public/stories/{id}
GET    /api/v1/public/writers/{handle}       → public profile + stats + published stories

# the signed-in reader's own data
PUT    /api/v1/me/reading/{story_id}         {scene_id, history} → progress
GET    /api/v1/me/reading/{story_id}         → progress | 404 (not started)
DELETE /api/v1/me/reading/{story_id}         → start over (endings found are kept)
GET    /api/v1/me/reading?status=reading|finished
GET    /api/v1/me/reading/stats              → ReadingStats (user)
GET    /api/v1/me/saved                      PUT / DELETE /api/v1/me/saved/{story_id}
GET    /api/v1/me/library                    → {story_id: {status, endings_found, endings_total, saved, last_read_at}}

# super admin only (get_current_admin)
GET    /api/v1/admin/overview                → cards, 30-day growth, funnel, top writers, genres/moods, recent
GET    /api/v1/admin/overview/health         → published stories with structural issues
GET    /api/v1/admin/users                   ?q&role&status&sort&page → Page[AdminUserRow]
GET    /api/v1/admin/users/{id}
PATCH  /api/v1/admin/users/{id}              {is_active?, is_writer?} (not self, not other admins)
GET    /api/v1/admin/stories                 ?q&status&author&official&featured&genre&sort&page
GET    /api/v1/admin/stories/{id}            → detail + scenes/choices + issues
PATCH  /api/v1/admin/stories/{id}            {status?, is_featured?, featured_rank?} (publish: Originals only)
DELETE /api/v1/admin/stories/{id}
GET    /api/v1/admin/stories/{id}/export     → the story in import format
GET    /api/v1/admin/originals               POST /api/v1/admin/originals (StoryCreate)
POST   /api/v1/admin/imports/validate        → ImportReport (writes nothing)
POST   /api/v1/admin/imports                 → creates everything in one transaction, or 422 + report
GET    /api/v1/admin/imports                 DELETE /api/v1/admin/imports/{id}?force= (undo)
GET    /api/v1/admin/reading-stats           ?days → ReadingStats (platform)
GET    /api/v1/admin/users/{id}/reading-stats, /api/v1/admin/stories/{id}/reading-stats
GET    /api/v1/admin/audit                   ?action (exact or "story." prefix)&target_id&actor&since&page
```

- All `/stories` endpoints require a Bearer token and a user with `is_writer = true` (403 "Writer profile required" otherwise). Per-story routes also let super admins in, for Narrive Originals only.
- Ownership is enforced (`_get_story_editable`): writers can only access their own stories. Both ends of a choice must be scenes in the same story, and self-loops are rejected (422).
- **Sign-in** rejects suspended accounts (403) and system accounts.
- **Public catalogue** only shows published stories whose author is active and a writer, so suspending an account or revoking writer access hides their stories without deleting them.
- **Bulk import format** (`app/schemas/story_import.py`): `{"format": "narrive-story", "version": 1, "stories": [...]}`.
  - Scenes use file-made-up `key`s, and choices (`{text, to}`) sit inside their source scene.
  - Checks: exactly one start scene, no dead references or self-loops, the same taxonomy as the editor, and unknown fields rejected.
  - Limits: 2 MB, 50 stories per import, 500 scenes per story.
- **Taxonomy is enforced server-side** in `StoryCreate`/`StoryUpdate` and `BecomeWriter`:
  - genres and moods must come from `app/core/taxonomy.py` (matched case-insensitively and stored in their canonical spelling), at most 5 each;
  - `content_rating` must be one of the listed values, or null;
  - themes (`tags`) stay free-form but are trimmed and de-duplicated, at most 10, each 30 characters or fewer.
  - To add a genre or mood, edit `taxonomy.py`; the frontend picks it up from `GET /taxonomy`.
- **Profile rules** (`app/core/handles.py`, `app/core/links.py`):
  - handles are 3–30 characters of lowercase letters, numbers and single hyphens, unique, and must avoid a reserved list (`write`, `admin`, …);
  - `website` and social links must be http(s) URLs, which blocks `javascript:` links;
  - each social link must match its platform's domain (x.com also accepts twitter.com), at most 3;
  - `avatar_tone` / `cover_tone` must be one of `PROFILE_TONES`.

### Adding a new model

1. Add SQLModel table class to `app/models/`
2. Import it in `app/main.py` (so `create_all` picks it up)
3. Import it in `alembic/env.py` (so migrations see it)
4. Add Pydantic schemas to `app/schemas/`
5. Add router to `app/routers/` and register in `main.py`
6. Adding columns to an existing table needs an Alembic migration, because `create_all` won't alter existing tables.

---

## Environment variables

### Frontend (`web/.env.local`)
| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

### Backend (`backend/.env`)
| Variable | Default |
|---|---|
| `SECRET_KEY` | random (change in prod) |
| `SQLALCHEMY_DATABASE_URI` | `postgresql://postgres:postgres@localhost:5432/storybook` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `43200` (30 days) |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3000` |

### Production (Vercel + Neon)

| Vercel project | Root directory | URL |
|---|---|---|
| `narrive` | `web` | https://narrive-eight.vercel.app |
| `narrive-api` | `backend` (entry `index.py`; deps from `pyproject.toml`) | https://narrive-api.vercel.app |

- Both projects deploy on every push to `main`.
- The database is Neon, connected to `narrive-api`. The app reads `SQLALCHEMY_DATABASE_URI` (the pooled URL), not Neon's `DATABASE_URL`.
- **Vercel doesn't run migrations.** Run `alembic upgrade head` from a laptop against `DATABASE_URL_UNPOOLED`, *before* pushing code that needs new columns. Use the same URL for `create_user` / `make_admin`.
- `BACKEND_CORS_ORIGINS` allows only the production frontend URL, so preview deploys can't call the API.
- `NEXT_PUBLIC_API_URL` is baked in at build time; redeploy the frontend after changing it.

---

## Redesign history

- **2026-09-28:** the account-modes / single-app / pastel redesign, specified in [REDESIGN-PLAN.md](docs/plans/REDESIGN-PLAN.md). The frontend was also flattened from a Turborepo monorepo into one plain Next.js app.
- **2026-09-29:** the super admin console, Narrive Originals and bulk import, specified in [ADMIN-PLAN.md](docs/plans/ADMIN-PLAN.md).
- **2026-09-29:** reading progress on the server, Read later and reading stats, specified in [READING-STATS-PLAN.md](docs/plans/READING-STATS-PLAN.md).

---

## Phase 2 (not yet built)

- **Story analytics for writers**: the same `ReadingStatsPanel` (story scope) on the writer's own story page; popular choice paths would need a per-step event log.
- **Author profiles**: follows, avatar photo uploads (needs file storage)
- **Sharing**: share a finished ending
- **Password reset**: not implemented; the login card has no "Forgot?" link yet
