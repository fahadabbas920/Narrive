"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@workspace/ui/components/sonner"
import { showToast } from "@workspace/ui/lib/toast"
import { addRequestInterceptor, setOnUnauthorized } from "@/lib/api"

let interceptorRegistered = false
function registerAuthInterceptor(router: ReturnType<typeof useRouter>) {
  if (interceptorRegistered) return
  interceptorRegistered = true

  // Attach the bearer token to every request when present.
  addRequestInterceptor((url, options) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return options
    return {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    }
  })

  // On a 401, clear the session and bounce to login.
  setOnUnauthorized(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("userEmail")
    document.cookie = "token=; path=/; max-age=0"
    showToast.error("Session expired. Please sign in again.")
    router.push("/login")
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  registerAuthInterceptor(router)

  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
