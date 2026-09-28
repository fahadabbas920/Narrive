"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, LayoutDashboard, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

const navItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    matchPath: (p: string) => p === "/",
  },
  {
    label: "My Stories",
    icon: BookOpen,
    href: "/stories",
    matchPath: (p: string) => p.startsWith("/stories"),
  },
]

const STORAGE_KEY = "sidebarCollapsed"
const CHANGE_EVENT = "sidebarCollapsedChange"

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}

export function Sidebar() {
  const pathname = usePathname()
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
        "bg-card border-border flex h-full shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 ease-in-out",
        collapsed ? "w-14" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "border-border flex shrink-0 items-center gap-3 border-b",
          collapsed ? "justify-center px-3 py-5" : "px-4 py-5",
        )}
      >
        <div className="bg-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm">
          <BookOpen className="text-primary-foreground h-4.5 w-4.5" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-foreground text-sm leading-tight font-semibold whitespace-nowrap">
              Narrive
            </p>
            <p className="text-primary font-mono text-[10px] tracking-widest whitespace-nowrap">
              Interactive Stories
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 space-y-1 py-4", collapsed ? "px-2" : "px-3")}>
        {navItems.map(({ label, icon: Icon, href, matchPath }) => {
          const isActive = matchPath(pathname)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm transition-all",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/15 text-primary font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
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
