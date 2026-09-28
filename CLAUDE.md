# Narrive — Claude Context

## What this project is

A text-based interactive storytelling platform. Writers create branching narratives using a visual node-graph editor; readers navigate by making choices. Each story is a directed graph: scenes (nodes) connected by choices (edges).

**One account, two modes.** Every user can read. Writing is unlocked per account (`users.is_writer`) through the become-a-writer onboarding. Both modes live in a single Next.js app, and the URL decides the mode: `/write/*` is writer mode, everything else is reader mode.

## Repo layout

```
storybook/
├── web/        Single Next.js 16 app — reader + writer modes (:3000). Plain pnpm project, no monorepo.
└── backend/    FastAPI app (REST API + PostgreSQL) (:8000)
```

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
│   │   └── read/page.tsx         reading experience (needs session)
│   └── writers/[handle]/page.tsx public writer profile
├── become-a-writer/page.tsx      4-step onboarding (needs session)
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
| `lib/api/` | `api-client.ts` (interceptors), `index.ts` (`client`), `auth.ts`, `stories.ts`, `scenes.ts`, `public.ts`, `taxonomy.ts` |
| `lib/session.ts` | token storage, `setSession` / `clearSession` / `getToken`, `useSession()` hook |
| `lib/jwt.ts` | `decodeIsWriter` (unverified claim, routing hint only), `safeNext` (open-redirect guard) |
| `lib/utils.ts`, `lib/toast.ts` | `cn()`, `showToast` |
| `lib/tones.ts` | static class names per pastel tone (`tone(name).fill / .ink / .cover`), used for writer avatars and covers |
| `lib/story-tone.ts` | `storyTone(id)`, a stable pastel gradient per story (used by cards, covers and previews) |

### Key conventions

- `"use client"` on any component that uses hooks, events, or browser APIs.
- API calls go through `lib/api/` modules, never fetched directly in components.
- Everything is imported via `@/` (`@/components/ui/button`, `@/lib/utils`, …).
- **React Query keys** (one shared cache, so keep them distinct): writer `["stories"]` / `["stories", id]`; public `["public-stories"]` / `["public-story", id]`; current user `["me"]`; `["taxonomy"]`.
- **Taxonomy (genres, moods, content ratings, limits) comes from the backend.** Use `useTaxonomy()` / `useRatingLabel()` from `hooks/use-taxonomy.ts`. Never hard-code these lists in the frontend.
- Toasts via `showToast` from `@/lib/toast`.
- Reader pages wrap header, body and footer in `<PageContainer>` so their edges align. Back links live in the page content, not the header.
- Tailwind important modifier syntax: `bg-primary!` not `!bg-primary` (Tailwind v4).
- React Flow's own CSS is imported only in `components/app/editor/story-canvas.tsx`, so reader pages don't load it. Theme overrides for it are at the bottom of `app/globals.css`.

### Theme — "Pastel storybook" (`app/globals.css`)

- `:root` and `.dark` token blocks hold all colours. Default theme is light.
- Core shadcn tokens (`primary`, `secondary`, `muted`, `accent`, …) plus pastel pairs, each a fill and a readable ink: `lavender`/`lavender-ink`, `peach`, `mint`, `sky`, `blush`, `butter`. Use them as `bg-mint text-mint-ink`.
- **Rule:** pastel fills always take their `*-ink` text (or `text-foreground`), never white. `--primary` is the one deeper lavender that works as both link text and a solid button with white text. All pairs were checked for WCAG AA (≥ 4.5:1) in both themes.
- Mode colours: reader = peach → blush, writer = lavender → sky. Scene nodes: start = mint, ending = blush, middle = lavender.

### Auth & modes

