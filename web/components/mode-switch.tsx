"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, PenLine, ShieldCheck, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMe } from "@/hooks/use-auth"
import { useSession } from "@/lib/session"
import { useModeTransition, type AppMode } from "@/components/mode-transition"

export function useIsWriter(): boolean | undefined {
  const session = useSession()
  const { data: me } = useMe()
  if (!session) return undefined
  return me?.is_writer ?? session.isWriter
}

export function ModeSwitch({ className }: { className?: string }) {
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
      : "/write"
  const canWrite = !session || isWriter !== false
  const switchMode = useModeTransition()

  function onSwitch(e: React.MouseEvent<HTMLAnchorElement>, href: string, target: AppMode) {
    const alreadyThere = !inAdmin && (target === "writer") === writing
    if (alreadyThere || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    switchMode(href, target)
  }

  const segment =
    "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"

  return (
    <nav
      aria-label="Mode"
      className={cn("bg-muted ring-border flex items-center rounded-full p-1 ring-1", className)}
    >
      <Link
        href="/"
        onClick={(e) => onSwitch(e, "/", "reader")}
        aria-current={!writing && !inAdmin ? "page" : undefined}
        className={cn(
          segment,
          !writing && !inAdmin
            ? "bg-card text-peach-ink shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <BookOpen className="h-3.5 w-3.5" />
        Reading
      </Link>
      <Link
        href={writeHref}
        onClick={(e) => onSwitch(e, writeHref, "writer")}
        aria-current={writing ? "page" : undefined}
        className={cn(
          segment,
          writing
            ? "bg-card text-lavender-ink shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {canWrite ? <PenLine className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        {canWrite ? "Writing" : "Become a writer"}
      </Link>
      {isAdmin && (
        <Link
          href="/admin"
          aria-current={inAdmin ? "page" : undefined}
          className={cn(
            segment,
            inAdmin ? "bg-butter text-butter-ink shadow-sm" : "text-butter-ink hover:bg-butter/60",
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin
        </Link>
      )}
    </nav>
  )
}
