# Narrive — Claude Context

## What this project is

A text-based interactive storytelling platform. Writers create branching narratives using a visual node-graph editor; readers navigate by making choices. Each story is a directed graph: scenes (nodes) connected by choices (edges).

## Repo layout

```
storybook/
├── web/                        Turborepo + pnpm monorepo (all frontend)
│   ├── apps/
│   │   ├── writer/             Next.js 16 — author/admin portal (:3000)
│   │   └── reader/             Next.js 16 — public reader portal (:3001)
│   └── packages/
│       ├── ui/                 @workspace/ui — shared shadcn primitives, composites,
│       │                       Tailwind theme/globals.css, cn(), showToast
│       └── typescript-config/  @workspace/typescript-config — shared tsconfig bases
└── backend/                    FastAPI app (REST API + PostgreSQL) — separate, not in web/
```

## Running locally

```bash
# Backend (requires PostgreSQL — `cd backend && docker compose up -d` for the DB)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend monorepo — runs BOTH apps (writer :3000, reader :3001)
cd web
pnpm install
pnpm dev          # turbo runs all apps; or `pnpm --filter writer dev`
```

Backend tables auto-create on first startup via SQLModel. Alembic is set up at `backend/alembic/` for migration management.

---

## Monorepo conventions (`web/`)

