"use client"

import Link from "next/link"
import type { AdminStory } from "@/lib/api/admin"
import {
  DataTable,
  FeaturedBadge,
  OriginalBadge,
  StatusBadge,
  td,
  th,
} from "@/components/admin/admin-ui"
import { storyTone } from "@/lib/story-tone"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"

export function StoryTable({
  stories,
  showAuthor = true,
  actions,
  hrefFor = (s) => `/admin/stories/${s.id}`,
}: {
  stories: AdminStory[]
  showAuthor?: boolean
  actions?: (story: AdminStory) => React.ReactNode
  /** Where a row's title links (defaults to the moderation page). */
  hrefFor?: (story: AdminStory) => string
}) {
  return (
    <DataTable>
      <thead>
        <tr>
          <th className={th}>Story</th>
          <th className={th}>Status</th>
          <th className={`${th} text-right`}>Scenes</th>
          <th className={th}>Updated</th>
          {actions && (
            <th className={th}>
              <span className="sr-only">Actions</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {stories.map((s) => (
          <tr key={s.id} className="hover:bg-muted/50 transition-colors">
            <td className={td}>
              <Link href={hrefFor(s)} className="group flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn("h-9 w-9 shrink-0 rounded-xl bg-linear-to-br", storyTone(s.id))}
                />
                <span className="min-w-0">
                  <span className="text-foreground group-hover:text-primary block max-w-xs truncate font-semibold">
                    {s.title}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {showAuthor && (s.author_name ?? "Unknown author")}
                    {showAuthor && s.genres.length > 0 && " · "}
                    {s.genres.slice(0, 2).join(", ")}
                  </span>
                </span>
              </Link>
            </td>
            <td className={td}>
              <span className="flex flex-wrap gap-1">
                <StatusBadge status={s.status} />
                {s.is_official && <OriginalBadge />}
                {s.is_featured && <FeaturedBadge rank={s.featured_rank} />}
              </span>
            </td>
            <td className={`${td} text-right tabular-nums`}>{s.scene_count}</td>
            <td className={`${td} text-muted-foreground whitespace-nowrap`}>
              {timeAgo(s.updated_at)}
            </td>
            {actions && <td className={`${td} text-right whitespace-nowrap`}>{actions(s)}</td>}
          </tr>
        ))}
      </tbody>
    </DataTable>
  )
}
