# Narrive — Frontend

Next.js 16 frontend for the Narrive platform. See the [root README](../README.md) for full project setup.

## Commands

```bash
pnpm dev          # dev server → http://localhost:3000
pnpm build        # production build
pnpm lint         # ESLint
pnpm format       # Prettier (write)
pnpm format:check # Prettier (check only)
```

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui (`@base-ui/react`)
- **State:** TanStack React Query v5
- **Forms:** React Hook Form + Zod
- **Story editor:** React Flow (`@xyflow/react`)
- **Toasts:** Sonner

## Key conventions

- Route protection via `proxy.ts` (Next.js 16 — replaces `middleware.ts`)
- `shadcn/ui` uses `@base-ui/react` — no `asChild`, use `render={<Link />}` instead
- Tailwind important modifier: `bg-primary!` not `!bg-primary` (v4 syntax)
- API calls go through `lib/api/` modules only, never fetched directly in components
