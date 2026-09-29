# Super Admin, Narrive Originals & Bulk Import — Plan

Status: **built** (2026-09-29). All seven slices from §8 are in place; see CLAUDE.md for where the code lives.

**What changed from this plan while building it** (CLAUDE.md describes the current behaviour):
- **Editing Originals:** it happens in the admin console at `/admin/originals/[id]` (overview, edit, canvas), reusing the writer's pages through `useStoryWorkspace()`. It never happens under `/write`, which is writers only.
- **`/admin` access:** `proxy.ts` only requires a session. `AdminGate` checks the live role, because older tokens lack the `is_admin` claim.
- **After sign-in:** super admins always land on `/admin`. The header switch gains an **Admin** tab.
- **Extra pieces:**
  - a Publish/Unpublish button on each Originals row (the server refuses stories with structural errors);
  - a "Copy AI prompt" button on the import page;
  - a `create_user` script alongside `make_admin`.

This plan adds three things:

1. **A super admin area** at `/admin`. It gives an overview of the platform and tools to manage users and stories.
2. **Narrive Originals**, a way to publish stories that the platform itself owns.
3. **A bulk JSON import**: upload a file or paste JSON, check it first, then import it.

---

## 1. Roles and access

### Data
Add one column: `users.admin_role` (nullable string).

- `null` means a normal user.
- `"superadmin"` means full access.

This is the only role for now. The column can take `"moderator"` later without a new migration.

Neither the signup screen nor the API can make someone an admin. The first super admin is created from a command line:

```bash
python -m app.scripts.make_admin you@example.com        # grant
python -m app.scripts.make_admin you@example.com --revoke
```

In production, run it against Neon the same way as migrations, using `DATABASE_URL_UNPOOLED`.

### Enforcement
- **Backend check:** add `get_current_admin` in `app/core/deps.py`. It extends `get_current_user`, re-reads the user from the database, and returns 403 "Admin access required" for anyone who isn't an admin. Every `/admin/*` route depends on it.
- **Login token:** add an `is_admin` claim, which only helps the frontend route the user. The backend never trusts it and always re-checks the database, as it already does for `is_writer`.
- **`proxy.ts`:**
  - a visitor with no token who opens `/admin/*` is sent to `/login?next=…`;
  - a token without the admin claim is sent to `/`.
- **`AdminGate`** (in `app/admin/layout.tsx`) confirms the role through `GET /auth/me`. `/auth/me` gains `admin_role`.
- **Guard rails:**
  - an admin can't deactivate themselves or change their own role;
  - an admin can't change another super admin.
- **Fix to include:** `POST /auth/signin` currently lets a deactivated user sign in. The token only fails afterwards, on the next request. Sign-in should reject inactive accounts, so that suspending an account works cleanly.

### Audit log
New table `admin_actions`. Every admin action that changes something writes one row inside the same transaction, so nothing an admin does goes unrecorded.

```
admin_actions  id, actor_id→users, action, target_type, target_id, details(JSON), created_at
```

The `action` column holds values like `user.deactivate`, `user.revoke_writer`, `story.unpublish`, `story.feature`, `story.delete` and `import.commit`.

---

## 2. What the overview shows

All of these numbers can be computed from the tables we already have, apart from the new `stories.published_at`.

| Section | Contents |
|---|---|
| **Headline cards** | Total users · Writers · New users (7 days / 30 days, with the change from the previous period) · Published stories · Drafts · Narrive Originals · Scenes · Choices |
| **Growth chart** | Daily sign-ups and newly published stories over the last 30 days |
| **Writer funnel** | Signed up → Became a writer → Created a story → Published a story, with the drop-off at each step |
| **Content health** | Published stories that have dead ends, unreachable scenes or no ending. These use the same checks as the editor, ported to Python |
| **Top writers** | Ranked by number of published stories |
| **Taxonomy spread** | Published stories per genre and per mood, which shows gaps in the catalogue |
| **Recent activity** | Latest sign-ups, latest published stories, latest admin actions |

The overview **can't show reading numbers yet** (reads, completions, popular paths). Reading progress is only saved in each reader's browser today. To get those numbers, a later step needs an event table such as `read_events(story_id, user_id?, scene_id, kind, created_at)`, fed from the reading page. That is the "Story analytics" item under Phase 2 in CLAUDE.md. The overview leaves a clearly labelled empty space for it.

To support the published-stories chart, add `stories.published_at` (nullable). Publishing sets it; unpublishing leaves it alone. Existing published stories get it backfilled from `updated_at`.

---

## 3. Backend routes

All routes live under `/api/v1/admin`, need a super admin, and live in the new file `app/routers/admin.py`. Lists take `?q=&page=&page_size=` (at most 100 per page) and return `{items, total, page, page_size}`.

### Overview
```
GET    /admin/overview                 → headline cards + 30-day growth + funnel + recent activity
GET    /admin/overview/health          → published stories that have structural problems (separate call, because it walks every story)
```

