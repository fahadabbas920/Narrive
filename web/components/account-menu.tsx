"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookMarked,
  BookOpen,
  ChevronDown,
  LogOut,
  PenLine,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLogout, useMe } from "@/hooks/use-auth"
import { useIsWriter } from "@/components/mode-switch"
import { useSession } from "@/lib/session"

export function AccountMenu() {
  const session = useSession()
  const { data: me } = useMe()
  const isWriter = useIsWriter()
  const logout = useLogout()
  const pathname = usePathname()

  if (!session) {
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`
    return (
      <div className="flex items-center gap-1">
        <Link
          href={`/login${next}`}
          className="text-foreground hover:bg-muted hidden rounded-full px-3.5 py-2 text-sm font-semibold transition-colors sm:block"
        >
          Log in
        </Link>
        <Link
          href={`/register${next}`}
          className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    )
  }

  const name = me?.pen_name ?? session.email?.split("@")[0] ?? "You"
  const initial = name[0]?.toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="hover:bg-muted data-popup-open:bg-muted focus-visible:ring-ring/50 flex cursor-pointer items-center gap-1.5 rounded-full p-1 pr-2 transition-colors outline-none focus-visible:ring-3"
      >
        <span className="from-peach via-blush to-lavender text-lavender-ink relative flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold">
          {initial}
          {me?.admin_role && (
            <span
              title="Super admin"
              className="bg-butter text-butter-ink ring-card absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full ring-2"
            >
              <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
              <span className="sr-only">Super admin</span>
            </span>
          )}
        </span>
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="from-peach via-blush to-lavender text-lavender-ink flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br font-bold">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-bold">{name}</p>
            {session.email && (
              <p className="text-muted-foreground truncate text-xs">{session.email}</p>
            )}
          </div>
        </div>
        <div className="px-3 pb-2">
          <span
            className={
              isWriter
                ? "bg-lavender text-lavender-ink rounded-full px-2 py-0.5 text-[11px] font-bold"
                : "bg-peach text-peach-ink rounded-full px-2 py-0.5 text-[11px] font-bold"
            }
          >
            {isWriter ? "Reader · Writer" : "Reader"}
          </span>
          {me?.admin_role && (
            <span className="bg-butter text-butter-ink ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold">
              Super admin
            </span>
          )}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLinkItem render={<Link href="/" />}>
          <BookOpen />
          Browse stories
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/reading" />}>
          <BookMarked />
          My reading
        </DropdownMenuLinkItem>
        {isWriter === false ? (
          <DropdownMenuLinkItem render={<Link href="/become-a-writer" />}>
            <Sparkles />
            Become a writer
          </DropdownMenuLinkItem>
        ) : (
          <DropdownMenuLinkItem render={<Link href="/write/stories" />}>
            <PenLine />
            Writing desk
          </DropdownMenuLinkItem>
        )}
        {me?.handle && (
          <DropdownMenuLinkItem render={<Link href={`/writers/${me.handle}`} />}>
            <UserRound />
            Your public profile
          </DropdownMenuLinkItem>
        )}

        {me?.admin_role && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLinkItem render={<Link href="/admin" />}>
              <ShieldCheck />
              Admin console
            </DropdownMenuLinkItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={logout}
          className="text-destructive data-highlighted:bg-destructive/10 [&_svg]:text-destructive"
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
