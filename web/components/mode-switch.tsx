"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, PenLine, ShieldCheck, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMe } from "@/hooks/use-auth"
import { useSession } from "@/lib/session"

export function useIsWriter(): boolean | undefined {
  const session = useSession()
  const { data: me } = useMe()
  if (!session) return undefined
  return me?.is_writer ?? session.isWriter
}

export function ModeSwitch({
  className,
  stretch = false,
}: {
  className?: string
  /** Fill the row with equal-width, always-labelled segments (reader header's mobile row). */
  stretch?: boolean
}) {
  const pathname = usePathname()
  const session = useSession()
  const isWriter = useIsWriter()
  const { data: me } = useMe()
  const isAdmin = !!session && !!me?.admin_role
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/")
  const writing = pathname === "/write" || pathname.startsWith("/write/")

  const writeHref = !session
    ? "/login?mode=writer&next=%2Fwrite"
    : isWriter === false
      ? "/become-a-writer"
      : "/write/stories"
  const canWrite = !session || isWriter !== false

  const segment = cn(
    "relative flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all sm:px-3.5 sm:py-1.5",
    stretch && "flex-1 justify-center",
  )
  // Icons only below sm (the label stays for screen readers), unless stretched to full width.
  const label = stretch ? "" : "sr-only sm:not-sr-only"

  return (
    <nav
      aria-label="Mode"
      className={cn(
        "bg-muted ring-border flex items-center rounded-full p-1 ring-1",
        stretch && "w-full",
        className,
      )}
    >
      <Link
        href="/"
        title="Reading"
        aria-current={!writing && !inAdmin ? "page" : undefined}
        className={cn(
          segment,
          !writing && !inAdmin
            ? "bg-card text-peach-ink shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <BookOpen className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span className={label}>Reading</span>
      </Link>
      <Link
        href={writeHref}
        title={canWrite ? "Writing" : "Become a writer"}
        aria-current={writing ? "page" : undefined}
        className={cn(
          segment,
          writing
            ? "bg-card text-lavender-ink shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {canWrite ? (
          <PenLine className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        ) : (
          <Sparkles className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        )}
        <span className={label}>{canWrite ? "Writing" : "Become a writer"}</span>
      </Link>
      {isAdmin && (
        <Link
          href="/admin"
          title="Admin"
          aria-current={inAdmin ? "page" : undefined}
          className={cn(
            segment,
            inAdmin ? "bg-butter text-butter-ink shadow-sm" : "text-butter-ink hover:bg-butter/60",
          )}
        >
          <ShieldCheck className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          <span className={label}>Admin</span>
        </Link>
      )}
    </nav>
  )
}
