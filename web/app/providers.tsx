"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { showToast } from "@/lib/toast"
import { addRequestInterceptor, setOnUnauthorized } from "@/lib/api/api-client"
import { clearSession, getToken } from "@/lib/session"
import { ModeTransitionProvider } from "@/components/mode-transition"

const PROTECTED = /^\/(write(\/|$)|admin(\/|$)|become-a-writer|story\/[^/]+\/read)/

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
        <ModeTransitionProvider>{children}</ModeTransitionProvider>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
