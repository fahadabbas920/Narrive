# Narrive

A text-based interactive storytelling platform where writers create branching narratives and readers determine the outcome through choices.

## Overview

One account works in two modes. Everyone can **read**. **Writing** is unlocked through a short "Become a writer" onboarding, and a Reading | Writing switch in the header moves between the two.

**Super admins** also get an **Admin** tab and the admin console at `/admin`:
- a platform overview;
- user and story moderation;
- **Narrive Originals**, the stories Narrive publishes itself;
- featured stories;
- bulk JSON import, including a copyable prompt for writing stories with AI;
- an audit log.

Stories are structured as decision trees. At key moments, readers select from multiple options leading to different scenes, storylines, and endings. The experience is entirely text-based — no graphics, no game mechanics, just writing.

```
storybook/
├── web/        Next.js 16 — one app with Reader and Writer modes   (port 3000)
└── backend/    FastAPI — REST API + PostgreSQL                     (port 8000)
```

## Prerequisites

- Node.js 20+, pnpm
- Python 3.12+
- Docker (for PostgreSQL)

## Setup

### 1. Database

```bash
cd backend
docker compose up -d
```

This starts PostgreSQL on port 5432 with data persisted in a Docker volume. Connect with TablePlus/DBeaver using `localhost:5432`, user `postgres`, password `postgres`, database `storybook`.

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API docs are at `http://localhost:8000/docs`. Always run `alembic upgrade head` after pulling: startup creates missing tables but never adds new columns.

To create accounts or grant super admin from the command line:

```bash
python -m app.scripts.create_user you@example.com --admin   # new account; password asked at a hidden prompt
python -m app.scripts.make_admin you@example.com            # make an existing account super admin (--revoke to undo)
```

### 3. Web app

```bash
cd web
pnpm install
pnpm dev          # http://localhost:3000 (reader), /write (writer), /admin (super admin)
```

## Development

### Frontend (run from `web/`)

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm typecheck    # tsc
pnpm lint         # ESLint
pnpm format       # Prettier (write)
pnpm format:check # Prettier (check only)
```

### Backend

```bash
docker compose up -d                 # start postgres
source .venv/bin/activate
uvicorn app.main:app --reload        # dev server
ruff check app/                      # lint
ruff check app/ --fix                # lint + auto-fix
ruff format app/                     # format
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4 |
| UI | shadcn/ui (base-ui), Lucide icons |
| State | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Story editor | React Flow (@xyflow/react) |
| Backend | FastAPI, SQLModel, PostgreSQL |
| Auth | JWT (Bearer tokens) |
| Linting | ESLint + Prettier (web), Ruff (backend) |

## Project Structure

```
web/
├── app/(auth)/            login, register (shared screen with Reader | Writer toggle)
├── app/(reader)/          public catalogue, story detail, reading experience
├── app/become-a-writer/   4-step writer onboarding
├── app/write/             writer mode: stories list, new/edit story, overview, canvas editor
├── app/admin/             super admin console: overview, users, stories, originals, import, audit
├── components/ui/         shadcn primitives + composites
├── components/            headers, mode switch, auth screens, onboarding, editor
├── hooks/                 React Query queries and mutations
├── lib/api/               typed API client + endpoint modules
├── lib/session.ts         session storage + useSession()
└── proxy.ts               route protection (Next.js 16 middleware → proxy)

backend/
├── app/
│   ├── core/            config, database, JWT security, taxonomy, story graph checks, importer
│   ├── models/          User, Story, Scene, Choice, AdminAction, StoryImport (SQLModel)
│   ├── schemas/         Pydantic request/response schemas (incl. the bulk-import format)
│   ├── routers/         auth, users, stories (scenes + choices nested), public, taxonomy, admin
│   └── scripts/         create_user, make_admin
└── index.py             Vercel entry point
├── alembic/             database migrations
```

## API

```
POST /api/v1/auth/signup
POST /api/v1/auth/signin
GET  /api/v1/auth/me
POST /api/v1/users/me/become-writer
PATCH /api/v1/users/me/profile
GET  /api/v1/users/handle-available?handle=

# writers only (403 otherwise)

GET    /api/v1/stories
POST   /api/v1/stories
GET    /api/v1/stories/{id}          # includes scenes + choices
PATCH  /api/v1/stories/{id}
DELETE /api/v1/stories/{id}

POST   /api/v1/stories/{id}/scenes
PATCH  /api/v1/stories/{id}/scenes/{scene_id}
DELETE /api/v1/stories/{id}/scenes/{scene_id}

POST   /api/v1/stories/{id}/choices
PATCH  /api/v1/stories/{id}/choices/{choice_id}
DELETE /api/v1/stories/{id}/choices/{choice_id}

# public, no auth
GET    /api/v1/taxonomy
GET    /api/v1/public/stories
GET    /api/v1/public/stories/{id}
GET    /api/v1/public/writers/{handle}

# super admins only (403 otherwise) — full list in CLAUDE.md
/api/v1/admin/overview, /users, /stories, /originals, /imports, /audit
```

## Environment Variables

**`backend/.env`**
```
SECRET_KEY=<random hex>
SQLALCHEMY_DATABASE_URI=postgresql://postgres:postgres@localhost:5432/storybook
ACCESS_TOKEN_EXPIRE_MINUTES=43200
BACKEND_CORS_ORIGINS=http://localhost:3000
```

**`web/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Deployment (Vercel + Neon)

| Project | Root directory | URL |
|---|---|---|
| `narrive` (Next.js) | `web` | https://narrive-eight.vercel.app |
| `narrive-api` (FastAPI) | `backend` | https://narrive-api.vercel.app |

- Both deploy automatically on every push to `main`.
- The database is Neon Postgres, connected to `narrive-api`.
- **Migrations aren't run by Vercel.** Before pushing a schema change, run them from your machine against Neon's unpooled URL:

```bash
cd backend && source .venv/bin/activate
SQLALCHEMY_DATABASE_URI="<DATABASE_URL_UNPOOLED>" alembic upgrade head
```

Environment variables:
- **Backend:** `SQLALCHEMY_DATABASE_URI` (Neon pooled URL), `SECRET_KEY`, `BACKEND_CORS_ORIGINS`.
- **Frontend:** `NEXT_PUBLIC_API_URL`. It's baked in at build time, so redeploy after changing it.
