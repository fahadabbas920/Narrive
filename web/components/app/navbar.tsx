"use client"

import Link from "next/link"
import { AccountMenu } from "@/components/account-menu"
import { BrandMark } from "@/components/brand"
import { ModeSwitch } from "@/components/mode-switch"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileSidebar, type ShellVariant } from "@/components/app/sidebar"

export function Navbar({ variant = "writer" }: { variant?: ShellVariant }) {
  const admin = variant === "admin"
  return (
    <header className="border-border bg-card flex h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-5">
      <div className="mr-auto flex items-center gap-2 lg:hidden">
        <MobileSidebar variant={variant} />
        <Link
          href={admin ? "/admin" : "/write/stories"}
          aria-label={admin ? "Admin console" : "Writing desk"}
          className="hidden sm:block"
        >
          <BrandMark className="h-8 w-8" />
        </Link>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 lg:ml-auto">
        <ModeSwitch />
        <div className="bg-border mx-1 hidden h-6 w-px md:block" />
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  )
}