### Users
```
GET    /admin/users                    ?q=email|handle|pen name &role=reader|writer|admin &status=active|inactive &sort=newest|stories
GET    /admin/users/{id}               → account, writer profile, story counts, recent stories
PATCH  /admin/users/{id}               {is_active?, is_writer?}   (turning is_writer off hides their stories from the catalogue)
```
There is no hard delete for now. Deactivating is reversible and keeps the stories.

### Stories (every story on the platform, not just the admin's own)
```
GET    /admin/stories                  ?q=title &status= &author= &official=true|false &genre= &sort=
GET    /admin/stories/{id}             → full story with scenes and choices, plus health report
PATCH  /admin/stories/{id}             {status?, is_featured?, featured_rank?}   (unpublish, archive, feature)
DELETE /admin/stories/{id}             (asks for confirmation; recorded in the audit log)
GET    /admin/stories/{id}/export      → the story as import-format JSON (round-trips with the importer)
```

### Narrive Originals
```
GET    /admin/originals                → stories owned by the Narrive account
POST   /admin/originals                → create an empty Original (then edit it in the normal canvas)
```

### Import
```
POST   /admin/imports/validate         body: import JSON → report only, writes nothing
POST   /admin/imports                  body: import JSON → creates everything in one transaction
GET    /admin/imports                  → past imports (who, when, how many stories)
DELETE /admin/imports/{id}             → undo: deletes every story from that import (only ones that are still drafts, or with ?force=true)
```

### Audit
```
GET    /admin/audit                    ?actor= &action= &target_id=
```

### Public side
- `GET /public/stories` gains `is_official`, `is_featured` and `?featured=true`, so the catalogue can show a Featured row and an "Originals" badge.

---

## 4. Narrive Originals

**Approach: stories owned by a Narrive system account**, instead of a special kind of story.

- The migration creates one user:
  - handle `narrive`, which is already on the reserved list, so nobody else can take it;
  - pen name "Narrive Originals";
  - `is_writer = true` and a new column `is_system = true`;
  - a password hash no password can match, so nobody can sign in as it.
- Everything already built keeps working with no special cases:
  - bylines say "Narrive Originals" and link to `/writers/narrive`;
  - that profile page doubles as the Originals shelf;
  - the reading page doesn't change.
- `is_official` in API responses simply means the author is the system account.

**Editing Originals.** Admins use the existing editor: the story form, the canvas and the scene panel. The one rule that changes is in `app/routers/stories.py`, where `_get_story_owned` becomes `_get_story_editable`. It lets through:
- the story's owner, as it does today;
- **or** a super admin, when the story belongs to the Narrive system account.

Admins' own stories stay separate. An admin who also writes keeps "My Stories" for their own work, and the admin area lists Originals separately. In the frontend, `WriterGate` also lets admins in, so an admin who has never become a writer can still open the editor for an Original.

**Featuring.** Two new columns, `stories.is_featured` and `featured_rank`, work for any published story, whether an Original or a writer's. They drive a "Featured" row at the top of the catalogue.

---

## 5. Bulk import

### File format (version 1)
Scenes are identified by short **keys** that the file makes up itself, never by database IDs. That makes it possible to write the file by hand, or have a script or an AI produce it. Each choice sits inside the scene it starts from.

```json
{
  "format": "narrive-story",
  "version": 1,
  "stories": [
    {
      "title": "The Lantern Keeper",
      "description": "A lighthouse, a storm, and a stranger at the door.",
      "genres": ["Mystery"],
      "moods": ["Eerie", "Mysterious"],
      "content_rating": "everyone",
      "tags": ["lighthouse", "storm"],
      "status": "draft",
      "scenes": [
        {
          "key": "start",
          "type": "start",
          "title": "The knock",
          "content": "Rain hammers the glass…",
          "choices": [
            { "text": "Open the door", "to": "stranger" },
            { "text": "Climb to the lamp", "to": "lamp" }
          ]
        },
        { "key": "stranger", "title": "…", "content": "…", "choices": [ { "text": "…", "to": "end-dawn" } ] },
        { "key": "lamp", "title": "…", "content": "…", "choices": [] },
        { "key": "end-dawn", "type": "ending", "title": "Dawn", "content": "…" }
      ]
    }
  ]
}
```

**Rules:**
- `type` defaults to `middle`, and choices keep the order they are written in.
- `position` (`{x, y}`) is optional. Scenes without one get an automatic layered layout on the server, a port of `tidyLayout`, so imported stories look tidy the first time they open in the canvas.
- Every imported story is owned by **the Narrive account**. Letting admins import into a real writer's account is left out on purpose, so content never appears under someone's name without their consent.
- `status` can be `draft` (the default) or `published`. A story marked `published` is only published if it has no blocking errors.

### Checks
The same Pydantic schemas and taxonomy validators as the normal story API, so an import can never store anything the editor wouldn't allow.

