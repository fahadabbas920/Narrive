"use client"

import Link from "next/link"
import { Eye, GitBranch, LayoutDashboard, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Story } from "@/lib/api/stories"
import { cn } from "@/lib/utils"

export function StoryActionsMenu({
  story,
  onDelete,
  showOverview = true,
  triggerClassName,
}: {
  story: Story
  onDelete: () => void
  showOverview?: boolean
  triggerClassName?: string
}) {
  const base = `/write/stories/${story.id}`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${story.title}`}
        className={cn(
          "text-muted-foreground hover:text-foreground hover:bg-muted data-popup-open:bg-muted focus-visible:ring-ring/50 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-3",
          triggerClassName,
        )}
      >
        <MoreHorizontal className="h-4.5 w-4.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-52">
        {showOverview && (
          <DropdownMenuLinkItem render={<Link href={base} />}>
            <LayoutDashboard />
            Overview
          </DropdownMenuLinkItem>
        )}
        <DropdownMenuLinkItem render={<Link href={`${base}/canvas`} />}>
          <GitBranch />
          Open canvas
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href={`${base}/edit`} />}>
          <Pencil />
          Edit details
        </DropdownMenuLinkItem>
        {story.status === "published" && (
          <DropdownMenuLinkItem render={<Link href={`/story/${story.id}`} />}>
            <Eye />
            View as reader
          </DropdownMenuLinkItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive data-highlighted:bg-destructive/10 [&_svg]:text-destructive"
        >
          <Trash2 />
          Delete story
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
