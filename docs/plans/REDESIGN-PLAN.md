# Narrive Redesign Plan: Account Modes, Single App, Pastel UI

**Status:** Built 2026-09-28. The frontend was then also flattened from a Turborepo monorepo into one plain Next.js app at `web/`, and the shared UI package now lives in `web/components/ui`. [CLAUDE.md](../../CLAUDE.md) describes the current code; this file keeps the original reasoning.

**Differences from the plan as built**
- Final palette: cream background, `#6a57b8` primary. Chosen by contrast checks instead of a preview page, and easy to retune in `web/app/globals.css`.
- The login card has no "Remember me" or "Forgot?" row, because neither feature exists yet. The password field has a show/hide toggle instead of a static key icon.
- `/write` has no separate dashboard. It redirects to `/write/stories`, which shows a welcome banner after onboarding.

---

## 1. Why

- Today there is one `users` table with no idea of "reader" vs "writer". Anyone who signs up can use both apps, and nothing tells the two roles apart.
- Writer (`:3000`) and reader (`:3001`) are separate Next.js apps on separate origins. `localStorage` is per-origin, so moving between them means logging in twice.
- The current "Jade pebble" green palette is being replaced with a pastel look.

**Target experience**
- Someone who signs up as a writer can switch freely between reading and writing.
- Someone who signs up as a reader can click "Become a writer". They see a welcome, an overview of what writers get, a profile step, and a confirm checkbox, then continue as a writer.

## 2. Build order

1. Pastel theme
2. Merge into one Next.js app
3. Writer capability (backend) + become-a-writer onboarding
4. Mode toggle + new login/register screens

Each step can ship on its own.

---

## 3. Single Next.js app

**Why:** one origin means one session and one login page. Switching modes becomes a normal page navigation, with no token handoff between apps.

**Mode comes from the URL:** `/write/*` is writer mode, everything else is reader mode.

```
web/app/
├── (auth)/login, register     one auth screen with Reader | Writer toggle
├── (reader)/                  public: /, /story/[id]   gated: /story/[id]/read
├── (writer)/write/            /write (dashboard), /write/stories, /write/stories/new,
│                              /write/stories/[id], /write/stories/[id]/edit
└── become-a-writer/           4-step onboarding
```

**Migration steps**
1. Start from `apps/writer` (the larger app) and move its dashboard routes under `(writer)/write/`.
2. Copy the reader routes into `(reader)/`.
3. Merge `lib/api`: writer's `stories.ts` and `scenes.ts`, reader's `public.ts`, and one shared `api-client`/`auth`.
4. Keep one copy each of `hooks/use-auth.ts` (with the reader's safe `next` redirect), `providers.tsx`, and `proxy.ts`.
5. Load React Flow and its CSS only in the `(writer)` layout, so reader pages stay light.
6. Delete `apps/reader`, remove `:3001` from `BACKEND_CORS_ORIGINS`, and update `CLAUDE.md`.
7. (Added later) Flatten `web/`: drop Turborepo, the pnpm workspace and `@workspace/ui`, and move primitives into `components/ui`.

Shared primitives live in `components/ui/`; the theme lives in `app/globals.css`.

**Route protection (`proxy.ts`)**
- `/story/:id/read`: needs a token. Without one, redirect to `/login?next=…`.
- `/write/*`: needs a token **and** `is_writer`. Non-writers go to `/become-a-writer`.
- `/login`, `/register`: signed-in users are redirected away.

**Tradeoff:** the reader and writer can no longer be deployed or scaled separately. That doesn't matter at this stage.

---

## 4. Account model: one account, writing is unlocked

**Database (`users` table)**

| New field | Type | Notes |
|---|---|---|
| `is_writer` | bool | default `false` |
| `pen_name` | str, nullable | public author name |
| `bio` | text, nullable | short author bio |
| `genres` | JSON list | genres they write |
| `writer_since` | datetime, nullable | set on becoming a writer |

The Alembic migration backfills `is_writer = true` for users who already own stories.

**API**
- `GET /api/v1/auth/me` returns the user, including `is_writer` and the profile.
- `POST /api/v1/users/me/become-writer` takes `{ pen_name, bio, genres, accepted_terms }` and returns a fresh token.
- Every `/stories` endpoint returns **403** for non-writers. The backend is the source of truth.
- The JWT carries an `is_writer` claim so `proxy.ts` can route without an API call. A new token is issued after become-writer.

---

## 5. Mode toggle

- A "Reading | Writing" pill in the header, next to the avatar.
- For writers, it switches between `/` and `/write`.
- For non-writers, the Writing side reads "Become a writer ✦" and opens onboarding.

---

## 6. Become-a-writer onboarding (`/become-a-writer`)

This is a full page with a step indicator, not a modal.

1. **Welcome.** Warm hero: "Every story starts with a choice."
2. **What you get.** Three cards: visual branching editor, publish to readers, analytics (coming soon).
3. **Writer profile.** Pen name, bio, genres (reuses `badge-picker`).
4. **Confirm.** A checkbox for "I agree to the community guidelines and understand published stories are public", then **Continue**. The user lands on `/write` with a "Create your first story" empty state.

**Writer signup:** register → profile step → `/write`. Writers get reader mode automatically.

---

## 7. Login / register design

Based on a reference screenshot of a split "practitioner vs organisation" portal login.

**Layout: three zones**

- **Left hero panel** (full-height gradient)
  - icon badge
  - mono uppercase eyebrow, e.g. `FOR READERS`
  - large "Welcome back" heading and one line of supporting copy
  - status pill: "● You're in reader mode"
- **Centre floating card** (white, large radius, soft shadow)
  - logo and wordmark
  - "Log in" title, with a subtitle naming the mode ("Reader account" or "Writer account")
  - soft filled inputs with trailing icons (mail, key)
  - "Remember me" checkbox and a "Forgot?" link on one row
  - full-width gradient pill button with an arrow in a circle
  - "New here? Create account" link
- **Right side panel** (narrower, contrasting pastel)
  - "Here to write stories?" with a CTA button

**Differences from the reference**
- The right panel is the **mode toggle**, not a link to a different site. Clicking it swaps the panel colours and copy with an animation.
- It's the same account in both modes. Only the post-login destination changes (`/` or `/write`).
- In writer mode, a non-writer logging in lands on `/become-a-writer`.
- Reader mode uses a peach → blush gradient. Writer mode uses lavender → sky.
- On mobile, the side panels collapse into a compact mode switch above the card.

---

## 8. Pastel theme

Tokens live in `web/app/globals.css` and replace "Jade pebble". Changing them updates the whole app.

- **Light:** cream background, soft lavender primary, with peach, mint, sky and blush accents.
- **Dark:** deep plum background with pastel highlights.
- **Editor:** start scene = mint, ending scene = blush.
- **Accessibility rule:** pastel fills take **dark** text, never white. Text, links and focus rings use deeper shades of the same colours so they pass WCAG AA.
- **Pairs:** each hue has a fill and an `*-ink` text colour (`bg-mint text-mint-ink`). Every pair passes WCAG AA in light and dark.

---

## 9. Follow-ups

- Password reset and "Remember me" on the login card.
- A public author page built from `pen_name`, `bio` and `genres`.
- Reader insights (currently marked "Soon" in onboarding).
