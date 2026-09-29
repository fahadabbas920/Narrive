"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookMarked } from "lucide-react"
import { useLibrary } from "@/hooks/use-reading"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

/** Header link to My reading, with a count of saved stories not yet started. */
export function MyReadingLink() {
  const session = useSession()
  const pathname = usePathname()
  const { data: library } = useLibrary()
  if (!session) return null
  const waiting = Object.values(library ?? {}).filter((e) => e.saved && !e.status).length
  const active = pathname === "/reading"
  return (
    <Link
      href="/reading"
      aria-label={waiting > 0 ? `My reading, ${waiting} saved to read later` : "My reading"}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors",
        active ? "bg-peach text-peach-ink" : "text-foreground hover:bg-muted",
      )}
    >
      <BookMarked className="h-4 w-4" />
      <span className="hidden lg:inline" aria-hidden>
        My reading
      </span>
      {waiting > 0 && (
        <span
          className="bg-primary text-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums"
          aria-hidden
        >
          {waiting}
        </span>
      )}
    </Link>
  )
}