- **Session:** the JWT lives in `localStorage` and is mirrored to a `token` cookie (for `proxy.ts`). Always go through `lib/session.ts`; `useSession()` re-renders on sign-in/out, including across tabs.
- **JWT claim** `is_writer` is a routing hint only. The API re-checks the database on every `/stories` call.
- **`proxy.ts`** (Next 16's renamed middleware):
  - with no token, `/write/*`, `/become-a-writer` and `/story/:id/read` redirect to `/login?next=…` (plus `mode=writer` for the writer paths);
  - a token whose claim is `false` hitting `/write/*` goes to `/become-a-writer`;
  - signed-in users are bounced off `/login` and `/register`.
- **`WriterGate`** (in `app/write/layout.tsx`) confirms `is_writer` via `GET /auth/me`. This also covers legacy tokens that have no claim.
- **Login/register** take `?mode=reader|writer&next=…`:
  - signing in goes to `next`; otherwise writer mode lands on `/write` (or `/become-a-writer`) and reader mode on `/`;
  - signing up signs in automatically, then writer mode goes to `/become-a-writer?start=profile` and reader mode to `next` or `/`.
- **Become a writer:** Welcome → What you get → Profile (pen name, bio, genres) → Confirm checkbox → `POST /users/me/become-writer`. The response carries a fresh token with `is_writer: true`, then the user is sent to `/write/stories?welcome=1`.
- **ModeSwitch** ("Reading | Writing" pill, in both headers):
  - writers jump between `/` and `/write`;
  - signed-in readers see "Become a writer";
  - signed-out users go to `/login?mode=writer`.
- A **401** clears the session. It only redirects to `/login` when the user is on a protected path; public browsing silently signs out.

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
│   │   ├── deps.py          get_current_user (DB lookup), get_current_writer_id (403 if not a writer)
│   │   └── taxonomy.py      GENRES, MOODS, CONTENT_RATINGS, limits + clean_* validators (single source of truth)
│   ├── models/
│   │   ├── user.py          User table (incl. writer profile fields)
│   │   └── story.py         Story, Scene, Choice tables + StoryStatus/SceneType enums
│   ├── schemas/
│   │   ├── auth.py          UserCreate, UserRead, Token, BecomeWriter, WriterUpgrade
│   │   └── story.py         StoryCreate/Read/Update/Detail, SceneCreate/Read/Update, ChoiceCreate/Read/Update
│   └── routers/
│       ├── auth.py          POST /auth/signup, /auth/signin, GET /auth/me
│       ├── users.py         POST /users/me/become-writer
│       ├── stories.py       Full CRUD for stories, scenes, choices (writers only)
│       ├── taxonomy.py      GET /taxonomy (public, Cache-Control: no-cache)
│       └── public.py        Published stories, no auth
└── alembic/                 Migrations (env.py imports all models)
```

### Data models

```
User         id, email, hashed_password, is_active,
             is_writer, pen_name, bio(Text), genres(JSON), writer_since,
             handle(unique), tagline, location, website, social_links(JSON [{platform,url}]),
             avatar_tone, cover_tone
Story        id, author_id→User, title, description, cover_image, genres(JSON), moods(JSON),
             content_rating, tags(JSON), status(draft|published|archived)
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

GET    /api/v1/public/stories                → published stories incl. author_name (no auth)
GET    /api/v1/public/stories/{id}
GET    /api/v1/public/writers/{handle}       → public profile + stats + published stories
```

- All `/stories` endpoints require a Bearer token and a user with `is_writer = true` (403 "Writer profile required" otherwise).
- Ownership is enforced: users can only access their own stories. Both ends of a choice must be scenes in the same story, and self-loops are rejected (422).
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

---

## Redesign history

The account-modes / single-app / pastel redesign is specified in [REDESIGN-PLAN.md](REDESIGN-PLAN.md) and was built on 2026-09-28. Since then the frontend has also been flattened from a Turborepo monorepo into one plain Next.js app.

---

## Phase 2 (not yet built)

- **Reader experience**: reading progress saved per user
- **Story analytics**: view counts, completion rates, popular choice paths (teased as "coming soon" in onboarding)
- **Author profiles**: follows, avatar photo uploads (needs file storage)
- **Bookmarks + sharing**: save reading sessions, share completed endings
- **Password reset**: not implemented; the login card has no "Forgot?" link yet
