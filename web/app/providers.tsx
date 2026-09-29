"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { showToast } from "@/lib/toast"
import { addRequestInterceptor, setOnUnauthorized } from "@/lib/api/api-client"
import { clearSession, getToken, useSession } from "@/lib/session"
import { ModeTransitionProvider } from "@/components/mode-transition"

const PROTECTED = /^\/(write(\/|$)|admin(\/|$)|become-a-writer|reading$|story\/[^/]+\/read)/

let interceptorRegistered = false
function registerAuthInterceptor(router: ReturnType<typeof useRouter>) {
  if (interceptorRegistered) return
  interceptorRegistered = true

  addRequestInterceptor((url, options) => {
    const token = getToken()
    if (!token) return options
    return {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    }
  })

  setOnUnauthorized(() => {
    if (!getToken()) return
    clearSession()
    const path = window.location.pathname
    if (PROTECTED.test(path)) {
      showToast.error("Session expired. Please sign in again.")
      router.push(`/login?next=${encodeURIComponent(path)}`)
    }
  })
}

/** Cached data belongs to one person, so drop it whenever the session ends: sign-out,
 *  an expired token (401) or signing out in another tab. */
function ClearCacheOnSignOut() {
  const session = useSession()
  const queryClient = useQueryClient()
  const had = useRef(false)
  useEffect(() => {
    if (had.current && !session) queryClient.clear()
    had.current = !!session
  }, [session, queryClient])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  registerAuthInterceptor(router)

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
          mutations: { retry: 0 },
        },
      }),
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <ClearCacheOnSignOut />
        <ModeTransitionProvider>{children}</ModeTransitionProvider>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
