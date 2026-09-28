"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { LogOut, Sun, Moon } from "lucide-react"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { useLogout } from "@/hooks/use-auth"
import { ButtonUI } from "@workspace/ui/components/button-ui"

export function Navbar() {
  const logout = useLogout()
  const { theme, setTheme } = useTheme()

  const userEmail = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem("userEmail"),
    () => null,
  )
  const initials = userEmail ? userEmail[0].toUpperCase() : "U"

  return (
    <header className="border-border bg-card flex h-16 shrink-0 items-center justify-end gap-2 border-b px-5">
      {userEmail && (
        <span className="text-muted-foreground mr-1 hidden font-mono text-xs sm:block">
          {userEmail}
        </span>
      )}
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <ButtonUI
        variant="ghost"
        size="icon-sm"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title="Toggle theme"
        className="text-muted-foreground hover:text-foreground"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </ButtonUI>
      <ButtonUI
        variant="ghost"
        size="icon-sm"
        onClick={logout}
        className="text-muted-foreground hover:text-destructive"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
      </ButtonUI>
    </header>
  )
}
