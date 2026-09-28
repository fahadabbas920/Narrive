# Narrive

A text-based interactive storytelling platform where writers create branching narratives and readers determine the outcome through choices.

## Overview

Stories are structured as decision trees. At key moments, readers select from multiple options leading to different scenes, storylines, and endings. The experience is entirely text-based — no graphics, no game mechanics, just writing.

```
storybook/
├── web/                          Turborepo + pnpm monorepo
│   ├── apps/writer/              Next.js 16 — writer dashboard + story editor  (port 3000)
│   ├── apps/reader/              Next.js 16 — public reader experience         (port 3001)
│   └── packages/
│       ├── ui/                   shared shadcn primitives + Tailwind theme/globals
│       └── typescript-config/    shared tsconfig bases
└── backend/                      FastAPI — REST API + PostgreSQL               (port 8000)
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
uvicorn app.main:app --reload --port 8000
```

Tables are created automatically on first startup. API docs at `http://localhost:8000/docs`.

### 3. Web apps (writer + reader)

```bash
cd web
pnpm install
pnpm dev          # turbo runs BOTH: writer on :3000, reader on :3001
```

Run just one app: `pnpm --filter writer dev` or `pnpm --filter reader dev`.

## Development

### Frontend (run from `web/`)

```bash
pnpm dev          # all apps (turbo)
pnpm build        # build all apps
pnpm typecheck    # tsc across the workspace
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
| Monorepo | Turborepo + pnpm workspaces (`web/`) |
| Linting | ESLint + Prettier (web), Ruff (backend) |

## Project Structure

```
web/
├── apps/
│   ├── writer/
│   │   ├── app/(auth)/        login, register
│   │   ├── app/(dashboard)/   stories list, new/edit story, overview, canvas editor
│   │   ├── components/app/editor/  React Flow canvas, scene nodes, choice edges, panels
│   │   ├── hooks/             React Query mutations and queries
│   │   ├── lib/api/           typed API client + endpoint modules
│   │   └── proxy.ts           route protection (Next.js 16 middleware → proxy)
│   └── reader/                public discover + story detail + reading experience
└── packages/
    ├── ui/                    @workspace/ui — primitives, composites, globals.css (theme)
    └── typescript-config/     @workspace/typescript-config — shared tsconfig bases

backend/
├── app/
│   ├── core/            config, database, JWT security
│   ├── models/          User, Story, Scene, Choice (SQLModel)
│   ├── schemas/         Pydantic request/response schemas
│   └── routers/         auth, stories (scenes + choices nested), public
└── alembic/             database migrations
```

## API

```
POST /api/v1/auth/signup
POST /api/v1/auth/signin

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
```

## Environment Variables

**`backend/.env`**
```
SECRET_KEY=<random hex>
SQLALCHEMY_DATABASE_URI=postgresql://postgres:postgres@localhost:5432/storybook
ACCESS_TOKEN_EXPIRE_MINUTES=43200
BACKEND_CORS_ORIGINS=http://localhost:3000
```

**`web/apps/writer/.env.local`** and **`web/apps/reader/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