| Check | Level |
|---|---|
| Invalid JSON, wrong `format` or `version`, fields of the wrong type | error (import rejected) |
| Genres, moods and ratings not in the taxonomy; more than 5 genres or moods; tag limits | error |
| Duplicate scene keys; a choice pointing to a missing key; a choice leading back to its own scene | error |
| Not exactly one `start` scene | error |
| Size limits: file ≤ 2 MB (Vercel's request limit is 4.5 MB), ≤ 50 stories per import, ≤ 500 scenes per story, ≤ 20 choices per scene, text length limits as in the database | error |
| `published` story with no `ending` scene | error (or import it as a draft, flagged) |
| Unreachable scenes, dead ends (a middle scene with no choices), a title matching an existing Original | warning (import allowed) |

**Report format.** Every problem is reported with a JSON path, such as `stories[2].scenes[5].choices[0].to`, and a plain-language message, so it can be found in the file.

### Two steps, all or nothing
1. **Validate** (`POST /admin/imports/validate`). This writes nothing. For each story it returns the title, scene, choice and ending counts, word count, errors and warnings.
2. **Import** (`POST /admin/imports`). This runs the same checks again on the server, then creates every story, scene and choice **in one database transaction**. If any story fails, nothing is imported.

Each import also:
- records a row in the new `imports` table (`id, actor_id, story_count, created_at`);
- adds a new `stories.import_id` column, which makes "Undo this import" possible;
- writes an `import.commit` audit entry.

---

## 6. Frontend

### Routes
```
app/admin/
├── layout.tsx                AdminGate + admin shell (the writer sidebar/navbar pattern, with an admin colour and nav)
├── page.tsx                  Overview
├── users/page.tsx            Users table (search, filters, paging)
├── users/[id]/page.tsx       User detail: profile, stories, activate/deactivate, revoke writer
├── stories/page.tsx          All stories table: status, author, Original badge, featured toggle
├── stories/[id]/page.tsx     Story detail: health report, unpublish/archive/delete, export JSON, "Open in editor" (Originals)
├── originals/page.tsx        Narrive Originals grid + "New Original" + "Import stories"
├── import/page.tsx           Bulk import
└── audit/page.tsx            Audit log
```

- **Getting there:** the account menu shows an **Admin** item for super admins only. The Reading | Writing toggle stays as it is, because admin is a tool, not a reading mode.
- **Admin colour:** the admin shell uses a distinct pastel, butter/peach, so it's always obvious you're acting as an admin.
- **Code organisation:**
  - `lib/api/admin.ts` holds the API calls;
  - `hooks/use-admin.ts` holds the React Query hooks, under keys beginning with `["admin", …]`;
  - admin changes invalidate the matching `["public-stories"]` cache.
- **Charts:** plain SVG or CSS bars, to avoid a heavy charting library. If richer charts are needed later, add `recharts`.

### Import page
1. **Input:** two tabs.
   - **Upload file:** drag and drop or browse for a `.json` file, read in the browser.
   - **Paste JSON:** a monospace text box.
   - Both lead into the same flow, and each has a **Download template** button with the example above.
2. **Parse in the browser.** A JSON syntax error shows the line and column right away, without calling the server.
3. **Validate.** One card per story showing its counts, status and the lists of errors and warnings. Clicking an error highlights its path. Stories with errors are flagged red, and the Import button stays disabled until there are no errors.
4. **Import.** A confirmation dialog ("Import 12 stories as Narrive Originals?"), then a results screen with links to each new story and an **Undo import** button.

---

## 7. Database migration (one Alembic revision)

- `users.admin_role` (nullable) and `users.is_system` (default false)
- `stories.published_at`, `stories.is_featured` (default false), `stories.featured_rank` (nullable) and `stories.import_id` (nullable, foreign key to `imports`, indexed)
- new tables `admin_actions` and `imports`
- insert the Narrive system user; backfill `published_at`

---

## 8. Build order

| # | Slice | Delivers |
|---|---|---|
| 1 | Roles and access: migration, `make_admin`, `get_current_admin`, `is_admin` claim, proxy + AdminGate, sign-in check for inactive accounts, audit log helper | Your account can open an empty `/admin` |
| 2 | Overview (without the health section) + admin shell | The dashboard |
| 3 | Users: list, detail, activate/deactivate, revoke writer | User management |
| 4 | Stories: list, detail, unpublish/archive/delete, feature, export | Moderation and curation; the Featured row in the catalogue |
| 5 | Narrive Originals: system account, `_get_story_editable`, Originals page, badge | Narrive can publish its own stories |
| 6 | Bulk import: schema, checks, server-side layout, validate/commit/undo, import page | JSON upload and paste |
| 7 | Health checks + audit log page | Content quality overview and the action history |

Each slice works on its own and can be shipped separately. Slices 1–3 are about a day of work, and 5 and 6 are the largest.

## Open questions
- Import into a real writer's account: leave it out (recommended), or allow it with a warning?
- Should unpublishing a writer's story notify them? There are no notifications yet, so for now it would only appear in the audit log.
- Is a second, lower role (moderator: can unpublish but not delete or change roles) needed soon? The column already supports it.