- **Tooling:** Turborepo + pnpm workspaces. Root scripts: `pnpm dev | build | lint | typecheck` (each runs `turbo run <task>` across all packages).
- **Shared UI** lives in `packages/ui` (`@workspace/ui`), consumed with NO build step (apps list it in `transpilePackages`). Import paths:
  - `@workspace/ui/components/<x>` — primitives (button, input, card, badge, sheet, dialog, …) + composites (button-ui, page-header, badge-picker, tag-input)
  - `@workspace/ui/lib/utils` — `cn()`
  - `@workspace/ui/lib/toast` — `showToast`
  - `@workspace/ui/globals.css` — the Tailwind theme + tokens (imported once in each app's `app/globals.css`)
- **The theme lives in ONE place:** `packages/ui/src/styles/globals.css` (`:root` + `.dark` token blocks). Change a colour token there and BOTH apps update. The "Jade pebble" palette lives here.
- **Tailwind v4 content detection:** the shared `globals.css` has `@source "../components/**/*.{ts,tsx}"` so classes used inside `@workspace/ui` aren't purged. Each app auto-detects its own files.
- **App-local code keeps `@/`** (hooks, lib/api, lib/schemas, editor components, forms). Only shared things use `@workspace/ui`.
- **shadcn:** `components.json` in each app points `ui`/`utils` aliases at `@workspace/ui`, so `shadcn add` installs primitives into the package. The package has its own `components.json` too.
- **Writer-only React Flow CSS** is appended in `apps/writer/app/globals.css` after the shared import (reader doesn't need it).
- **tsconfig:** each app extends `@workspace/typescript-config/nextjs.json`; the ui package extends `react-library.json`.

---

## Writer app (`web/apps/writer`)

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui (base-ui), TanStack React Query v5, React Hook Form + Zod v4, Sonner, `@xyflow/react` v12, Lucide icons.

> ⚠️ shadcn/ui here uses `@base-ui/react` primitives — NOT `@radix-ui`. There is no `asChild` prop. Use `render={<Link href="..." />}` on `Button` to render as a different element.

### Route structure

```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx          split-panel auth layout (no bg image yet)
├── (dashboard)/
│   ├── layout.tsx           sidebar + navbar shell
│   ├── page.tsx             redirects to /stories
│   └── stories/
│       ├── page.tsx         My Stories grid
│       ├── new/page.tsx     Create story form
│       └── [id]/
│           ├── page.tsx     Story overview (stats, publish CTA)
│           └── edit/page.tsx React Flow visual editor
```

### Key conventions

- `"use client"` on any component that uses hooks, events, or browser APIs.
- API calls go through `lib/api/` modules, never fetched directly in components.
- React Query keys: `["stories"]` for list, `["stories", id]` for detail.
- Toast via `showToast` from `lib/toast.ts` (wraps Sonner).
- The `ButtonUI` wrapper (now shared at `packages/ui/src/components/button-ui.tsx`) adds consistent cursor/padding defaults on top of the shadcn `Button`.
- Tailwind important modifier syntax: `bg-primary!` not `!bg-primary` (Tailwind v4).

### Auth flow

JWT token stored in `localStorage` and mirrored to a cookie (for middleware route protection). The `Providers` component registers a request interceptor that attaches `Authorization: Bearer <token>` to every API call. A 401 response clears the token and redirects to `/login`.

Route protection is in `proxy.ts` (Next.js 16 renamed `middleware` → `proxy`). The file exports `function proxy(...)` and protects all routes except `/login` and `/register`.

### Visual story editor

Located at `components/app/editor/`. Four files:

| File | Role |
|---|---|
| `story-canvas.tsx` | React Flow canvas — manages node/edge state, connects to backend mutations |
| `scene-node.tsx` | Custom node: green=start, default=middle, red=ending |
| `choice-edge.tsx` | Custom edge with inline label; click opens edit dialog |
| `scene-panel.tsx` | Slide-in Sheet for editing scene content; auto-saves after 800ms debounce |
| `choice-dialog.tsx` | Dialog for new choice text (on draw) or editing existing choice (on edge click) |

Data flow: `GET /stories/{id}` returns `{ scenes, choices }` → mapped to React Flow nodes/edges. Node drag stop → `PATCH /scenes/{id}` with new position. Draw edge → choice dialog → `POST /choices`. Delete node/edge → `DELETE` endpoint.

### Hooks

| Hook | File |
|---|---|
| `useSignIn`, `useSignUp`, `useLogout` | `hooks/use-auth.ts` |
| `useStories`, `useStory`, `useCreateStory`, `useUpdateStory`, `useDeleteStory`, `usePublishStory` | `hooks/use-stories.ts` |
| `useCreateScene`, `useUpdateScene`, `useDeleteScene`, `useCreateChoice`, `useUpdateChoice`, `useDeleteChoice` | `hooks/use-story-editor.ts` |

### Adding a new page

1. Create file under `app/(dashboard)/your-route/page.tsx`
2. Add nav item to `components/app/sidebar.tsx` `navItems` array
3. Create API module in `lib/api/` if needed
4. Add hook in `hooks/` following the React Query pattern

---

## Reader app (`web/apps/reader`)

**Stack:** Next.js 16, React 19, Tailwind v4, TanStack React Query v5, React Hook Form + Zod, `next-themes`. Public reader portal (:3001).

### Auth model — browse public, read gated

Unlike the writer (which protects every route), the reader is **public by default**: the catalogue (`/`) and story detail (`/story/[id]`) need no login. Only the reading experience (`/story/[id]/read`) requires a signed-in user.

- **`proxy.ts`** guards *only* `/story/:id/read` — no token → redirect to `/login?next=<path>`. It also bounces signed-in users away from `/login` and `/register`. Matcher is scoped to those paths so browsing is never intercepted.
- **Start Reading** (`app/story/[id]/page.tsx`) is a client button: checks `localStorage.token`, routes straight to `/read` if present, else to `/login?next=/story/{id}/read` (instant UX; the proxy is the server-side backstop for direct URL hits).
- After sign-in, `useSignIn(next)` redirects to the `next` param (validated to be an in-app path). Register preserves `next` through to `/login`.
- **`lib/api/`** mirrors the writer: `api-client.ts` (interceptors), `client.ts`, `auth.ts`, `public.ts` (the old `lib/api.ts` publicApi), re-exported from `index.ts`. `app/providers.tsx` registers the bearer-token interceptor + 401 handler.
- **`components/auth-button.tsx`** in the headers: "Sign in" link when logged out, email + sign-out when logged in (mounted-guarded to avoid hydration mismatch). `useLogout` clears the session and returns to `/`.

---

## Backend

**Stack:** FastAPI 0.136, SQLModel 0.0.38 (= SQLAlchemy 2 + Pydantic 2), PostgreSQL, psycopg2-binary (sync), passlib bcrypt, python-jose JWT.

```
backend/
├── app/
│   ├── main.py              FastAPI app, CORS, startup table creation
│   ├── core/
│   │   ├── config.py        Settings from .env (pydantic-settings)
│   │   ├── database.py      SQLModel engine + get_session dependency
│   │   └── security.py      hash_password, verify_password, create_access_token, get_current_user_id
│   ├── models/
│   │   ├── user.py          User table
│   │   └── story.py         Story, Scene, Choice tables + StoryStatus/SceneType enums
│   ├── schemas/
│   │   ├── auth.py          UserCreate, UserRead, Token
│   │   └── story.py         StoryCreate/Read/Update/Detail, SceneCreate/Read/Update, ChoiceCreate/Read/Update
│   └── routers/
│       ├── auth.py          POST /auth/signup, /auth/signin
│       └── stories.py       Full CRUD for stories, scenes, choices
└── alembic/                 Migrations (env.py imports all models)
```

### Data models

```
User         id, email, hashed_password, is_active
Story        id, author_id→User, title, description, genre, tags(JSON), status(draft|published|archived)
Scene        id, story_id→Story, title, content(Text), scene_type(start|middle|ending), position_x, position_y
Choice       id, story_id→Story, from_scene_id→Scene, to_scene_id→Scene, text, display_order
```

### API endpoints

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/signin

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
```

All `/stories` endpoints require Bearer token. Ownership is enforced — users can only access their own stories.

### Adding a new model

1. Add SQLModel table class to `app/models/`
2. Import it in `app/main.py` (so `create_all` picks it up)
3. Import it in `alembic/env.py` (so migrations see it)
4. Add Pydantic schemas to `app/schemas/`
5. Add router to `app/routers/` and register in `main.py`

---

## Environment variables

### Writer (`web/apps/writer/.env.local`) and Reader (`web/apps/reader/.env.local`)
| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

### Backend (`backend/.env`)
| Variable | Default |
|---|---|
| `SECRET_KEY` | random (change in prod) |
| `SQLALCHEMY_DATABASE_URI` | `postgresql://postgres:postgres@localhost:5432/storybook` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `43200` (30 days) |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` |

---

## Planned redesign (agreed 2026-09-28, not yet built)

Account modes (reader / writer), merging both apps into one Next.js app, become-a-writer onboarding, new login design, and the pastel theme are all specified in [REDESIGN-PLAN.md](REDESIGN-PLAN.md). Read it before touching auth, routing, or theme tokens.

---

## Phase 2 (not yet built)

- **Reader experience**: public story browsing, in-browser choice navigation, reading progress saved per user
- **Story analytics**: view counts, completion rates, popular choice paths
- **Author profiles**: public pages, follow system
- **Bookmarks + sharing**: save reading sessions, share completed endings
