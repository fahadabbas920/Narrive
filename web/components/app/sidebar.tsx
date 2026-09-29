"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  FileUp,
  LayoutDashboard,
  Library,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { BrandMark } from "@/components/brand"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useMe } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  matchPath: (p: string) => boolean
}

const writerNav: NavItem[] = [
  {
    label: "My Stories",
    icon: BookOpen,
    href: "/write/stories",
    matchPath: (p: string) => p.startsWith("/write/stories") && p !== "/write/stories/new",
  },
  {
    label: "New Story",
    icon: Plus,
    href: "/write/stories/new",
    matchPath: (p: string) => p === "/write/stories/new",
  },
  {
    label: "Profile",
    icon: UserRound,
    href: "/write/profile",
    matchPath: (p: string) => p === "/write/profile",
  },
]

const adminNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/admin", matchPath: (p) => p === "/admin" },
  {
    label: "Users",
    icon: Users,
    href: "/admin/users",
    matchPath: (p) => p.startsWith("/admin/users"),
  },
  {
    label: "Stories",
    icon: Library,
    href: "/admin/stories",
    matchPath: (p) => p.startsWith("/admin/stories"),
  },
  {
    label: "Originals",
    icon: Sparkles,
    href: "/admin/originals",
    matchPath: (p) => p.startsWith("/admin/originals"),
  },
  {
    label: "Import",
    icon: FileUp,
    href: "/admin/import",
    matchPath: (p) => p.startsWith("/admin/import"),
  },
  {
    label: "Audit log",
    icon: ScrollText,
    href: "/admin/audit",
    matchPath: (p) => p.startsWith("/admin/audit"),
  },
]

export type ShellVariant = "writer" | "admin"

/** Writer mode is lavender; admin is butter, so it's always obvious you're acting as an admin. */
const SHELLS = {
  writer: {
    home: "/write/stories",
    subtitle: "Writing desk",
    subtitleClass: "text-lavender-ink",
    activeClass: "bg-lavender text-lavender-ink",
    nav: writerNav,
  },
  admin: {
    home: "/admin",
    subtitle: "Admin console",
    subtitleClass: "text-butter-ink",
    activeClass: "bg-butter text-butter-ink",
    nav: adminNav,
  },
} satisfies Record<ShellVariant, unknown>

const STORAGE_KEY = "sidebarCollapsed"
const CHANGE_EVENT = "sidebarCollapsedChange"

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}

function SidebarBrand({
  collapsed = false,
  variant,
}: {
  collapsed?: boolean
  variant: ShellVariant
}) {
  const shell = SHELLS[variant]
  return (
    <Link
      href={shell.home}
      className={cn(
        "border-border flex h-16 shrink-0 items-center gap-3 border-b",
        collapsed ? "justify-center px-3" : "px-4",
      )}
    >
      <BrandMark className="h-8 w-8" />
      {!collapsed && (
        <div className="overflow-hidden">
          <p className="text-foreground text-sm leading-tight font-bold whitespace-nowrap">
            Narrive
          </p>
          <p
            className={cn(
              "font-mono text-[10px] tracking-widest whitespace-nowrap uppercase",
              shell.subtitleClass,
            )}
          >
            {shell.subtitle}
          </p>
        </div>
      )}
    </Link>
  )
}

function SidebarNav({
  collapsed = false,
  onNavigate,
  variant,
}: {
  collapsed?: boolean
  onNavigate?: () => void
  variant: ShellVariant
}) {
  const pathname = usePathname()
  const shell = SHELLS[variant]
  const { data: me } = useMe()
  // Only writer-admins see this shell; admins without a writer profile are sent to /admin.
  const items: NavItem[] =
    variant === "writer" && me?.admin_role
      ? [
          ...shell.nav,
          { label: "Admin console", icon: ShieldCheck, href: "/admin", matchPath: () => false },
        ]
      : shell.nav
  return (
    <nav className={cn("flex-1 space-y-1 py-4", collapsed ? "px-2" : "px-3")}>
      {items.map(({ label, icon: Icon, href, matchPath }) => {
        const isActive = matchPath(pathname)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center rounded-xl text-sm transition-all",
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
              isActive
                ? cn(shell.activeClass, "font-semibold shadow-sm")
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

/** Desktop (lg+) sidebar — collapsible, sits beside the content. */
export function Sidebar({ variant = "writer" }: { variant?: ShellVariant }) {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY) === "true",
    () => false,
  )

  function toggleCollapse() {
    localStorage.setItem(STORAGE_KEY, String(!collapsed))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  return (
    <aside
      className={cn(
        "bg-card border-border hidden h-full shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <SidebarBrand collapsed={collapsed} variant={variant} />
      <SidebarNav collapsed={collapsed} variant={variant} />

      <div
        className={cn(
          "border-border border-t py-3",
          collapsed ? "flex justify-center px-2" : "px-3",
        )}
      >
        <button
          onClick={toggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="text-muted-foreground hover:text-primary hover:bg-primary/10 flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-xs transition-all"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

/** Below lg: a menu button that opens the sidebar as a drawer over the page. */
export function MobileSidebar({ variant = "writer" }: { variant?: ShellVariant }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="bg-card w-[85%] max-w-xs gap-0 p-0 shadow-2xl sm:max-w-xs"
        >
          <SheetTitle className="sr-only">{SHELLS[variant].subtitle} menu</SheetTitle>
          <SidebarBrand variant={variant} />
          <SidebarNav variant={variant} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
