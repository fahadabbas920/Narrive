"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api/auth"
import { showToast } from "@workspace/ui/lib/toast"
import type { LoginFormData, RegisterFormData } from "@/lib/schemas/auth"

/** Returns a safe in-app path to redirect to, or "/" if `next` is missing/external. */
function safeNext(next?: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next
  return "/"
}

export function useSignIn(next?: string | null) {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: LoginFormData) => authApi.signin(data.email, data.password),
    onSuccess: (token, variables) => {
      localStorage.setItem("token", token.access_token)
      localStorage.setItem("userEmail", variables.email)
      document.cookie = `token=${token.access_token}; path=/; max-age=2592000; SameSite=Lax`
      showToast.success("Signed in successfully")
      router.push(safeNext(next))
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Invalid email or password")
    },
  })
}

export function useSignUp(next?: string | null) {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: RegisterFormData) => authApi.signup(data.email, data.password),
    onSuccess: () => {
      showToast.success("Account created! Please sign in.")
      const query = next ? `?next=${encodeURIComponent(next)}` : ""
      router.push(`/login${query}`)
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Registration failed. Please try again.")
    },
  })
}

export function useLogout() {
  const router = useRouter()

  return function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("userEmail")
    document.cookie = "token=; path=/; max-age=0"
    showToast.success("Signed out")
    router.push("/")
    router.refresh()
  }
}
