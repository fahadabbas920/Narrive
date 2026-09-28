"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LogOut } from "lucide-react"
import { useLogout } from "@/hooks/use-auth"

export function AuthButton() {
  const [email, setEmail] = useState<string | null>(null)
  const logout = useLogout()

  useEffect(() => {
    setEmail(localStorage.getItem("userEmail"))
  }, [])

  // Signed in — show the account + sign-out control.
  if (email) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground hidden max-w-36 truncate text-xs sm:block">
          {email}
        </span>
        <button
          onClick={logout}
          title="Sign out"
          className="text-muted-foreground hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // Default (incl. server render / pre-hydration): a real "Sign in" link.
  return (
    <Link
      href="/login"
      className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
    >
      Sign in
    </Link>
  )
}
